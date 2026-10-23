import type { ActionId, ActionPermission, Role } from "@/Roles";

/**
 * The words the Settings screen uses for the matrix.
 *
 * `Roles.ts` holds the matrix as ids because that is what code compares.
 * Here they become sentences an admin can act on: what the action is called,
 * and the screen it lives on.
 */

/** One row of the action matrix, as the screen shows it. */
export type ActionLabel = {
    /** What the action is called on screen. */
    label: string;
    /** The screen(s) the action belongs to. */
    screen: string;
};

export const ACTION_LABELS: Record<ActionId, ActionLabel> = {
    viewDashboard: { label: "View dashboard", screen: "Dashboard" },
    manageAssessments: {
        label: "Manage assessments",
        screen: "Nutritional Assessments",
    },
    changePatientDiet: {
        label: "Change patient diet",
        screen: "Diet Plan Builder",
    },
    manageAllergens: {
        label: "Manage allergens",
        screen: "Allergen & Preference",
    },
    manageDietOrders: { label: "Manage diet orders", screen: "Diet Orders" },
    planKitchenSchedule: {
        label: "Plan kitchen schedule",
        screen: "Kitchen Schedule",
    },
    dispatchDeliveryMeal: {
        label: "Dispatch and deliver meals",
        screen: "Meal Dispatch, Bedside Delivery",
    },
    manageRecipes: { label: "Manage recipes", screen: "Recipes" },
    manageMenus: { label: "Manage menus", screen: "Menu" },
    approveMasterMenu: {
        label: "Approve master menu",
        screen: "Master Menu",
    },
    viewPlateWaste: {
        label: "View plate waste",
        screen: "Plate Waste Analytics",
    },
    adjustInventory: { label: "Adjust inventory", screen: "Inventory" },
    manageFssaiChecklist: {
        label: "Manage FSSAI checklist",
        screen: "FSSAI Checklist",
    },
    registerTable: {
        label: "Register tables",
        screen: "Cafeteria, Tables",
    },
    placeTableOrder: { label: "Place table orders", screen: "Tables" },
    settleCafeteriaBill: {
        label: "Settle cafeteria bills",
        screen: "Cafeteria",
    },
    manageSettings: {
        label: "Manage settings",
        screen: "Settings",
    },
};

/** What each permission means, in the words the matrix itself uses. */
export type PermissionOption = {
    value: ActionPermission;
    label: string;
    hint: string;
};

export const PERMISSION_OPTIONS: readonly PermissionOption[] = [
    {
        value: "yes",
        label: "Yes",
        hint: "Acts freely, without asking anyone.",
    },
    {
        value: "may be",
        label: "May be",
        hint: "Acts on the role's own judgement.",
    },
    {
        value: "request",
        label: "Request",
        hint: "Must be approved by someone else first.",
    },
    {
        value: "no",
        label: "No",
        hint: "No access at all.",
    },
];

/** Tailwind classes for the permission badge and the select that writes it. */
export const PERMISSION_STYLES: Record<
    ActionPermission,
    { badge: string; select: string }
> = {
    yes: {
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        select:
            "border-emerald-200 bg-emerald-50 text-emerald-700 focus:border-emerald-400 focus:ring-emerald-500/20",
    },
    "may be": {
        badge: "bg-amber-50 text-amber-700 ring-amber-200",
        select:
            "border-amber-200 bg-amber-50 text-amber-700 focus:border-amber-400 focus:ring-amber-500/20",
    },
    request: {
        badge: "bg-sky-50 text-sky-700 ring-sky-200",
        select:
            "border-sky-200 bg-sky-50 text-sky-700 focus:border-sky-400 focus:ring-sky-500/20",
    },
    no: {
        badge: "bg-slate-100 text-slate-500 ring-slate-200",
        select:
            "border-slate-200 bg-slate-50 text-slate-600 focus:border-slate-400 focus:ring-slate-500/20",
    },
};

/** One line on what each role is for, shown above the role's screens. */
export const ROLE_SUMMARIES: Record<Role, string> = {
    Admin: "Reaches every screen and is the approver.",
    "Kitchen Manager":
        "Runs the kitchen: schedule, dispatch, menus, recipes.",
    Supervisor: "The widest scope below Admin, across every department.",
    Dietitian: "Clinical nutrition: assessments, plans and allergens.",
    Nurse: "Diet orders and bedside delivery; requests diet changes.",
    "Store Keeper": "Inventory, FSSAI checks and a say on menu approval.",
    Cashier: "Cafeteria bills and table orders.",
};

/**
 * The short form of a role name.
 *
 * The matrix has seven role columns and the header has to fit without
 * wrapping into two lines; the full name stays available as the cell's title.
 */
export const ROLE_SHORT: Record<Role, string> = {
    Admin: "Admin",
    "Kitchen Manager": "Kitchen Mgr",
    Supervisor: "Supervisor",
    Dietitian: "Dietitian",
    Nurse: "Nurse",
    "Store Keeper": "Store Keeper",
    Cashier: "Cashier",
};
