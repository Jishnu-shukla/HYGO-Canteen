/* ------------------------------------------------------------------ *
 * GET /api/fssaichecklist/summary
 * ------------------------------------------------------------------ */

/**
 * FSSAI audit overview. No query parameters, no date filter.
 *
 * - hygiene_score     the LATEST checklist's own score (0-100), taken by
 *                     audit_date desc — current standing, not an average.
 *                     Mirrors dashboard.service.getLatestFssaiChecklist(), so
 *                     GET /dashboard and this endpoint report the same number.
 *                     Returns 0 when no checklist has been filed, which is
 *                     ambiguous: a real score of 0 cannot be told apart from
 *                     "no audits yet" because the field is a plain number.
 *
 * - passed_categories checks passed, summed across EVERY checklist.
 *   failed_categories checks failed, summed the same way.
 *
 *   Invariant: passed_categories + failed_categories === 5 × number of
 *   checklists. That is the assertion to test a service implementation
 *   against, and it fails loudly if a check is double-counted or skipped.
 *
 * The 5 checks summed, and what counts as a pass:
 *
 * | field                   | type            | pass       |
 * |-------------------------|-----------------|------------|
 * | cold_storage_temp_ok    | Boolean         | true       |
 * | pest_control_checked    | "Pass" / "Fail" | "Pass"     |
 * | water_potability_tested | "Pass" / "Fail" | "Pass"     |
 * | staff_hygiene_compliance| "Pass" / "Fail" | "Pass"     |
 * | expired_goods_removed   | Boolean         | true       |
 *
 * false on either Boolean counts as a FAIL, even though both schema fields
 * default to false. A record where the inspector answered only the three
 * Pass/Fail questions therefore contributes 2 failures nobody explicitly
 * assessed — that is the schema's default reading as "not done", not a
 * calculation error in the summary.
 *
 * Deliberately absent: status (Passed / Failed_Needs_Review / Resolved),
 * shift, audit_date, checklist_id, inspector_id and
 * corrective_actions_notes. Status counts and per-audit detail belong to a
 * list endpoint; the summary reports the two scores and the category split.
 */
export interface FssaichecklistSummary {
    /** Latest checklist's hygiene score, 0-100. 0 when no checklist exists. */
    hygiene_score: number;
    /** Checks passed across all checklists; part of the invariant above. */
    passed_categories: number;
    /** Checks failed across all checklists; part of the invariant above. */
    failed_categories: number;
}

/* ------------------------------------------------------------------ *
 * GET /api/fssaichecklist
 * ------------------------------------------------------------------ */

/**
 * One of the 5 audited checks, as returned.
 *
 * Narrowed to string-literal unions rather than left as plain string, so a
 * mistyped result ("Passed") or an unknown category fails to typecheck
 * instead of reaching the UI.
 */
export type FssaiChecklistCategory =
    | "cold_storage_temp_ok"
    | "pest_control_checked"
    | "water_potability_tested"
    | "staff_hygiene_compliance"
    | "expired_goods_removed";

/** Audit shift, recorded on staff_hygiene_compliance only. */
export type FssaiShift = "Morning" | "Afternoon" | "Evening" | "Night";

/** "Pass" or "Fail" — all five checks share one result type. */
export type FssaiCategoryResult = "Pass" | "Fail";

export interface FssaiChecklist {
    category: FssaiChecklistCategory;
    /** Present on staff_hygiene_compliance only. */
    shift?: FssaiShift;
    result: FssaiCategoryResult;
}

/**
 * One checklist row.
 *
 * The list orders on audit_date desc with _id as tie-break — the same rule
 * GET /api/fssaichecklist/summary and GET /api/dashboard use to pick the
 * "latest" checklist, so this list's first row and those endpoints cannot
 * disagree about which audit is current.
 *
 * This shape doubles as the response of PUT /:checklist_id/toggle — see
 * UpdateFssaiChecklistStatusResponse, which aliases it rather than restating
 * it, so the list and write contracts cannot drift apart.
 *
 * Deliberately absent: inspector_id (a raw ObjectId into a users collection
 * that has no name to join to yet) and the timestamps.
 */
export interface GetFssaichecklist {
    /**
     * Server-minted business ID (ITEM-000001 style), never client-supplied.
     * No generateId counter key exists for it yet — that lands with the POST
     * endpoint, which is not built.
     */
    checklist_id: string;
    /**
     * Review status, "Passed" by schema default. Part of the row on every
     * read and on the toggle response — the UI no longer has to track it
     * client-side.
     */
    status: FssaiChecklistStatus;
    /** Exactly 5 entries, one per FSSAI check — enforced at write time. */
    categories: FssaiChecklist[];
    /** 0-100, as recorded on the audit. */
    hygiene_score: number;
    /** ISO date string of the audit itself, not of when the row was filed. */
    audit_date: string;
    /** ISO string; "" when the inspector recorded no corrective action. */
    corrective_actions_notes: string;
}

/**
 * GET /api/fssaichecklist — every checklist, newest audit first.
 *
 * A bare array rather than the { data, pagination } envelope the paginated
 * list endpoints use, and there are no ?page / ?limit parameters to define:
 * checklists are filed once per audit instead of per patient or per meal, so
 * the set stays small enough for the UI to render whole.
 *
 * The HTTP body reads { statusCode, message, data: [...], success } — the
 * same shape GET /api/mastermenu returns.
 */

/* ------------------------------------------------------------------ *
 * PUT /api/fssaichecklist/:checklist_id/toggle
 * ------------------------------------------------------------------ */

/**
 * Review status of an audit. The schema default is "Passed". Carried on
 * every checklist row — the list read and the toggle response both include
 * it — so the UI reads it from the row and only refreshes it from the
 * write endpoint's response.
 */
export type FssaiChecklistStatus =
    | "Passed"
    | "Failed_Needs_Review"
    | "Resolved";

/**
 * Body for the status write. status is required and must be one of
 * FSSAI_CHECKLIST_STATUSES: Passed, Failed_Needs_Review, Resolved.
 *
 * notes is optional free text written to the row's
 * corrective_actions_notes field in the same update as the status — the
 * corrective actions recorded against the new state, not a display-only field.
 *
 * Despite the route's /toggle name this is an explicit set, not a flip — the
 * client names the target status, so two identical PUTs are idempotent and
 * leave the row where it is rather than bouncing it back and forth. A true
 * toggle would ignore the body and invert the stored value.
 */
export interface UpdateFssaiChecklistStatusBody {
    status: FssaiChecklistStatus;
    /**
     * Corrective-action notes to persist as corrective_actions_notes.
     * Optional: a pass with no follow-up needed carries no notes. The
     * implication of omitting the key — preserve whatever is stored, or clear
     * it to "" — is decided by the service, not this contract.
     */
    notes?: string;
}

/**
 * The whole updated checklist — the same shape as a list row, not just the new
 * status — so the caller can re-render the row without a second GET.
 *
 * Aliased rather than redeclared: the endpoint changes one field, and
 * restating the other five would let the two contracts drift apart.
 */
export type UpdateFssaiChecklistStatusResponse = GetFssaichecklist;