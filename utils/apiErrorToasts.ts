import { showErrorToast } from "./toast";

/**
 * Wraps `window.fetch` so every failed backend request raises a toast. This is
 * what makes error handling global: call sites keep returning `null` or throwing
 * exactly as before, and the user still sees why the request failed.
 *
 * Only requests whose URL contains "/api/" are covered — that is the whole
 * backend surface, and scoping to it keeps Next.js's own router/RSC traffic out
 * of the toasts. A failed request is either a non-2xx response or a rejected
 * fetch (network / CORS failure); both surface, except deliberate aborts.
 */

const INSTALL_KEY = "__canteenApiErrorToastsInstalled__";

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

function isApiRequest(url: string): boolean {
    return url.includes("/api/");
}

/** Pulls a displayable message out of a parsed error body, if it has one. */
function extractMessage(parsed: unknown): string | null {
    if (!parsed || typeof parsed !== "object") return null;

    const record = parsed as { message?: unknown; error?: unknown };

    if (typeof record.message === "string" && record.message.trim()) {
        return record.message;
    }

    // Nest-style validation errors arrive as an array of messages.
    if (Array.isArray(record.message)) {
        const joined = record.message
            .filter((entry): entry is string => typeof entry === "string")
            .join(", ");

        if (joined) return joined;
    }

    if (typeof record.error === "string" && record.error.trim()) {
        return record.error;
    }

    return null;
}

/**
 * Reads the failure message from a clone, never the real response, so the
 * calling API function can still parse the body afterwards. A clone tees the
 * stream rather than consuming it.
 */
async function readErrorMessage(response: Response): Promise<string | null> {
    try {
        const text = await response.clone().text();

        if (!text) return null;

        try {
            return extractMessage(JSON.parse(text));
        } catch {
            // Non-JSON body (HTML error page, plain text) — surface it only when
            // it is short enough to be a message rather than a whole document.
            return text.length <= 300 ? text.trim() || null : null;
        }
    } catch {
        return null;
    }
}

/** Raises a toast without ever letting a toast failure break the request. */
function notify(message: string): void {
    try {
        showErrorToast(message);
    } catch {
        // Swallow: an API result must not change because the UI could not render.
    }
}

/**
 * Installs the fetch interceptor. Idempotent, so both `instrumentation-client`
 * (early, before hydration) and the toast provider (defensive fallback) can call
 * it without stacking wrappers.
 */
export function installApiErrorToasts(): void {
    if (typeof window === "undefined") return;

    const host = window as unknown as Record<string, boolean | undefined>;

    if (host[INSTALL_KEY]) return;

    host[INSTALL_KEY] = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
        const isApi = isApiRequest(resolveUrl(input));

        try {
            const response = await originalFetch(input, init);

            if (isApi && !response.ok) {
                const detail = await readErrorMessage(response);

                notify(
                    detail ??
                        `Request failed with status ${response.status} ${response.statusText}.`
                );
            }

            return response;
        } catch (error) {
            const aborted =
                typeof error === "object" &&
                error !== null &&
                "name" in error &&
                (error as { name?: unknown }).name === "AbortError";

            if (isApi && !aborted) {
                notify("Network error — could not reach the server.");
            }

            throw error;
        }
    };
}
