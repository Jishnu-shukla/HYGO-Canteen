/**
 * Single source of truth for roles and role-based access.
 *
 * The app has no auth yet, so "access" here means which routes a role may
 * open. The header's role picker and (once wired) the sidebar both read from
 * this file, so they cannot disagree about who sees what.
 *
 * The mapping is data, not logic: add a role by appending to ROLES and giving
 * it an entry below; add a route by listing its path. Admin is exempt and
 * reaches everything.
 */

import { SIDEBAR_ROUTES, type RouteItem, type SidebarSection } from "./routes";

/** Every assignable role. The dietitian role is intentionally excluded. */
export const ROLES = [
    "Admin",
    "Kitchen Manager",
    "Supervisor",
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
 * Defaults follow the job each role does — the kitchen and store roles see
 * production and stock screens, the nurse sees orders and delivery, the
 * cashier sees the POS. Adjust freely; this is the one place to change it.
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
        "/inventory",
        "/fssai-checklist",
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
    Nurse: ["/", "/diet-orders", "/bedside-delivery"],
    "Store Keeper": ["/", "/inventory", "/fssai-checklist", "/mastermenu"],
    Cashier: ["/", "/cafeteria", "/tables"],
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
