import { refreshAuthApi } from "@/data/Auth/api";
import {
    clearAuthSession,
    getAuthSession,
    updateStoredTokens,
} from "@/utils/authSession";

/**
 * Wraps `window.fetch` so every backend request carries the signed-in user's
 * access token, and so an expiring token is refreshed transparently.
 *
 * The flow, for a request that hits the canteen backend (`/api/...`):
 *   1. Read the stored session. If the access token is at or past its `exp`
 *      claim, exchange the refresh token via POST /auth/refresh first, then
 *      send the request with the new pair.
 *   2. Attach `Authorization: Bearer <accessToken>`.
 *   3. If the response is still 401 and no refresh has happened yet, refresh
 *      once more and replay the original request. The caller never sees the
 *      401.
 *
 * Refreshing on the token's own `exp` rather than only on a 401 means the
 * first request after an expiry does not have to fail and be replayed, and a
 * screen opened after a long idle period sends a live token immediately. The
 * 401 path remains the fallback for opaque tokens (no readable `exp`) and for
 * a server that rejects a token before its `exp` (clock skew, revocation).
 *
 * Guards that keep this safe:
 *   - Only canteen-backend requests (`/api/...`) are touched. The auth
 *     service's own `/auth/login` and `/auth/refresh` live on a different base
 *     URL and carry no `/api/` segment, so they never recurse.
 *   - A single-flight lock shares one refresh across concurrent requests, so a
 *     screen firing five requests at once makes one refresh call, not five.
 *   - A request is retried at most once. If the replay also 401s, the refresh
 *     token itself is dead: the session is cleared so AuthGate sends the user
 *     to /login, and the 401 is returned to the caller.
 *   - An unreachable auth service does not sign the user out. A dropped
 *     connection is not proof that the refresh token is invalid.
 *
 * Installed from `instrumentation-client.ts`, before React hydration, alongside
 * the API error-toast interceptor. Both wrap fetch and compose cleanly: each
 * captures the other's version as "original" and they nest.
 */

const INSTALL_KEY = "__canteenAuthFetchInstalled__";

/**
 * Refresh this long before the token's `exp` rather than exactly at it, so a
 * request that takes a few seconds to reach the server cannot arrive with a
 * token that expired in flight.
 */
const REFRESH_LEEWAY_MS = 60_000;

type StoredTokens = { accessToken: string; refreshToken: string };

/**
 * Why a refresh finished the way it did.
 *
 * `unreachable` and `rejected` are kept apart because only the second one
 * means the session is over. A network blip must not log the user out.
 */
type RefreshOutcome =
    | { status: "refreshed"; tokens: StoredTokens }
    | { status: "rejected" }
    | { status: "unreachable" };

/** Refresh is single-flight; concurrent waiters share this promise. */
let refreshInFlight: Promise<RefreshOutcome> | null = null;

/** Resolves a fetch input to a URL string, or "" when it cannot be read. */
function resolveUrl(input: RequestInfo | URL): string {
    try {
        if (typeof input === "string") return input;
        if (input instanceof URL) return input.href;
        if (typeof Request !== "undefined" && input instanceof Request) {
            return input.url;
        }
    } catch {
        // Fall through to the empty string below.
    }

    return "";
}

/**
 * True for requests addressed to the canteen backend — the surface that needs
 * a bearer token. Auth-service calls (`/auth/...`, no `/api/`) are excluded so
 * login and refresh never carry a stale token or trigger a nested refresh.
 */
function isBackendRequest(url: string): boolean {
    return url.includes("/api/");
}

/**
 * Reads the `exp` claim (milliseconds) from a JWT, or null when the token is
 * not a decodable JWT. This is a scheduling hint only — it is deliberately not
 * a verification, because the token's signature is the server's business and
 * the refresh service is the one that decides whether it may be renewed.
 */
function getTokenExpiryMs(token: string): number | null {
    try {
        const payload = token.split(".")[1];
        if (!payload) return null;

        const base64 = payload
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(Math.ceil(payload.length / 4) * 4, "=");

        const claims = JSON.parse(atob(base64)) as { exp?: unknown };

        return typeof claims.exp === "number" ? claims.exp * 1000 : null;
    } catch {
        return null;
    }
}

