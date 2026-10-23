"use client";

import {
    ACTIONS,
    can as canWith,
    canAccessPath as canAccessPathWith,
    getAccessibleRoutes as getAccessibleRoutesWith,
    getAccessibleSections as getAccessibleSectionsWith,
    getActionPermission as getActionPermissionWith,
    isActionId,
    isActionPermission,
    isRole,
    ROLE_ACTIONS,
    ROLES,
    type ActionId,
    type ActionPermission,
    type Role,
    type RoleActionMatrix,
} from "@/Roles";
import {
    getRbacPermissionsApi,
    resetRbacPermissionsApi,
    updateRbacPermissionsApi,
} from "@/data/Settings/api";
import {
    EMPTY_MATRIX,
    hasCells,
    mergeMatrix,
    normalizeMatrix,
} from "@/data/Settings/overrides";
import { useRoleContext } from "@/context/RoleContext";
import type {
    AccessControlContextType,
    AccessControlSaveResult,
} from "@/types/AccessControlContextType";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

/**
 * The live role matrix.
 *
 * `Roles.ts` holds the matrix the app ships with; this provider holds the one
 * the backend enforces — its `live` matrix, fetched from
 * `GET /api/rbac/permissions`. The sidebar, the route guard and every action
 * check read through here, so navigation, access and authority can never
 * disagree.
 *
 * When the API cannot be reached — or refuses the signed-in role, which it does
 * for everyone but Admin — the built-in matrix stays in force and `source`
 * says so. It never invents a matrix the backend did not send.
 *
 * The matrix is read when the shell mounts and again whenever the tab comes
 * back into view, so a change saved in another tab — or by another admin —
 * reaches the sidebar without a reload. Those background reads are silent: they
 * never flip the screen back into a loading state, and a failed one keeps the
 * matrix already in force.
 */
const AccessControlContext = createContext<AccessControlContextType | undefined>(
    undefined
);

/** The permission vocabulary, in the order the matrix reads best. */
const DEFAULT_PERMISSIONS: ActionPermission[] = [
    "yes",
    "may be",
    "request",
    "no",
];

