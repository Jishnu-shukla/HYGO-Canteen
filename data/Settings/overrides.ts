import {
    ACTIONS,
    getScreenActions,
    isActionId,
    isActionPermission,
    isRole,
    ROLES,
    type ActionId,
    type ActionPermission,
    type Role,
    type RoleActionMatrix,
} from "@/Roles";

/**
 * The rules for editing the role matrix, kept out of the components that draw
 * it.
 *
 * Everything here is pure: the Settings screen holds a draft matrix, and these
 * functions are the only place that knows what a toggle means, which cells
 * differ from what the backend enforces, and what a save should actually send.
 *
 * The draft is the whole matrix (what the screen shows), the save is the delta
 * (what the backend merges), and the two are never confused: `diffMatrix` turns
 * one into the other.
 */

/** A matrix with no cells — every action at its blank answer, "no". */
export const EMPTY_MATRIX: RoleActionMatrix = {};

/**
 * Reads a matrix that came from outside the app into a usable one.
 *
 * The backend keeps what it was given, so anything unfamiliar is dropped here:
 * an action this build does not have, a role it no longer has, a permission
 * spelled differently. A stale cell must not become a silent grant — and
 * because a save is a merge, dropping it here also means a save cannot erase a
 * cell the backend knows and this build does not.
 */
export function normalizeMatrix(value: unknown): RoleActionMatrix {
    if (!value || typeof value !== "object") return EMPTY_MATRIX;

    const matrix: RoleActionMatrix = {};

    for (const [action, byRole] of Object.entries(
        value as Record<string, unknown>
    )) {
        if (!isActionId(action) || !byRole || typeof byRole !== "object") {
            continue;
        }

        const cells: Partial<Record<Role, ActionPermission>> = {};

        for (const [role, permission] of Object.entries(
            byRole as Record<string, unknown>
        )) {
            if (!isRole(role) || !isActionPermission(permission)) continue;
            cells[role] = permission;
        }

        if (Object.keys(cells).length > 0) matrix[action] = cells;
    }

    return matrix;
}

/** Sets one cell. Admin is exempt, so a cell for Admin is never written. */
export function setPermission(
    matrix: RoleActionMatrix,
    action: ActionId,
    role: Role,
    permission: ActionPermission
): RoleActionMatrix {
    if (role === "Admin") return matrix;

    return {
        ...matrix,
        [action]: { ...(matrix[action] ?? {}), [role]: permission },
    };
}

/**
 * Grants or withdraws one screen for one role.
 *
 * Granting sets the screen's primary action — the thing the screen exists for.
 * The screen's other actions are left alone: letting someone into the cafeteria
 * is not the same as letting them settle a bill.
 *
 * Withdrawing clears every action on the screen. Clearing one would not be
 * enough, because any surviving action re-opens the route.
 */
export function setScreenAccess(
    matrix: RoleActionMatrix,
    path: string,
    role: Role,
    allowed: boolean
): RoleActionMatrix {
    const actions = getScreenActions(path);

    if (role === "Admin" || actions.length === 0) return matrix;

    if (allowed) {
        return setPermission(matrix, actions[0], role, "yes");
    }

    return actions.reduce(
        (next, action) => setPermission(next, action, role, "no"),
        matrix
    );
}

/**
 * The cells that differ between the matrix in force and the draft — exactly
 * what a save has to send.
 *
 * A cell set to "no" is included when the matrix in force allows it: "no" is a
 * value to store, not an absence. Admin cells are never included; Admin is
 * exempt and the backend does not store cells for it.
 */
export function diffMatrix(
    base: RoleActionMatrix,
    draft: RoleActionMatrix
): RoleActionMatrix {
    const patch: RoleActionMatrix = {};

    for (const action of ACTIONS) {
        const before = base[action] ?? {};
        const after = draft[action] ?? {};

        const cells: Partial<Record<Role, ActionPermission>> = {};

        for (const role of ROLES) {
            if (role === "Admin") continue;

            const current = before[role] ?? "no";
            const next = after[role] ?? "no";

            if (current !== next) cells[role] = next;
        }

        if (Object.keys(cells).length > 0) patch[action] = cells;
    }

    return patch;
}

/** How many cells differ between two matrices — the "3 unsaved changes" count. */
export function countChanges(
    base: RoleActionMatrix,
    draft: RoleActionMatrix
): number {
    let changes = 0;

    for (const action of ACTIONS) {
        const before = base[action] ?? {};
        const after = draft[action] ?? {};

        for (const role of ROLES) {
            if (role === "Admin") continue;

            if ((before[role] ?? "no") !== (after[role] ?? "no")) changes += 1;
        }
    }

    return changes;
}

/** Whether a matrix holds any cell at all. */
export function hasCells(matrix: RoleActionMatrix | null | undefined): boolean {
    if (!matrix) return false;

    return Object.values(matrix).some(
        (cells) => cells && Object.keys(cells).length > 0
    );
}

/**
 * Applies a patch on top of a matrix.
 *
 * Used to keep the screen's copy of the stored overrides in step after a save:
 * the backend merges the cells it was sent, so merging the same cells here
 * gives the same answer without a second GET.
 */
export function mergeMatrix(
    base: RoleActionMatrix,
    patch: RoleActionMatrix
): RoleActionMatrix {
    const merged: RoleActionMatrix = { ...base };

    for (const [action, cells] of Object.entries(patch)) {
        if (!cells) continue;

        merged[action as ActionId] = {
            ...(merged[action as ActionId] ?? {}),
            ...cells,
        };
    }

    return merged;
}

/**
 * Whether a cell was set by an admin rather than inherited.
 *
 * The backend's rule: a cell counts as custom when it appears in `overrides`,
 * even if its value happens to equal the default.
 */
export function isCustomCell(
    overrides: RoleActionMatrix,
    action: ActionId,
    role: Role
): boolean {
    return overrides[action]?.[role] !== undefined;
}
