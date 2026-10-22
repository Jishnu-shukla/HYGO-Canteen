import { refreshAuthApi } from "@/data/Auth/api";
import {
    clearAuthSession,
    getAuthSession,
    updateStoredTokens,
} from "@/utils/authSession";

/**
 * Wraps `window.fetch` so every backend request carries the signed-in user's
 * access token, and so an expired token is refreshed transparently.
 *
 * The flow, for a request that hits the canteen backend (`/api/...`):
 *   1. Attach `Authorization: Bearer <accessToken>` from the stored session.
 *   2. If the response is 401, the access token has likely expired. Exchange
 *      the stored refresh token via the auth service's POST /auth/refresh.
 *   3. Persist the new token pair and replay the original request once, now
 *      with the fresh access token. The caller never sees the 401.
 *
 * Guards that keep this safe:
 *   - Only canteen-backend requests (`/api/...`) are touched. The auth
 *     service's own `/auth/login` and `/auth/refresh` live on a different base
 *     URL and carry no `/api/` segment, so they never recurse.
 *   - A single-flight lock shares one refresh across concurrent 401s, so a
 *     screen firing five requests at once makes one refresh call, not five.
 *   - A request is retried at most once. If the replay also 401s, the refresh
 *     token itself is dead: the session is cleared so AuthGate sends the user
 *     to /login, and the 401 is returned to the caller.
 *
 * Installed from `instrumentation-client.ts`, before React hydration, alongside
 * the API error-toast interceptor. Both wrap fetch and compose cleanly: each
 * captures the other's version as "original" and they nest.
 */

const INSTALL_KEY = "__canteenAuthFetchInstalled__";

/** Refresh is single-flight; concurrent waiters share this promise. */
let refreshInFlight: Promise<{ accessToken: string; refreshToken: string } | null> | null =
    null;

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

/** Runs the refresh once, sharing the result across concurrent 401 handlers. */
function refreshTokens(): Promise<{
    accessToken: string;
    refreshToken: string;
} | null> {
    if (refreshInFlight) return refreshInFlight;

    const session = getAuthSession();

    if (!session?.refreshToken) {
        return Promise.resolve(null);
    }

    refreshInFlight = refreshAuthApi(session.refreshToken)
        .then((tokens) => {
            if (tokens) updateStoredTokens(tokens);
            return tokens;
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
 * Issues the request, transparently refreshing and retrying once on a 401.
 *
 * `retried` marks the single replay so an expired-or-rejected refresh token
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
    const request = session?.accessToken
        ? withAuthHeader(input, init, session.accessToken)
        : { input, init: init ?? {} };

    const response = await originalFetch(request.input, request.init);

    if (response.status !== 401 || !allowRetry) {
        return response;
    }

    const tokens = await refreshTokens();

    if (!tokens) {
        // Refresh failed: the refresh token is expired or revoked. End the
        // session so the user re-authenticates instead of facing a wall of 401s.
        forceSignIn();
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
