/**
 * Single source of truth for the sidebar navigation hierarchy.
 *
 * Sections render in order, and items render in order inside each section.
 * Add a new screen by creating `app/<path>/page.tsx` and appending an entry here.
 */

/**
 * DOM id of the checkbox that opens the sidebar on small screens. The root
 * layout renders it and the Sidebar unchecks it, which is why the mobile
 * drawer needs no client-side state.
 */
export const SIDEBAR_TOGGLE_ID = "sidebar-toggle";

export type RouteItem = {
    /** Label shown in the sidebar */
    name: string;
    /** Absolute app route, e.g. "/inventory" */
    path: string;
    /** Short description used by placeholder screens */
    description?: string;
};

export type SidebarSection = {
    /** Section heading rendered above the items */
    section: string;
    items: RouteItem[];
};

export const SIDEBAR_ROUTES: SidebarSection[] = [
    {
        section: "Overview",
        items: [
            {
                name: "Dashboard",
                path: "/",
                description: "Ward meal flow, diet mix and compliance at a glance.",
            },
        ],
    },
    {
        section: "Clinical Nutrition",
        items: [
            {
                name: "Nutritional Assessments",
                path: "/assessments",
                description: "Capture screening, anthropometrics and malnutrition scores.",
            },
            {
                name: "Diet Plan Builder",
                path: "/diet-plan",
                description: "Build and adjust therapeutic diet plans per patient.",
            },
            {
                name: "Allergen & Preference",
                path: "/allergens",
                description: "Maintain allergen restrictions and patient food preferences.",
            },
        ],
    },
    {
        section: "Diet Orders & Kitchen",
        items: [
            {
                name: "Diet Orders",
                path: "/diet-orders",
                description: "Raise, approve and manage diet orders across wards.",
            },
            {
                name: "Kitchen Schedule",
                path: "/kitchen-schedule",
                description: "Plan production batches and kitchen manpower per slot.",
            },
            {
                name: "Meal Dispatch",
                path: "/meal-dispatch",
                description: "Mark prepared trays ready and dispatch them to wards.",
            },
            {
                name: "Bedside Delivery",
                path: "/bedside-delivery",
                description: "Track last-mile tray handover and confirmations.",
            },
        ],
    },
    {
        section: "Food Production",
        items: [
            {
                name: "Master Menu",
                path: "/mastermenu",
                description: "Approve the master dish list and cost per portion.",
            },
            {
                name: "Menu",
                path: "/menu",
                description: "Build daily patient and general menus per meal slot.",
            },
            {
                name: "Recipes",
                path: "/recipe",
                description: "Create recipes from inventory items and manage yields.",
            },
        ],
    },
    {
        section: "Analytics",
        items: [
            {
                name: "Plate Waste Analytics",
                path: "/plate-waste",
                description: "Monitor plate waste reasons and ward-wise trends.",
            },
        ],
    },
    {
        section: "Store & Compliance",
        items: [
            {
                name: "Inventory",
                path: "/inventory",
                description: "FIFO stock levels, expiry tracking and purchase orders.",
            },
            {
                name: "FSSAI Checklist",
                path: "/fssai-checklist",
                description: "Daily hygiene and food safety compliance checklist.",
            },
        ],
    },
    {
        section: "Food Services",
        items: [
            {
                name: "Cafeteria",
                path: "/cafeteria",
                description: "Manage cafeteria menu, pricing and sales.",
            },
            {
                name: "Tables",
                path: "/tables",
                description: "Take table orders for seated customers.",
            },
        ],
    },
];

/** Flat list of every navigable route. */
export const ALL_ROUTES: RouteItem[] = SIDEBAR_ROUTES.flatMap(
    (section) => section.items
);

/** Resolve the sidebar entry that owns a given pathname. */
export function findRouteByPath(pathname: string): RouteItem | undefined {
    return ALL_ROUTES.find((item) => item.path === pathname);
}