import { AUTH_API_BASE_URL } from "@/data/authApiBaseUrl";
import { isRole, type Role } from "@/Roles";

/**
 * The signed-in user's session, as returned by the auth service's
 * POST /auth/login. `role` is the JWT userType, which the canteen seed
 * writes as the Roles.ts role name itself, so it maps straight onto the
 * app's Role with no lookup table.
 */
export type CanteenSession = {
    accessToken: string;
    refreshToken: string;
    userId: string;
    email: string;
    displayName: string;
    role: Role;
};

/** Login failure with the auth service's own message and HTTP status. */
export class AuthApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "AuthApiError";
        this.status = status;
    }
}

type LoginResponse = {
    success?: boolean;
    message?: string;
    data?: {
        accessToken?: string;
        refreshToken?: string;
        userId?: string;
        email?: string;
        displayName?: string;
        role?: string;
    };
};

type RefreshResponse = {
    success?: boolean;
    message?: string;
    data?: { accessToken?: string; refreshToken?: string };
};

/**
 * Authenticates against hms-auth-service and returns the tokens plus the
 * user's canteen role. Throws AuthApiError for a rejected credential or an
 * account that carries no canteen role, with a message safe to show the user.
 */
export default async function loginApi(
    email: string,
    password: string
): Promise<CanteenSession> {
    let response: Response;

    try {
        response = await fetch(`${AUTH_API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
    } catch {
        throw new AuthApiError(
            "Cannot reach the auth service. Check that it is running and try again.",
            0
        );
    }

    const json: LoginResponse | null = await response
        .json()
        .catch(() => null);

    if (!response.ok || !json?.success || !json.data) {
        throw new AuthApiError(
            json?.message || "Login failed. Please try again.",
            response.status
        );
    }

    const { accessToken, refreshToken, userId, email: loginEmail, displayName, role } =
        json.data;

    if (!accessToken || !refreshToken) {
        throw new AuthApiError(
            "Login failed: the auth service returned no tokens.",
            response.status
        );
    }

    if (!isRole(role)) {
        throw new AuthApiError(
            "This account is not assigned a canteen role. Ask an administrator to grant you one.",
            403
        );
    }

    return {
        accessToken,
        refreshToken,
        userId: userId || "",
        email: loginEmail || email,
        displayName: displayName || email,
        role,
    };
}

/**
 * Exchanged a stored refresh token for a fresh access + refresh token pair.
 *
 * Called by the global fetch interceptor (utils/authFetchInterceptor.ts) when
 * a backend request comes back 401 because the access token expired. Returns
 * null when the refresh token is missing or rejected, which means the session
 * is genuinely over and the user must sign in again.
 */
export async function refreshAuthApi(
    refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
    let response: Response;

    try {
        response = await fetch(`${AUTH_API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });
    } catch {
        // Network failure reaching the auth service — treated as "could not
        // refresh", so the caller keeps the session and surfaces the original
        // error rather than signing the user out over a blip.
        return null;
    }

    const json: RefreshResponse | null = await response.json().catch(() => null);

    const accessToken = json?.data?.accessToken;
    const nextRefreshToken = json?.data?.refreshToken;

    if (!response.ok || !json?.success || !accessToken || !nextRefreshToken) {
        return null;
    }

    return { accessToken, refreshToken: nextRefreshToken };
}
