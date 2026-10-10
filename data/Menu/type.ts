/**
 * Contracts for /api/menu, mirroring models/types.ts on the backend.
 *
 * One endpoint serves two collections, discriminated by `type`:
 *   - "patient" -> PatientMenu  (diet-specific, keyed by date + diet_type)
 *   - "general" -> GeneralMenu  (cafeteria/staff, carries selling_price)
 *
 * Note: the backend exports the day list as `PAITENTMENU_DAYS` and the diet
 * list contains the upstream typo "High Protien". Both are reproduced verbatim
 * because they are wire values, not display copy.
 */

export const MEAL_TYPE = [
    "Breakfast",
    "Lunch",
    "Snack",
    "Dinner",
    "N/A",
] as const;
export type MealSlot = (typeof MEAL_TYPE)[number];

export const DIET_TYPE = [
    "Normal",
    "Diabetic",
    "Renal",
    "Low Sodium",
    "Soft",
    "Liquid",
    "High Protien",
    "NPO",
] as const;
export type DietType = (typeof DIET_TYPE)[number];

export const PAITENTMENU_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
] as const;
export type MenuDay = (typeof PAITENTMENU_DAYS)[number];

export type MenuType = "patient" | "general";

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

export interface MenuMasterItem {
    master_item_id: string;
    recipe_id: string | null;
    recipe_name: string;
    price: number;
}

export interface PatientMenu {
    menu_id: string;
    date: string;
    day_of_week: MenuDay[];
    meal_slot: MealSlot;
    diet_type: DietType;
    portion_size: string;
    items: MenuMasterItem[];
}

export interface GeneralMenu {
    menu_id: string;
    meal_slot: MealSlot;
    day_of_week: MenuDay[];
    is_available: boolean;
    /** Items paired with their per-item price. */
    items: Array<MenuMasterItem & { selling_price: number }>;
}

/** Either collection, narrowed by the requested `type`. */
export type MenuList = PatientMenu[] | GeneralMenu[];

/**
 * Flat distinct-item picker for the diet_plan screen (the disallowed-items
 * multi-select), returned by GET /api/menu?type=patient&expanded=true.
 *
 * One row per distinct MasterMenuItem *per meal slot* — meal_slot lives on
 * PatientMenuItem, not MasterMenuItem, so an item served at both Lunch and
 * Dinner is returned as two rows. Within a slot an item appearing on twenty
 * menus still collapses to one row.
 *
 * master_item_id / recipe_id / recipe_name / price are the same DTO as
 * PatientMenu["items"], so the screen renders those fields identically.
 */
export interface PatientMenuPickItem extends MenuMasterItem {
    /** Which meal this item appears on, per the menus referencing it. */
    meal_slot: MealSlot;
}

/** GET /api/menu?type=...&date=...&diet_type=...&meal_slot=...&day_of_week=...&is_available=... */
export interface GetMenusQuery {
    /** Required — picks the backing collection. */
    type: MenuType;
    /** Patient menus only. ISO date, e.g. "2026-09-30". */
    date?: string;
    /** Patient menus only. */
    diet_type?: DietType;
    meal_slot?: MealSlot;
    /** General menus only. */
    is_available?: boolean;
    /**
     * Patient menus only. Collapses the day/diet menus into one row per
     * distinct item per meal slot — the shape PatientMenuPickItem describes.
     */
    expanded?: boolean;
    page?: number;
    limit?: number;
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

/** A master item reference as sent by the client — always the business ID string, never an ObjectId. */
export interface MasterItemRef {
    master_item_id: string;
}

export interface CreatePatientMenuBody {
    type: "patient";
    /** ISO date string; server converts to Date. */
    date: string;
    meal_slot: MealSlot;
    diet_type: DietType;
    day_of_week?: MenuDay[];
    portion_size?: string;
    items?: MasterItemRef[];
}

export interface CreateGeneralMenuBody {
    type: "general";
    meal_slot: MealSlot;
    day_of_week?: MenuDay[];
    is_available?: boolean;
    /** Paired so the client never has to keep two arrays index-aligned. */
    items: Array<MasterItemRef & { selling_price: number }>;
}

export type CreateMenuBody = CreatePatientMenuBody | CreateGeneralMenuBody;

export interface CreateMenuResponse {
    type: MenuType;
    menu: PatientMenu | GeneralMenu;
}
