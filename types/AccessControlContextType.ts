import type {
    ActionId,
    ActionPermission,
    Role,
    RoleActionMatrix,
} from "@/Roles";
import type { RouteItem, SidebarSection } from "@/routes";

/**
 * Whether the matrix in force came from the backend or is the built-in one.
 *
 * "backend" — the access-control API answered, and its `live` matrix is in
 * force. "defaults" — the API could not be reached, refused this role, or is
 * not deployed, so the app is running on `ROLE_ACTIONS` from `Roles.ts`. The
 * Settings screen says which, because an admin must never mistake the fallback
 * for a saved configuration.
 */
export type AccessControlSource = "backend" | "defaults";

export type AccessControlStatus = "loading" | "ready" | "error";

/**
 * What a save or a reset hands back.
 *
 * On success it carries the matrix the backend now serves, when it sent one,
 * so the screen can adopt exactly what was stored instead of assuming its
 * draft became the truth.
 */
export type AccessControlSaveResult =
    | { ok: true; matrix?: RoleActionMatrix }
    | { ok: false; error: string };

export type AccessControlContextType = {
    /**
     * The matrix in force. The backend's `live` once it has answered; the
     * built-in matrix until then, and after a failure.
     */
    matrix: RoleActionMatrix;
    /** The backend's coded baseline, for telling an override from a default. */
    defaults: RoleActionMatrix;
    /** The cells an admin changed, as the backend reports them. */
    overrides: RoleActionMatrix;
    /**
     * The roles and actions the matrix should list, as the backend reports
     * them. Filtered to the vocabulary this build knows; unknown ids are left
     * to the build that can label them.
     */
    roles: Role[];
    actions: ActionId[];
    /** The permission levels the backend accepts, in the order it lists them. */
    permissions: ActionPermission[];
    /** Whether the matrix is still being fetched, or has landed. */
    status: AccessControlStatus;
    /** Why the matrix could not be loaded, when it could not be. */
    error: string | null;
    /** The HTTP status behind the failure, when the service answered at all. */
    errorStatus: number | null;
    /** Where the matrix in force came from. */
    source: AccessControlSource;
    /** Who last saved a change, per the backend's echo of the save. */
    updatedBy: string | null;
    /** Whether the signed-in user may change the settings. */
    canManage: boolean;
    /** Whether the signed-in role may open a path. */
    canAccessPath: (pathname: string) => boolean;
    /** The authority the signed-in role has over an action. */
    getActionPermission: (action: ActionId) => ActionPermission;
    /** Whether the signed-in role may carry an action out on its own. */
    can: (action: ActionId) => boolean;
    /** The sidebar sections the signed-in role may see. */
    getAccessibleSections: () => SidebarSection[];
    /** The sidebar routes the signed-in role may see, flattened. */
    getAccessibleRoutes: () => RouteItem[];
    /** Merges the changed cells into the stored overrides, in force at once. */
    saveMatrix: (patch: RoleActionMatrix) => Promise<AccessControlSaveResult>;
    /** Drops every override, putting the built-in matrix back in force. */
    resetMatrix: () => Promise<AccessControlSaveResult>;
};
