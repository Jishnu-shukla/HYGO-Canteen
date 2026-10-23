/**
 * Single source of truth for roles and role-based access.
 *
 * Access is two things here, and one derives from the other:
 *
 *   - ROLE_ACTIONS  the role x action matrix: what a role may carry out.
 *   - SCREEN_ACTIONS  which action(s) live on each screen. A role may open a
 *     screen when the matrix answers "yes" or "may be" for at least one of the
 *     actions on it.
 *
 * There is deliberately no second, hand-kept list of screens per role: changing
 * a cell changes both what the role may do and where it may go, so the sidebar,
 * the route guard and the action checks cannot disagree.
 *
 * The matrix below is the app's BUILT-IN answer. Admin changes come from the
 * canteen backend (`GET /api/rbac/permissions`, the `live` matrix) and replace
 * it at runtime; they are never written back into this file.
 *
 * Admin is exempt everywhere — every action, every screen — so it never has to
 * be maintained twice.
 */

import { SIDEBAR_ROUTES, type RouteItem, type SidebarSection } from "./routes";

/** Every assignable role, in the order the access matrix lists them. */
export const ROLES = [
    "Admin",
    "Kitchen Manager",
    "Supervisor",
    "Dietitian",
    "Nurse",
    "Store Keeper",
    "Cashier",
] as const;

export type Role = (typeof ROLES)[number];

/** Role a session starts on until auth assigns a real one. */
export const DEFAULT_ROLE: Role = "Admin";

/**
 * Every permission-carrying action, in matrix order. Each id doubles as a key
 * into ROLE_ACTIONS, one per row of the role x action table.
 */
export const ACTIONS = [
    "viewDashboard",
    "manageAssessments",
    "changePatientDiet",
    "manageAllergens",
    "manageDietOrders",
    "planKitchenSchedule",
    "dispatchDeliveryMeal",
    "manageRecipes",
    "manageMenus",
    "approveMasterMenu",
    "viewPlateWaste",
    "adjustInventory",
    "manageFssaiChecklist",
    "registerTable",
    "placeTableOrder",
    "settleCafeteriaBill",
    "manageSettings",
] as const;

export type ActionId = (typeof ACTIONS)[number];

/**
 * Authority a role has over an action: "yes" acts freely, "may be" acts on the
 * role's own judgement, "request" must be approved by someone else first, and
 * "no" (the answer for any cell left blank) has no access at all.
 */
export type ActionPermission = "yes" | "request" | "may be" | "no";

/**
 * A role x action matrix, action → role → permission.
 *
 * The same shape the backend stores and answers as `defaults`, `live` and
 * `overrides`, so a payload can be used without translation. A missing cell
 * means "no".
 */
export type RoleActionMatrix = Partial<
    Record<ActionId, Partial<Record<Role, ActionPermission>>>
>;

/**
 * The role x action access matrix, one row per action. The comment on each row
 * names the screen it lives on, which is what opens that route.
 *
 * Only non-blank cells are written: a missing role means "no", so a new action
 * starts closed to everyone but Admin. Admin is omitted on purpose, as
 * everywhere else in this file, and always answers "yes".
 */
export const ROLE_ACTIONS: Record<
    ActionId,
    Partial<Record<Exclude<Role, "Admin">, ActionPermission>>
