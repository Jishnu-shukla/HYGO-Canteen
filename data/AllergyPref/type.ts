/**
 * Contracts for /api/allergypref.
 *
 * Note the upstream misspelling "paitents_count" — it is a wire value and is
 * reproduced verbatim rather than corrected.
 */

/* ------------------------------------------------------------------ *
 * Wire vocabularies
 * ------------------------------------------------------------------ */

/** How serious the recorded allergy is. Defaults to "Mild" when omitted. */
export type AllergySeverity = "Mild" | "Moderate" | "Severe_Anaphylaxis";

/**
 * One religious or dietary practice the patient follows.
 *
 * "Vegetarian" is the schema default and the implicit baseline the summary's
 * cultural_pref metric excludes, so it is deliberately included here — a
 * patient recorded as vegetarian still needs the fact recorded.
 */
export type ReligiousDietaryRestriction =
    | "Halal"
    | "Kosher"
    | "Jain"
    | "Vegetarian"
    | "Vegan";

/** Display order for the severity select, mildest first. */
export const ALLERGY_SEVERITY: readonly AllergySeverity[] = [
    "Mild",
    "Moderate",
    "Severe_Anaphylaxis",
] as const;

/** Display order for the restriction select, baseline first. */
export const RELIGIOUS_DIETARY_RESTRICTION: readonly ReligiousDietaryRestriction[] =
    ["Vegetarian", "Vegan", "Halal", "Kosher", "Jain"] as const;

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

/**
 * Allergy and dietary-restriction overview. No query parameters — global totals.
 *
 * - paitents_count  every patient in the Paitent collection, whether or not
 *                   they have a preference record. Makes with_allergens a
 *                   meaningful subset rather than a total on its own.
 * - with_allergens  distinct patients with a non-empty allergies array.
 *                   Same definition as with_allergens in
 *                   GET /api/dietplan/summary, so the two endpoints agree.
 * - cultural_pref   distinct patients with at least one
 *                   religious_dietary_restrictions entry that is NOT
 *                   "Vegetarian". "Vegetarian" is treated as the implicit
 *                   baseline, so a patient recorded as Vegetarian-only — or
 *                   with no restriction at all — is not counted.
 *
 *                   The schema stores religious_dietary_restrictions as an
 *                   array, but this metric is a per-patient scalar: a patient
 *                   with ["Halal", "Kosher"] still counts as exactly 1.
 */
export interface GetAllergyPrefSummaryResponse {
    paitents_count: number;
    with_allergens: number;
    cultural_pref: number;
}

/* ------------------------------------------------------------------ *
 * List
 * ------------------------------------------------------------------ */

/** GET /api/allergypref?page=1&limit=10 */
export interface GetAllergyPrefsQuery {
    /** 1-based. Defaults to 1. */
    page?: number;
    /** Page size. Defaults to 10, capped at 100. */
    limit?: number;
}

/**
 * One row of the allergy-preference list.
 *
 * allergies, intolerances and religious_dietary_restrictions are the
 * clinical payload the table shows. uhid and patient_name are joined in from
 * Paitent so the row needs no second request.
 *
 * Deliberately absent: prescribed_by, logged_by, is_menu_default,
 * extra_notes and the timestamps. The first two are Staff audit fields, and
 * the rest are per-record detail the list has no use for — all remain available
 * on the create response and on a future detail endpoint.
 */
export interface AllergyPrefListItem {
    /** Server-minted, e.g. "AP-000001". The row's handle for later edits. */
    allergy_preference_id: string;
    /** Patient's business ID, e.g. "UHID-2026-0001". */
    uhid: string;
    /** Joined from Paitent via patient_id. */
    patient_name: string;
    /** Single free-text allergy, or "" when none is recorded. */
    allergies: string;
    /** Single free-text intolerance, or "" when none is recorded. */
    intolerances: string;
    severity: AllergySeverity;
    /**
     * Empty string is possible only on pre-existing records; see the create
     * response.
     *
     * Note the server has been observed returning "Non-Vegetarian", which is
     * not a member of ReligiousDietaryRestriction. The declared union is kept
     * as the contract for what the create form may send; consumers must render
     * unknown values as their raw string.
     */
    religious_dietary_restrictions: ReligiousDietaryRestriction | "";
}

/** Page metadata, so the UI can render a pager without a second request. */
export interface AllergyPrefPagination {
    page: number;
    limit: number;
    /** Total matching rows across all pages. */
    total: number;
    total_pages: number;
}

/**
 * All allergy preferences, newest record first. No filters — the UI narrows the
 * set itself, matching GET /api/dietorder and GET /api/dietplan.
 */
export interface GetAllergyPrefsResponse {
    data: AllergyPrefListItem[];
    pagination: AllergyPrefPagination;
}

/* ------------------------------------------------------------------ *
 * Create
 * ------------------------------------------------------------------ */

/**
 * Body for creating one allergy preference record.
 *
 * uhid identifies the patient; no ObjectId is ever accepted from the client.
 *
 * patient_name is display-only and is NOT persisted — the stored record holds
 * only patient_id. The name is read back from Paitent at response time, so a
 * stale or misspelled value in this body cannot corrupt the record. This
 * mirrors the diet-order and diet-plan create bodies.
 *
 * prescribed_by and logged_by are intentionally absent: both are Staff refs
 * that auth middleware will supply, so accepting them from a client today would
 * let a caller forge who prescribed a record. They persist as null until that
 * middleware exists.
 *
 * Every field other than uhid is optional and falls back to the schema
 * default, so a record can be created as a bare "no known allergies" stub.
 */
export interface CreateAllergyPrefBody {
    /** Patient's business ID, e.g. "UHID-2026-0001". */
    uhid: string;
    /** Display-only; accepted for UI symmetry and then ignored. */
    patient_name?: string;
    /** Single free-text allergy, e.g. "Peanuts". Empty string means none. */
    allergies?: string;
    /** Single free-text intolerance, e.g. "Lactose". Empty string means none. */
    intolerances?: string;
    /** Defaults to "Mild" when omitted. */
    severity?: AllergySeverity;
    /** One restriction, or omit for "Vegetarian" (the schema default). */
    religious_dietary_restrictions?: ReligiousDietaryRestriction;
    /** Free-text clinician note. */
    extra_notes?: string;
    /** Whether the kitchen should apply this as the standing default. */
    is_menu_default?: boolean;
}

/** The created record, with patient_name resolved from Paitent. */
export interface CreateAllergyPrefResponse {
    /** Server-minted, e.g. "AP-000001". */
    allergy_preference_id: string;
    uhid: string;
    /** Raw Mongo id of the patient. */
    patient_id: string;
    patient_name: string;
    allergies: string;
    intolerances: string;
    severity: AllergySeverity;
    religious_dietary_restrictions: ReligiousDietaryRestriction | "";
    extra_notes: string;
    is_menu_default: boolean;
    /** Staff ObjectId, or null until auth middleware supplies it. */
    prescribed_by: string | null;
    /** Staff ObjectId, or null until auth middleware supplies it. */
    logged_by: string | null;
    /** ISO timestamp. */
    createdAt: string;
}
