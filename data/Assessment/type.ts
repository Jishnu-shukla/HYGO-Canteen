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