> = {
    // Dashboard — "/"
    viewDashboard: {
        "Kitchen Manager": "yes",
        Supervisor: "yes",
        Dietitian: "yes",
        Nurse: "yes",
        "Store Keeper": "yes",
        Cashier: "yes",
    },
    // Nutritional Assessments — "/assessments"
    manageAssessments: {
        Supervisor: "yes",
        Dietitian: "yes",
    },
    // Diet Plan Builder — "/diet-plan"
    changePatientDiet: {
        Supervisor: "yes",
        Dietitian: "yes",
        Nurse: "request",
    },
    // Allergen & Preference — "/allergens"
    manageAllergens: {
        Supervisor: "yes",
        Dietitian: "yes",
    },
    // Diet Orders — "/diet-orders"
    manageDietOrders: {
        "Kitchen Manager": "yes",
        Supervisor: "yes",
        Dietitian: "yes",
        Nurse: "yes",
    },
    // Kitchen Schedule — "/kitchen-schedule"
    planKitchenSchedule: {
        "Kitchen Manager": "yes",
        Supervisor: "yes",
    },
    // Meal Dispatch + Bedside Delivery — "/meal-dispatch", "/bedside-delivery"
    dispatchDeliveryMeal: {
        "Kitchen Manager": "yes",
        Supervisor: "yes",
        Nurse: "yes",
    },
    // Recipes — "/recipe"
    manageRecipes: {
        "Kitchen Manager": "yes",
        Supervisor: "yes",
        Dietitian: "may be",
    },
    // Menu (patient & general) — "/menu"
    manageMenus: {
        "Kitchen Manager": "yes",
        Supervisor: "yes",
    },
    // Master Menu approval — "/mastermenu"
    approveMasterMenu: {
        "Kitchen Manager": "yes",
        Supervisor: "yes",
        "Store Keeper": "may be",
    },
    // Plate Waste Analytics — "/plate-waste"
    viewPlateWaste: {
        "Kitchen Manager": "yes",
        Supervisor: "yes",
    },
    // Inventory adjustments — "/inventory"
    // "request" is not a grant, so the Kitchen Manager cannot open the screen.
    adjustInventory: {
        "Kitchen Manager": "request",
        Supervisor: "yes",
        "Store Keeper": "yes",
    },
    // FSSAI Checklist — "/fssai-checklist"
    manageFssaiChecklist: {
        "Kitchen Manager": "yes",
        Supervisor: "yes",
        "Store Keeper": "yes",
    },
    // Table registration & QR — "/cafeteria", "/tables"
    registerTable: {
        Supervisor: "yes",
        Cashier: "yes",
    },
    // QR self-order screen — "/tables"
    placeTableOrder: {
        Supervisor: "yes",
        Cashier: "yes",
    },
    // Settle tab, discount, print bill/KOT — "/cafeteria"
    settleCafeteriaBill: {
        Supervisor: "yes",
        Cashier: "yes",
    },
    // Settings & access control — "/settings"
    // Blank for every non-admin role: the settings screen belongs to Admin
    // until an admin grants it from the Settings screen itself.
    manageSettings: {},
};

/**
 * Which action(s) live on each screen, in the order they matter to the screen.
 *
 * The first action is the screen's primary one: the Settings matrix toggles a
 * screen by granting it, because entering a screen means being able to do the
 * thing the screen exists for. The remaining actions on a screen are still
 * granted from the Action permissions tab — a screen is only withdrawn when
 * every action on it is withdrawn, otherwise one survivor would re-open it.
 *
 * Most screens carry one action. The cafeteria pair is the exception: taking a
 * table order, registering a table and settling a bill are three authorities
 * that happen to share two screens.
 *
 * Every path in SIDEBAR_ROUTES belongs here; a screen missing from this table
 * is reachable by Admin alone.
 */
export const SCREEN_ACTIONS: Record<string, readonly ActionId[]> = {
    "/": ["viewDashboard"],
    "/assessments": ["manageAssessments"],
    "/diet-plan": ["changePatientDiet"],
    "/allergens": ["manageAllergens"],
    "/diet-orders": ["manageDietOrders"],
    "/kitchen-schedule": ["planKitchenSchedule"],
    "/meal-dispatch": ["dispatchDeliveryMeal"],
    "/bedside-delivery": ["dispatchDeliveryMeal"],
    "/mastermenu": ["approveMasterMenu"],
    "/menu": ["manageMenus"],
    "/recipe": ["manageRecipes"],
    "/plate-waste": ["viewPlateWaste"],
    "/inventory": ["adjustInventory"],
    "/fssai-checklist": ["manageFssaiChecklist"],
    "/cafeteria": ["registerTable", "settleCafeteriaBill"],
    "/tables": ["placeTableOrder", "registerTable"],
    "/settings": ["manageSettings"],
};