export default function AccessControlProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { role } = useRoleContext();

    const [matrix, setMatrix] = useState<RoleActionMatrix>(ROLE_ACTIONS);
    const [defaults, setDefaults] = useState<RoleActionMatrix>(ROLE_ACTIONS);
    const [overrides, setOverrides] =
        useState<RoleActionMatrix>(EMPTY_MATRIX);
    const [roles, setRoles] = useState<Role[]>([...ROLES]);
    const [actions, setActions] = useState<ActionId[]>([...ACTIONS]);
    const [permissions, setPermissions] =
        useState<ActionPermission[]>(DEFAULT_PERMISSIONS);
    const [status, setStatus] = useState<AccessControlContextType["status"]>(
        "loading"
    );
    const [error, setError] = useState<string | null>(null);
    const [errorStatus, setErrorStatus] = useState<number | null>(null);
    const [source, setSource] =
        useState<AccessControlContextType["source"]>("defaults");
    const [updatedBy, setUpdatedBy] = useState<string | null>(null);

    // Whether a board has ever loaded. A silent refresh that fails must not
    // drop back to the built-in matrix for a hiccup, because the sidebar would
    // visibly shrink and grow again.
    const hasBoard = useRef(false);
    const alive = useRef(true);

    /**
     * Reads the matrix.
     *
     * `silent` is a background refresh: it leaves `status` alone, so the
     * Settings screen does not lock its switches while the admin is editing,
     * and a failure keeps the matrix already in force.
     */
    const load = useCallback(async (silent: boolean) => {
        const result = await getRbacPermissionsApi();

        if (!alive.current) return;

        if (!result.ok) {
            if (silent && hasBoard.current) return;

            setStatus("error");
            setError(result.error);
            setErrorStatus(result.status ?? null);
            setSource("defaults");
            return;
        }

        const live = result.data?.live;
        const baseline = result.data?.defaults;
        const stored = result.data?.overrides;

        // A backend that answers without a live matrix is not usable: the
        // built-in one stays in force and the screen says why.
        if (!live || typeof live !== "object") {
            if (silent && hasBoard.current) return;

            setStatus("error");
            setError("The access-control API answered without a live matrix.");
            setErrorStatus(null);
            setSource("defaults");
            return;
        }

        setMatrix(normalizeMatrix(live));
        setDefaults(normalizeMatrix(baseline ?? ROLE_ACTIONS));
        setOverrides(normalizeMatrix(stored));

        const serverRoles = (result.data?.roles ?? []).filter(isRole);
        const serverActions = (result.data?.actions ?? []).filter(isActionId);
        const serverPermissions = (result.data?.permissions ?? []).filter(
            isActionPermission
        );

        // The lists are what the screen draws its headers from. An empty
        // one means the backend did not send one, not that the app has no
        // roles.
        if (serverRoles.length > 0) setRoles(serverRoles);
        if (serverActions.length > 0) setActions(serverActions);
        if (serverPermissions.length > 0) setPermissions(serverPermissions);

        hasBoard.current = true;
        setSource("backend");
        setError(null);
        setErrorStatus(null);
        setStatus("ready");
    }, []);

    // Loads the backend's matrix when the shell mounts.
    useEffect(() => {
        alive.current = true;

        async function firstLoad() {
            await load(false);
        }

        void firstLoad();

        return () => {
            alive.current = false;
        };
    }, [load]);

    // A tab that stays open keeps whatever matrix it loaded. Re-read it when
    // the tab comes back into view, so a change another admin saved — or that
    // this admin saved in another tab — reaches the sidebar without a reload.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === "visible") void load(true);
        };

        document.addEventListener("visibilitychange", onVisible);

        return () => {
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load]);

    const saveMatrix = useCallback(
        async (patch: RoleActionMatrix): Promise<AccessControlSaveResult> => {
            // Nothing changed is not a save: the backend would accept an empty
            // merge, but it would also restamp the document as saved.
            if (!hasCells(patch)) return { ok: true };

            const result = await updateRbacPermissionsApi({
                roleActions: patch,
            });

            if (!result.ok) return { ok: false, error: result.error };

            const live = result.data?.live;

            if (!live || typeof live !== "object") {
                return {
                    ok: false,
                    error: "The access-control API did not return the saved matrix.",
                };
            }

            // Adopt the server's copy — it is the one that counts — and merge
            // the cells that were just sent into the stored overrides, which
            // is exactly what the backend did with them.
            const saved = normalizeMatrix(live);

            setMatrix(saved);
            setOverrides((previous) => mergeMatrix(previous, patch));
            setUpdatedBy(result.data?.updatedBy ?? null);
            setSource("backend");
            setError(null);
            setErrorStatus(null);
            setStatus("ready");

            return { ok: true, matrix: saved };
        },
        []
    );

    const resetMatrix = useCallback(async (): Promise<AccessControlSaveResult> => {
        const result = await resetRbacPermissionsApi();

        if (!result.ok) return { ok: false, error: result.error };

        const live = result.data?.live;

        if (!live || typeof live !== "object") {
            return {
                ok: false,
                error: "The access-control API did not return the reset matrix.",
            };
        }

        const reset = normalizeMatrix(live);

        setMatrix(reset);
        // Every override was dropped, so nothing is custom any more.
        setOverrides(EMPTY_MATRIX);
        setUpdatedBy(null);
        setSource("backend");
        setError(null);
        setErrorStatus(null);
        setStatus("ready");

        return { ok: true, matrix: reset };
    }, []);

    const canAccessPath = useCallback(
        (pathname: string) => canAccessPathWith(role, pathname, matrix),
        [role, matrix]
    );

    const getActionPermission = useCallback(
        (action: ActionId): ActionPermission =>
            getActionPermissionWith(role, action, matrix),
        [role, matrix]
    );

    const can = useCallback(
        (action: ActionId) => canWith(role, action, matrix),
        [role, matrix]
    );

    const getAccessibleSections = useCallback(
        () => getAccessibleSectionsWith(role, matrix),
        [role, matrix]
    );

    const getAccessibleRoutes = useCallback(
        () => getAccessibleRoutesWith(role, matrix),
        [role, matrix]
    );

    // Only Admin may change the settings out of the box. A role the admin gave
    // the "manage settings" action may change them too — but only once the
    // API actually lets it read the matrix, because the backend guards all
    // three routes. Until then the screen shows the refusal instead of an
    // editor whose saves would be rejected.
    const canManage =
        role === "Admin" ||
        (canWith(role, "manageSettings", matrix) && status === "ready");

    const value = useMemo<AccessControlContextType>(
        () => ({
            matrix,
            defaults,
            overrides,
            roles,
            actions,
            permissions,
            status,
            error,
            errorStatus,
            source,
            updatedBy,
            canManage,
            canAccessPath,
            getActionPermission,
            can,
            getAccessibleSections,
            getAccessibleRoutes,
            saveMatrix,
            resetMatrix,
        }),
        [
            matrix,
            defaults,
            overrides,
            roles,
            actions,
            permissions,
            status,
            error,
            errorStatus,
            source,
            updatedBy,
            canManage,
            canAccessPath,
            getActionPermission,
            can,
            getAccessibleSections,
            getAccessibleRoutes,
            saveMatrix,
            resetMatrix,
        ]
    );

    return (
        <AccessControlContext.Provider value={value}>
            {children}
        </AccessControlContext.Provider>
    );
}

export const useAccessControl = () => {
    const context = useContext(AccessControlContext);

    if (!context) {
        throw new Error(
            "useAccessControl must be used within an AccessControlProvider"
        );
    }

    return context;
};
