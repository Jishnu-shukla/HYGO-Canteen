/* ------------------------------------------------------------------ *
 * GET /api/platewaste/summary
 * ------------------------------------------------------------------ */

/**
 * Plate-waste overview for the dashboard. No query parameters — all records,
 * no date filter, so this is a lifetime figure rather than a daily one.
 *
 * - avg_intake  mean intake_percentage across every plate-waste log, to 2
 *               decimal places. Typed as number and deliberately returns 0
 *               when nothing has been logged, so it can never be null — but
 *               note that 0 is therefore ambiguous: "every plate came back
 *               untouched" and "no plates logged" produce the same value.
 * - low_intake  distinct PATIENTS whose intake is at or below
 *               LOW_INTAKE_THRESHOLD_PERCENTAGE (25). Grouped by patient, so
 *               one patient who returned three poor meals today is counted
 *               once. Uses the same threshold and grouping rule as
 *               GET /api/bedsidedelivery/summary, so the two agree.
 * - diet_types  count of DISTINCT DietPlan diet types among the patients who
 *               have at least one plate-waste log — a measure of how broad
 *               the logged coverage is, not a breakdown. 0 when no logs exist.
 *
 * All three are computed from PlateWasteAnalytics, except diet_types which
 * joins to DietPlan on patient_id (both reference Paitent).
 */
export interface PlateWasteInterface {
    avg_intake: number;
    low_intake: number;
    diet_types: number;
}

/**
 * Intake % at or below which a patient counts toward low_intake.
 *
 * Named in the contract as a threshold shared with the bedside-delivery
 * summary; declared here so the card that states the rule interpolates the
 * same number the server uses.
 */
export const LOW_INTAKE_THRESHOLD_PERCENTAGE = 25;

/* ------------------------------------------------------------------ *
 * GET /api/platewaste/diettype
 * ------------------------------------------------------------------ */

export interface PlateWasteDietType {
    /** The diet type name, e.g. "Diabetic". */
    label: string;
    /** Intake percentage of distinct patients with that diet type. */
    value: number;
}

/**
 * GET /api/platewaste/diettype — chart payload.
 *
 * One row per diet type that has at least one plate-waste log, shaped as
 * { label, value } so the chart needs no transformation.
 *
 * value is a two-stage mean:
 *   1. each patient's logs are averaged into a single number, and
 *   2. those per-patient means are averaged for the diet type.
 *
 * That makes the patient the unit rather than the log — a patient recorded at
 * every meal does not outweigh one recorded once. It is deliberately NOT the
 * same as pooling every log for a diet type, which would produce a different
 * number whenever intake recording frequency varies between patients.
 *
 * Rows are sorted by value ascending (worst intake first), tie-broken
 * alphabetically by label so the order is stable between calls. Rounding is
 * monotone, so sorting on the unrounded mean preserves the displayed order.
 *
 * No date filter, matching GET /api/platewaste/summary.
 */
export interface PlateWasteDietTypeAndIntakePercentage {
    diet_types: PlateWasteDietType[];
}

/* ------------------------------------------------------------------ *
 * List
 * ------------------------------------------------------------------ */

/** GET /api/platewaste?page=1&limit=10 */
export interface GetPlateWasteQuery {
    /** 1-based. Defaults to 1. */
    page?: number;
    /** Page size. Defaults to 10, capped at 100. */
    limit?: number;
}

/**
 * One row of the record list — one plate-waste log, enriched with two derived
 * values so the table needs no second request.
 *
 * - diet_type        joined from the patient's NEWEST DietPlan (by createdAt),
 *                    not from the meal's order. A patient holding several
 *                    plans shows only their current prescription. Empty string
 *                    when the patient has no plan at all.
 * - intake_percentage the log's own value, 0-100.
 * - rejection_reason  the log's own value; empty string when none was given.
 * - low_intake       the number of DISTINCT low-intake PATIENTS within this
 *                    row's diet_type — patients holding at least one log at or
 *                    below LOW_INTAKE_THRESHOLD_PERCENTAGE (25) whose newest
 *                    plan is that same diet type. It is a per-diet-type figure
 *                    repeated on every row of that diet type, so all rows
 *                    carrying "Diabetic" show the same count. Planless rows
 *                    (diet_type "") count planless low-intake patients, which
 *                    keeps the grouping exhaustive.
 *
 * Deliberately absent: patient_id, order_id, ward_id, ward_name, notes
 * and logged_by_user_id. The identifiers are internal handles, the ward is not
 * on this table, and logged_by_user_id is hard-null until auth middleware
 * exists — so the projection cannot leak them if the schema grows later.
 */
export interface GetPlateWaste {
    diet_type: string;
    intake_percentage: number;
    rejection_reason: string;
    low_intake: number;
}

export interface PlateWastePagination {
    page: number;
    limit: number;
    /** Total matching rows across all pages. */
    total: number;
    total_pages: number;
}

/**
 * Every plate-waste record, newest first. No filters — the UI narrows the set
 * itself, matching the other list endpoints. createdAt desc (not a clinical
 * date) because a plate-waste log has no date of its own beyond when it was
 * filed; _id breaks ties so bulk-inserted rows keep a stable order.
 */
export interface GetPlateWasteResponse {
    data: GetPlateWaste[];
    pagination: PlateWastePagination;
}