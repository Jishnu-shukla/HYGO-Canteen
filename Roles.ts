/**
 * Single source of truth for roles and role-based access.
 *
 * The app has no auth yet, so "access" here means which routes a role may
 * open and which actions it may carry out on them. The header's role picker
 * and (once wired) the sidebar both read from this file, so they cannot
 * disagree about who sees what.
 *
 * The mapping is data, not logic: add a role by appending to ROLES and giving
 * it an entry below; add a route by listing its path. Admin is exempt and
 * reaches everything.
 *
 * The file holds two views of the same role x action matrix, split by concern:
 *   - ROLE_ACCESS   screen level: which routes a role may open.
 *   - ROLE_ACTIONS  action level: the full matrix, including the "request" and
 *     "may be" levels a plain route list cannot express.
 * They are kept in sync by hand; the comment above ROLE_ACCESS states the rule
 * that connects them.
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
 * Route paths each non-admin role may open.
 *
 * A screen is open when the matrix answers "yes" or "may be" for the actions
 * that live on it; "request" and a blank cell both leave the route closed
 * until an approval flow exists to grant them. Adjust freely; this is the one
 * place to change it.
 *
 * Admin is omitted on purpose and always answers true, so it never has to be
 * maintained twice.
 */
export const ROLE_ACCESS: Record<Exclude<Role, "Admin">, readonly string[]> = {
    "Kitchen Manager": [
        "/",
        "/diet-orders",
        "/kitchen-schedule",
        "/meal-dispatch",
        "/bedside-delivery",
        "/mastermenu",
        "/menu",
        "/recipe",
        "/plate-waste",
        "/fssai-checklist",
        // no /inventory: the matrix answers "request" for adjusting stock.
    ],
    Supervisor: [
        "/",
        "/assessments",
        "/diet-plan",
        "/allergens",
        "/diet-orders",
        "/kitchen-schedule",
        "/meal-dispatch",
        "/bedside-delivery",
        "/mastermenu",
        "/menu",
        "/recipe",
        "/plate-waste",
        "/inventory",
        "/fssai-checklist",
        "/cafeteria",
        "/tables",
    ],
    Dietitian: [
        "/",
        "/assessments",
        "/diet-plan",
        "/allergens",
        "/diet-orders",
        "/recipe",
    ],
    // /meal-dispatch joins /bedside-delivery: dispatch and delivery are one
    // matrix row, and the nurse answers "yes" to it.
    Nurse: ["/", "/diet-orders", "/meal-dispatch", "/bedside-delivery"],
    "Store Keeper": ["/", "/inventory", "/fssai-checklist", "/mastermenu"],
    Cashier: ["/", "/cafeteria", "/tables"],
};

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
] as const;

export type ActionId = (typeof ACTIONS)[number];

/**
 * Authority a role has over an action: "yes" acts freely, "may be" acts on the
 * role's own judgement, "request" must be approved by someone else first, and
 * "no" (the answer for any cell left blank) has no access at all.
 */
export type ActionPermission = "yes" | "request" | "may be" | "no";

/**
 * The role x action access matrix, one row per action. The comment on each row
 * names the screen it lives on, which is the route ROLE_ACCESS opens for it.
 *
 * Only non-blank cells are written: a missing role means "no", so a new action
 * starts closed to everyone but Admin. Admin is omitted on purpose, as in
 * ROLE_ACCESS, and always answers "yes".
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
    // Table registration & QR — "/cafeteria"
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
};

/** Type guard for values from outside the app, such as a <select>. */
export function isRole(value: unknown): value is Role {
    return (
        typeof value === "string" &&
        (ROLES as readonly string[]).includes(value)
    );
}

/**
 * Whether a role may open a path.
 *
 * Matches the route itself and anything nested under it — /tables/TBL-000001
 * stays inside the Tables permission — using a "/" boundary so a route is not
 * granted by a sibling that merely starts with the same text. Admin reaches
 * everything.
 */
export function canAccessPath(role: Role, pathname: string): boolean {
    if (role === "Admin") return true;

    return ROLE_ACCESS[role].some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
}

/**
 * The authority a role has over an action, straight from the matrix. Admin is
 * exempt and always answers "yes".
 */
export function getActionPermission(
    role: Role,
    action: ActionId
): ActionPermission {
    if (role === "Admin") return "yes";
    return ROLE_ACTIONS[action][role] ?? "no";
}

/**
 * Whether a role may carry an action out on its own. "yes" and "may be" both
 * count — "may be" is the role's own judgement — while "request" answers false
 * until an approval flow (not built yet) grants it.
 */
export function can(role: Role, action: ActionId): boolean {
    const permission = getActionPermission(role, action);
    return permission === "yes" || permission === "may be";
}

/** The sidebar routes a role may see, flattened in sidebar order. */
export function getAccessibleRoutes(role: Role): RouteItem[] {
    return SIDEBAR_ROUTES.flatMap((section) => section.items).filter((item) =>
        canAccessPath(role, item.path)
    );
}

/**
 * Sidebar sections with only the routes a role may see. Sections that end up
 * empty are dropped, so the sidebar never renders a heading with no items.
 */
export function getAccessibleSections(role: Role): SidebarSection[] {
    return SIDEBAR_ROUTES.map((section) => ({
        ...section,
        items: section.items.filter((item) => canAccessPath(role, item.path)),
    })).filter((section) => section.items.length > 0);
}
