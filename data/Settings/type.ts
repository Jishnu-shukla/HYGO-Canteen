import type {
    ActionId,
    ActionPermission,
    Role,
    RoleActionMatrix,
} from "@/Roles";

/**
 * Request/response contracts for /api/rbac — the canteen backend's access
 * control API.
 *
 *   GET  /api/rbac/permissions         -> GetRbacPermissionsResponse
 *   PUT  /api/rbac/permissions         <- UpdateRbacPermissionsBody
 *                                      -> UpdateRbacPermissionsResponse
 *   POST /api/rbac/permissions/reset   -> ResetRbacPermissionsResponse
 *
 * All three are Admin-only, enforced by the backend's route registry rather
 * than by anything here: a non-admin caller is refused before the handler runs,
 * so this file starts after the global enforcer has already let the call
 * through. That is why the Settings screen is reachable by other roles but the
 * matrix behind it is not — see docs/settings-api.md.
 *
 * Every response is the standard ApiResponse envelope; the names below
 * describe what its `data` carries.
 *
 * The vocabulary is not restated: Role / ActionId / ActionPermission /
 * RoleActionMatrix come from `Roles.ts`, which is the same matrix the app
 * enforces between fetches.
 */

/* ------------------------------------------------------------------ *
 * The envelope every canteen route answers with
 * ------------------------------------------------------------------ */

export interface ApiResponse<T> {
    statusCode: number;
    message: string;
    success: boolean;
    data: T;
}

/* ------------------------------------------------------------------ *
 * GET /api/rbac/permissions
 * ------------------------------------------------------------------ */

/**
 * One endpoint-registry row, as the screen receives it.
 *
 * Derived from the backend's route registry at request time — never edited by
 * the API, it is code, not configuration. The Settings screen does not draw
 * from it (its screens are the app's, not the API's) but it is part of the
 * contract and the screen shows the count so an admin can see the matrix is
 * actually applied to routes.
 */
export interface RbacRouteRule {
    /** "GET" … "DELETE"; HEAD is already folded into GET by the matcher. */
    method: string;
    /** Registry pattern with :param segments, e.g. "/api/inventory/:item_id". */
    path: string;
    /** Guard by matrix row — the normal case. Absent when the route uses roles. */
    actions?: ActionId[];
    /** Guard by role list (the Admin-only settings API). Absent otherwise. */
    roles?: Role[];
}

/**
 * Which HMS claim strings count as which canteen role.
 *
 * A claim in no map yields no role and is refused everywhere. The settings
 * screen does not edit this yet; it is carried because it is part of the same
 * document and the next tab that needs it should not have to change the
 * provider.
 */
export type ClaimRoleMap = Record<string, Role>;

/**
 * GET /api/rbac/permissions response.
 *
 * Ships the whole board in one call so the screen can show defaults, overrides
 * and what is enforced as the three different things they are:
 *
 *   defaults + overrides = live, cell by cell. A cell counts as custom when it
 *   appears in `overrides`, even if its value happens to equal the default —
 *   that is the backend's own rule for "an admin chose this".
 */
export interface GetRbacPermissionsResponse {
    /** Every role the matrix can name, for the screen's column headers. */
    roles: Role[];
    /** Every action a route can be guarded by, for its row headers. */
    actions: ActionId[];
    /** The permission vocabulary: "yes" | "request" | "may be" | "no". */
    permissions: ActionPermission[];
    /** Coded baseline from Roles.ts — what a fresh deploy enforces. */
    defaults: RoleActionMatrix;
    /** Enforced right now: defaults merged with overrides, per cell. */
    live: RoleActionMatrix;
    /** Only the cells an admin has changed. Empty until someone edits one. */
    overrides: RoleActionMatrix;
    /** Coded baseline claim → role map (platform logins resolve to Admin). */
    claimDefaults: ClaimRoleMap;
    /** Claim → role in force right now, defaults merged with overrides. */
    claimLive: ClaimRoleMap;
    /** Only the claim mappings an admin has changed. */
    claimOverrides: ClaimRoleMap;
    /** The endpoint registry the matrix is applied to. */
    routes: RbacRouteRule[];
}

/* ------------------------------------------------------------------ *
 * PUT /api/rbac/permissions
 * ------------------------------------------------------------------ */

/**
 * The cells to merge into the stored overrides.
 *
 * Sparse on purpose: omitted cells keep their current value, which is what
 * makes a save of three edited cells a three-cell change rather than a rewrite
 * of a matrix someone else may have edited in the meantime.
 */
export interface RbacPermissionsPatch {
    /** Cells to merge: { "<action id>": { "<role>": "<permission>" } }. */
    roleActions?: RoleActionMatrix;
    /** Claim → role mappings to merge. */
    roleFromClaims?: ClaimRoleMap;
}

/**
 * PUT /api/rbac/permissions body.
 *
 * Values are typed unknown because they are request input: the backend checks
 * them key by key against its own ROLES, ACTIONS and permission vocabulary and
 * answers 400 naming the offending key. `RbacPermissionsPatch` above is the
 * shape this app builds before sending.
 */
export interface UpdateRbacPermissionsBody {
    roleActions?: unknown;
    roleFromClaims?: unknown;
}

/**
 * PUT /api/rbac/permissions response.
 *
 * Echoes the identity that saved the change (the HMS _id of the Admin, for the
 * backend's audit trail) plus the matrix as it now stands, so the screen can
 * re-render without a second GET. Note that it carries `live` only: the stored
 * overrides are not echoed, which is why the screen merges the cells it sent
 * into its own copy rather than refetching.
 */
export interface UpdateRbacPermissionsResponse {
    /** HMS _id of the Admin who saved the change; null if the token carried none. */
    updatedBy: string | null;
    /** What the next request will be enforced against. */
    live: RoleActionMatrix;
}

/* ------------------------------------------------------------------ *
 * POST /api/rbac/permissions/reset
 * ------------------------------------------------------------------ */

/**
 * POST /api/rbac/permissions/reset response.
 *
 * The request takes no body — every override is dropped and enforcement falls
 * back to the coded defaults. `live` comes back as it now stands so the screen
 * can re-render in one round trip.
 */
export interface ResetRbacPermissionsResponse {
    /** The defaults, with every override cleared. */
    live: RoleActionMatrix;
}
