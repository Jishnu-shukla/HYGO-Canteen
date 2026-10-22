import type { CanteenSession } from "@/data/Auth/api";

/**
 * Browser-side persistence for the signed-in session.
 *
 * The tokens live only in localStorage — there is no httpOnly cookie yet, so
 * this follows the auth service's token-in-response contract. The role is
 * mirrored into `canteen.role` (RoleContext's own key) at login so the header,
 * sidebar and RoleGuard keep reading the single source of truth they already
 * know; this module never writes that key on its own.
 */

const STORAGE_KEY = "canteen.auth";

/** Reads the stored session, or null when signed out (or storage is blocked). */
export function getAuthSession(): CanteenSession | null {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<CanteenSession>;
        if (!parsed || typeof parsed.accessToken !== "string") return null;

        return parsed as CanteenSession;
    } catch {
        // Storage can be unavailable (private mode) or the value corrupt;
        // either way the user is signed out.
        return null;
    }
}

export function saveAuthSession(session: CanteenSession): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
        // Persisting is a nice-to-have; the in-memory redirect still works.
    }
}

/**
 * Overwrites just the tokens on the stored session, leaving identity fields
 * (userId, email, displayName, role) untouched. Used after a successful
 * refresh so the next request picks up the new access token.
 *
 * No-op when there is no session to update.
 */
export function updateStoredTokens(tokens: {
    accessToken: string;
    refreshToken: string;
}): void {
    const current = getAuthSession();
    if (!current) return;

    saveAuthSession({ ...current, ...tokens });
}

/** Signs out: drops the session and the mirrored role key. */
export function clearAuthSession(): void {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem("canteen.role");
    } catch {
        // Nothing to clean up if storage is unavailable.
    }
}