/** Whether the access token is inside the refresh window (or already past it). */
function shouldRefresh(token: string): boolean {
    const expiresAt = getTokenExpiryMs(token);

    return expiresAt !== null && expiresAt - Date.now() <= REFRESH_LEEWAY_MS;
}

/** Rebuilds the request with an Authorization header, preserving its options. */
function withAuthHeader(
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    accessToken: string
): { input: RequestInfo | URL; init: RequestInit } {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);

    return { input, init: { ...init, headers } };
}

/** Runs the refresh once, sharing the result across concurrent requests. */
function refreshTokens(): Promise<RefreshOutcome> {
    if (refreshInFlight) return refreshInFlight;

    const session = getAuthSession();

    if (!session?.refreshToken) {
        return Promise.resolve({ status: "rejected" });
    }

    refreshInFlight = refreshAuthApi(session.refreshToken)
        .then((result): RefreshOutcome => {
            if (!result.ok) return { status: result.reason };

            updateStoredTokens(result.tokens);

            return { status: "refreshed", tokens: result.tokens };
        })
        .finally(() => {
            refreshInFlight = null;
        });

    return refreshInFlight;
}

/**
 * Signs the user out after a failed refresh. Uses a full navigation rather
 * than the Next router because this module runs outside React, and clears the
 * session first so AuthGate on /login does not bounce straight back.
 */
function forceSignIn(): void {
    clearAuthSession();

    // `location.replace` keeps the failed page out of the back-history, so the
    // back button cannot replay a screen the user is no longer signed in for.
    window.location.replace("/login");
}

/**
 * Issues the request, refreshing before it when the access token is expiring
 * and once more if the response is a 401.
 *
 * `allowRetry` marks the single replay so an expired-or-rejected refresh token
 * cannot loop. It is deliberately not part of the public surface.
 */
async function fetchWithAuth(
    originalFetch: typeof fetch,
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    allowRetry: boolean
): Promise<Response> {
    const url = resolveUrl(input);

    // Not a backend call (auth service, Next internals, external) — pass
    // through untouched, preserving this wrapper's position in the chain.
    if (!isBackendRequest(url)) {
        return originalFetch(input, init);
    }

    const session = getAuthSession();
    let accessToken = session?.accessToken ?? "";

    // The token is about to expire: swap it before sending. Concurrent
    // requests share the same in-flight refresh. `refreshed` tracks an actual
    // success, not an attempt, so a failed unreachable refresh still leaves
    // the 401 fallback below available.
    let refreshed = false;

    if (accessToken !== "" && shouldRefresh(accessToken)) {
        const outcome = await refreshTokens();

        if (outcome.status === "refreshed") {
            accessToken = outcome.tokens.accessToken;
            refreshed = true;
        } else if (outcome.status === "rejected") {
            forceSignIn();
            return new Response(null, {
                status: 401,
                statusText: "Session expired",
            });
        }
    }

    const request = accessToken
        ? withAuthHeader(input, init, accessToken)
        : { input, init: init ?? {} };

    const response = await originalFetch(request.input, request.init);

    // A refresh that just succeeded rules out another one: the server refused a
    // freshly minted token, which refreshing again cannot fix.
    if (refreshed || response.status !== 401 || !allowRetry) {
        return response;
    }

    const outcome = await refreshTokens();

    if (outcome.status === "rejected") {
        // Refresh token expired or revoked: end the session so the user
        // re-authenticates instead of facing a wall of 401s.
        forceSignIn();
        return response;
    }

    if (outcome.status === "unreachable") {
        // Keep the session; the caller gets the original 401 and can retry.
        return response;
    }

    // Replay once with the fresh access token.
    return fetchWithAuth(originalFetch, input, init, false);
}

/**
 * Installs the auth fetch interceptor. Idempotent, so `instrumentation-client`
 * (early) and a defensive fallback can both call it without stacking wrappers.
 */
export function installAuthFetch(): void {
    if (typeof window === "undefined") return;

    const host = window as unknown as Record<string, boolean | undefined>;

    if (host[INSTALL_KEY]) return;

    host[INSTALL_KEY] = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
        fetchWithAuth(originalFetch, input, init, true);
}