/** Type guard for values from outside the app, such as a <select>. */
export function isRole(value: unknown): value is Role {
    return (
        typeof value === "string" &&
        (ROLES as readonly string[]).includes(value)
    );
}

/** Type guard for action ids arriving from the backend. */
export function isActionId(value: unknown): value is ActionId {
    return (
        typeof value === "string" &&
        (ACTIONS as readonly string[]).includes(value)
    );
}

/** Type guard for the four permission levels. */
export function isActionPermission(
    value: unknown
): value is ActionPermission {
    return (
        value === "yes" ||
        value === "may be" ||
        value === "request" ||
        value === "no"
    );
}

/**
 * The actions that live on the screen a pathname belongs to.
 *
 * Nested routes count as part of their screen — /tables/TBL-000001 lives on
 * /tables — and the "/" boundary stops a sibling that merely starts with the
 * same text from matching.
 */
export function getActionsForPath(pathname: string): ActionId[] {
    const actions: ActionId[] = [];

    for (const [path, onScreen] of Object.entries(SCREEN_ACTIONS)) {
        if (pathname === path || pathname.startsWith(`${path}/`)) {
            actions.push(...onScreen);
        }
    }

    return actions;
}

/**
 * The actions that open one screen, primary action first.
 *
 * Exported for the Settings screen, which needs to know what a screen toggle
 * actually grants.
 */
export function getScreenActions(path: string): readonly ActionId[] {
    return SCREEN_ACTIONS[path] ?? [];
}

/**
 * The authority a role has over an action, from the matrix in force. Admin is
 * exempt and always answers "yes".
 *
 * Pass `live` (or a draft of it) to answer against what the backend enforces;
 * omit it to answer against the built-in matrix.
 */
export function getActionPermission(
    role: Role,
    action: ActionId,
    matrix: RoleActionMatrix = ROLE_ACTIONS
): ActionPermission {
    if (role === "Admin") return "yes";

    return matrix[action]?.[role] ?? "no";
}

/**
 * Whether a role may carry an action out on its own. "yes" and "may be" both
 * count — "may be" is the role's own judgement — while "request" answers false
 * until an approval flow (not built yet) grants it.
 */
export function can(
    role: Role,
    action: ActionId,
    matrix: RoleActionMatrix = ROLE_ACTIONS
): boolean {
    const permission = getActionPermission(role, action, matrix);
    return permission === "yes" || permission === "may be";
}

/**
 * Whether a role may open a path.
 *
 * A screen is open when the role may carry out at least one action on it, and
 * anything nested under a screen stays with it. Admin reaches everything.
 */
export function canAccessPath(
    role: Role,
    pathname: string,
    matrix: RoleActionMatrix = ROLE_ACTIONS
): boolean {
    if (role === "Admin") return true;

    return getActionsForPath(pathname).some((action) =>
        can(role, action, matrix)
    );
}

/** The screens a role may open, in the order SCREEN_ACTIONS declares them. */
export function getRoleRoutes(
    role: Role,
    matrix: RoleActionMatrix = ROLE_ACTIONS
): string[] {
    return Object.keys(SCREEN_ACTIONS).filter((path) =>
        canAccessPath(role, path, matrix)
    );
}

/** The sidebar routes a role may see, flattened in sidebar order. */
export function getAccessibleRoutes(
    role: Role,
    matrix: RoleActionMatrix = ROLE_ACTIONS
): RouteItem[] {
    return SIDEBAR_ROUTES.flatMap((section) => section.items).filter((item) =>
        canAccessPath(role, item.path, matrix)
    );
}

/**
 * Sidebar sections with only the routes a role may see. Sections that end up
 * empty are dropped, so the sidebar never renders a heading with no items.
 */
export function getAccessibleSections(
    role: Role,
    matrix: RoleActionMatrix = ROLE_ACTIONS
): SidebarSection[] {
    return SIDEBAR_ROUTES.map((section) => ({
        ...section,
        items: section.items.filter((item) =>
            canAccessPath(role, item.path, matrix)
        ),
    })).filter((section) => section.items.length > 0);
}
