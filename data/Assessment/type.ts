/**
 * Contracts for /api/assessments.
 *
 * Note the upstream misspelling "at_risk_paitent" — it is a wire value and is
 * reproduced verbatim rather than corrected.
 */

/* ------------------------------------------------------------------ *
 * Wire vocabularies
 * ------------------------------------------------------------------ */

/**
 * How nutrition is delivered. Defaults to "ORAL" when omitted.
 *
 * The casing is inconsistent upstream — "ORAL" is all-caps while the other
 * two are capitalised — and is reproduced verbatim rather than normalised,
 * since these are the stored values.
 */
export type RouteOfFeeding = "ORAL" | "Enteral" | "Parenteral";

/** Display order: least to most invasive. */
export const ROUTE_OF_FEEDING: readonly RouteOfFeeding[] = [
    "ORAL",
    "Enteral",
    "Parenteral",
] as const;

/**
 * The one number that decides "at risk".
 *
 * Mirrors the threshold named in the summary contract: 0-2 is low risk and 3+
 * is at risk. Held in a single constant so the table's filtering and the
 * at_risk_paitent card can never disagree.
 */
export const AT_RISK_THRESHOLD = 3;

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

/**
 * Nutritional-assessment overview. No query parameters — global totals.
 *
 * - total_assessments  every NutritionalAssessment record, including repeat
 *                      assessments of the same patient.
 * - at_risk_paitent    distinct patients whose MOST RECENT score is >= 3.
 *                      Counted per patient, so screening someone three times
 *                      does not triple the figure.
 * - avg_nrs            mean of those same latest scores, to 2 decimal places,
 *                      or null when no patient has a score recorded.
 *
 * The model stores nutritional_risk_score as a bare Number with no risk-level
 * field, so "at risk" is defined here as a score of 3 or above: 0-2 is treated
 * as low risk and 3+ as at risk. The threshold is the one number that decides
 * at_risk_paitent, so it lives in a single named constant in the service.
 */
export interface GetAssessmentSummaryResponse {
    total_assessments: number;
    /** Singular "paitent" is kept verbatim to match the endpoint's agreed contract. */
    at_risk_paitent: number;
    /** Mean latest NRS, or null when nothing has been scored yet. */
    avg_nrs: number | null;
}

/* ------------------------------------------------------------------ *
 * List
 * ------------------------------------------------------------------ */

/** GET /api/assessments?page=1&limit=10 */
export interface GetAssessmentsQuery {
    /** 1-based. Defaults to 1. */
    page?: number;
    /** Page size. Defaults to 10, capped at 100. */
    limit?: number;
}

/**
 * One row of the assessment list.
 *
 * patient_name and uhid are joined in from Paitent so the table needs no
 * second request.
 *
 * Deliberately absent: patient_id, dietitian_id, weight_kg, height_cm,
 * daily_protein_target_g, fluid_restriction_ml and the timestamps. The first
 * two are internal/audit fields and the rest are per-record detail the list has
 * no use for — all remain available on the create response and on a future
 * detail endpoint.
 */
export interface AssessmentListItem {
    /** Server-minted, e.g. "NA-000001". The row's handle for later edits. */
    assessment_id: string;
    /** Patient's business ID, e.g. "UHID-2026-0001". */
    uhid: string;
    /** Joined from Paitent via patient_id. */
    patient_name: string;
    /** ISO timestamp of the assessment itself, not of the record's creation. */
    assessment_date: string;
    /** Client-supplied body mass index, or null when not recorded. */
    bmi: number | null;
    /** NRS-2002 score 0-10, or null when the patient was never scored. */
    nutritional_risk_score: number | null;
    daily_caloric_target_kcal: number | null;
    route_of_feeding: RouteOfFeeding;
    clinical_notes: string;
}

/** Page metadata, so the UI can render a pager without a second request. */
export interface AssessmentPagination {
    page: number;
    limit: number;
    /** Total matching rows across all pages. */
    total: number;
    total_pages: number;
}

/**
 * All assessments across all patients, newest assessment first. No filters —
 * the UI narrows the set itself, matching the other list endpoints.
 */
export interface GetAssessmentsResponse {
    data: AssessmentListItem[];
    pagination: AssessmentPagination;
}

/* ------------------------------------------------------------------ *
 * Create
 * ------------------------------------------------------------------ */

/**
 * Body for creating one nutritional assessment.
 *
 * uhid identifies the patient, picked from the shared patient list used by the
 * diet-plan, diet-order and allergy-preference creates. No ObjectId is ever
 * accepted from the client.
 *
 * patient_name is display-only and is NOT persisted — the stored record holds
 * only patient_id. The name is read back from Paitent at response time, so a
 * stale or misspelled value here cannot corrupt the record.
 *
 * dietitian_id is intentionally absent: it is a Staff ref that auth middleware
 * will supply, so accepting it from a client today would let a caller forge who
 * performed the assessment. It persists as null until that middleware exists.
 *
 * Only uhid is required. Every clinical field is optional and falls back to the
 * schema default (null, or "ORAL" for the route), so a partial screening
 * record can still be filed.
 *
 * bmi is taken from the client rather than derived, so an externally-measured
 * value is preserved as-is. That also means it can disagree with weight_kg and
 * height_cm; nothing here recomputes or cross-checks it.
 */
export interface CreateAssessmentBody {
    /** Patient's business ID, e.g. "UHID-2026-0001". */
    uhid: string;
    /** Display-only; accepted for UI symmetry and then ignored. */
    patient_name?: string;
    /** ISO timestamp. Defaults to now when omitted. */
    assessment_date?: string;
    /** Body weight in kilograms. Must be >= 0. */
    weight_kg?: number;
    /** Height in centimetres. Must be >= 0. */
    height_cm?: number;
    /** Body mass index, as measured by the client. Must be >= 0. */
    bmi?: number;
    /** NRS-2002 score. Must be between 0 and 10 inclusive. */
    nutritional_risk_score?: number;
    /** Daily energy target in kcal. Must be >= 0. */
    daily_caloric_target_kcal?: number;
    /** Daily protein target in grams. Must be >= 0. */
    daily_protein_target_g?: number;
    /** Daily fluid limit in millilitres. Must be >= 0. */
    fluid_restriction_ml?: number;
    /** How nutrition is delivered. Defaults to "ORAL". */
    route_of_feeding?: RouteOfFeeding;
    /** Free-text clinician note. */
    clinical_notes?: string;
}

/** The created record, with patient_name resolved from Paitent. */
export interface CreateAssessmentResponse {
    /** Server-minted, e.g. "NA-000001". */
    assessment_id: string;
    uhid: string;
    /** Raw Mongo id of the patient. */
    patient_id: string;
    patient_name: string;
    /** ISO timestamp. */
    assessment_date: string;
    weight_kg: number | null;
    height_cm: number | null;
    bmi: number | null;
    /** Null when the patient has not been scored. */
    nutritional_risk_score: number | null;
    daily_caloric_target_kcal: number | null;
    daily_protein_target_g: number | null;
    fluid_restriction_ml: number | null;
    route_of_feeding: RouteOfFeeding;
    clinical_notes: string;
    /** Staff ObjectId, or null until auth middleware supplies it. */
    dietitian_id: string | null;
    /** ISO timestamp. */
    createdAt: string;
}