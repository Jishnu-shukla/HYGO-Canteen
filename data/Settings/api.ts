import { API_BASE_URL } from "@/data/apiBaseUrl";
import { withoutErrorToasts } from "@/utils/apiErrorToasts";
import type {
    ApiResponse,
    GetRbacPermissionsResponse,
    RbacPermissionsPatch,
    ResetRbacPermissionsResponse,
    UpdateRbacPermissionsResponse,
} from "@/data/Settings/type";

/**
 * The canteen backend's access-control routes.
 *
 *   GET  /rbac/permissions         the whole board: defaults, live, overrides
 *   PUT  /rbac/permissions         merge cells into the stored overrides
 *   POST /rbac/permissions/reset   drop every override
 *
 * All three are Admin-only on the backend. A role that was granted the Settings
 * screen can reach the screen but is refused here, which is why the failure
 * carries the HTTP status: the screen has to tell "this role may not" apart
 * from "the service is down".
 *
 * The signed-in admin's token rides along on every call — the global fetch
 * interceptor in `utils/authFetchInterceptor.ts` attaches it to anything under
 * `/api/`, and refreshes it when it has expired.
 */

const BASE_URL = `${API_BASE_URL}/rbac`;

/**
 * Outcome of a settings call.
 *
 * Settings failures are shown, not swallowed: the admin needs to know whether
 * the matrix they are looking at is live or the built-in fallback, so every
 * call returns a message the screen can put in front of them.
 */
export type SettingsResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; status?: number };

/**
 * Reads the backend's own message out of a failed response.
 *
 * The canteen routes answer errors as { statusCode, message, success } with
 * `message` carrying the reason; a body that is not JSON still has to produce a
 * sentence the admin can act on, so the status becomes the fallback.
 */
function readErrorMessage(text: string, status: number): string {
    try {
        const parsed = JSON.parse(text) as { message?: unknown };

        if (typeof parsed.message === "string" && parsed.message !== "") {
            return parsed.message;
        }
    } catch {
        // Not JSON — the status fallback below carries the error.
    }

    if (status === 403) {
        return "This role is not allowed to read or change access control.";
    }

    return `Request failed with status ${status}.`;
}

/**
 * One request, unwrapped from the standard envelope.
 *
 * A response that is not the envelope is a failure too: the screen would rather
 * say it could not read the answer than draw a matrix from a shape it guessed.
 */
async function request<T>(
    path: string,
    init?: RequestInit
): Promise<SettingsResult<T>> {
    try {
        const response = await fetch(`${BASE_URL}${path}`, init);
        const text = await response.text();

        if (!response.ok) {
            return {
                ok: false,
                status: response.status,
                error: readErrorMessage(text, response.status),
            };
        }

        let json: ApiResponse<T>;

        try {
            json = JSON.parse(text) as ApiResponse<T>;
        } catch {
            return {
                ok: false,
                status: response.status,
                error: "The access-control API returned a response we could not read.",
            };
        }

        if (!json || typeof json !== "object" || !("data" in json)) {
            return {
                ok: false,
                status: response.status,
                error: "The access-control API answered without the usual envelope.",
            };
        }

        return { ok: true, data: json.data };
    } catch {
        return {
            ok: false,
            error: "Cannot reach the access-control API. Check that the backend is running and try again.",
        };
    }
}

/**
 * GET /rbac/permissions — the whole board.
 *
 * A 404 means the backend does not serve this route at all — an older deploy,
 * not "nothing stored". The screen says so instead of silently running on the
 * built-in matrix and calling it live.
 *
 * The read is quiet: every role but Admin is refused it, and that refusal is a
 * state the app draws — a sidebar notice, a banner on Settings, a caveat on the
 * blocked screen — so it must not also fire the global error toast on every
 * page load.
 */
export function getRbacPermissionsApi(): Promise<
    SettingsResult<GetRbacPermissionsResponse>
> {
    return withoutErrorToasts(() =>
        request<GetRbacPermissionsResponse>("/permissions")
    );
}

/**
 * PUT /rbac/permissions — merges the changed cells into the stored overrides.
 *
 * Only the cells the admin edited are sent; everything else keeps the value it
 * already had on the server.
 */
export function updateRbacPermissionsApi(
    patch: RbacPermissionsPatch
): Promise<SettingsResult<UpdateRbacPermissionsResponse>> {
    return request<UpdateRbacPermissionsResponse>("/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
    });
}

/** POST /rbac/permissions/reset — drops every override, back to the defaults. */
export function resetRbacPermissionsApi(): Promise<
    SettingsResult<ResetRbacPermissionsResponse>
> {
    return request<ResetRbacPermissionsResponse>("/permissions/reset", {
        method: "POST",
    });
}
