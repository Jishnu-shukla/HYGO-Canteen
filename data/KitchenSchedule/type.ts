import type { DietType, MealSlot } from "@/data/Menu/type";

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

/**
 * GET /api/kitchenschedule/summary
 *
 * Today's kitchen workload, counted off DietOrder.
 *
 * No query parameters — this is a scoped report on today, matching the
 * "today" semantics of dashboard.service and bedsideDelivery.service.
 *
 * KitchenSchedule itself carries no order/ward/patient data (only the meal
 * slot, the assigned chef and the menu items to cook), so the counts are
 * derived from the orders scheduled today rather than from the schedule rows:
 * - total_orders    orders scheduled today. Cancelled orders are excluded,
 *                   since the kitchen no longer prepares them.
 * - total_wards     distinct wards across those orders. Orders with no
 *                   ward_name are ignored, so a blank ward is not counted
 *                   as a ward of its own.
 * - total_patients  distinct patients across those orders, grouped by
 *                   patient_id so a patient with several meals today
 *                   counts once.
 * - meal_slots      orders scheduled today, broken down by meal slot. Only
 *                   slots with a non-cancelled order appear, so a missing
 *                   slot counts as zero.
 */
export interface GetKitchenScheduleSummaryResponse {
    total_orders: number;
    total_wards: number;
    total_patients: number;
    meal_slots: Partial<Record<MealSlot, number>>;
}

/**
 * Orders per ward within a single meal_slot × diet_type cell:
 * { "General Ward": 2, "ICU": 3 } — ward_name -> order count.
 *
 * Object.keys(cell).length is therefore the distinct ward count for that
 * cell. Orders with no ward_name are left out, matching the summary's
 * total_wards, so a blank ward is not reported as a ward of its own.
 */
export type KitchenScheduleWardCounts = Record<string, number>;

/**
 * One row of the meal_slot × diet_type pivot: a meal slot and, for each diet
 * type served in it, the per-ward order counts.
 *
 * Orders with no linked diet plan have no diet_type, so they cannot sit in a
 * column and are left out of the pivot.
 */
export interface KitchenScheduleOrderRow {
    meal_slot: MealSlot;
    /**
     * Ward breakdown per diet type for this slot. Keys are a subset of
     * DIET_TYPE, in DIET_TYPE order; a diet type missing from the map has no
     * orders in this slot (read it as 0).
     */
    diet_types: Partial<Record<DietType, KitchenScheduleWardCounts>>;
}

/**
 * GET /api/kitchenschedule/orders
 *
 * The full pivot: one row per meal slot that has orders today, in MEAL_TYPE
 * order. Cancelled orders are excluded, matching GET /api/kitchenschedule/summary.
 *
 * Empty meal slots are omitted rather than returned as all-zero rows; the
 * client renders a missing row/cell as 0.
 */
export type GetKitchenScheduleOrdersResponse = KitchenScheduleOrderRow[];
