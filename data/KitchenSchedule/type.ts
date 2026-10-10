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
 * slot, the assigned chef and the menu items to cook), so the three counts are
 * derived from the orders scheduled today rather than from the schedule rows:
 * - total_orders    orders scheduled today. Cancelled orders are excluded,
 *                   since the kitchen no longer prepares them.
 * - total_wards     distinct wards across those orders. Orders with no
 *                   ward_name are ignored, so a blank ward is not counted
 *                   as a ward of its own.
 * - total_patients  distinct patients across those orders, grouped by
 *                   patient_id so a patient with several meals today
 *                   counts once.
 */
export interface GetKitchenScheduleSummaryResponse {
    total_orders: number;
    total_wards: number;
    total_patients: number;
}
