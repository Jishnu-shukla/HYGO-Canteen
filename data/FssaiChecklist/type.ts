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
 * Audit shift.
 *
 * No longer part of the list read — the response now carries a single free-text
 * category instead of the five per-check entries — but kept exported because
 * the kitchen schedule draws its own shift labels from the same vocabulary.
 */
export type FssaiShift = "Morning" | "Afternoon" | "Evening" | "Night";

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
     * Workflow state. PUT .../toggle sets it (required) and may also write
     * corrective_actions_notes from the body's optional notes. Defaults to
     * "Passed" on creation, so a row leaves Passed only when someone sends
     * this endpoint a different status.
     */
    status: FssaiChecklistStatus;
    /**
     * The category the inspector entered. Free text rather than one of a fixed
     * set, so a client may send any name it likes.
     */
    categories: string;
    /** 0-100, as recorded on the audit. */
    hygiene_score: number;
    /** ISO date string of the audit itself, not of when the row was filed. */
    audit_date: string;
    /** Free text; "" when the inspector recorded no corrective action. */
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
 * This is the argument handed to ApiResponse, so the HTTP body reads
 * { statusCode, message, data: [...], success } — the same shape
 * GET /api/mastermenu returns.
 */
export type GetFssaichecklistResponse = GetFssaichecklist[];

/* ------------------------------------------------------------------ *
 * POST /api/fssaichecklist
 * ------------------------------------------------------------------ */

/**
 * Body for creating one checklist.
 *
 * The FssaiChecklist document is NOT a mirror of this body. The service owns
 * every field this interface omits, so a client can neither forge them nor
 * leave the document invalid:
 *
 *   - checklist_id  minted via generateId("FSSAI_CHECKLIST_ID", "FSSAI")
 *                   ("FSSAI-000001" style) — never client-supplied.
 *   - inspector_id  a throwaway ObjectId: it is a Staff/User ref that auth
 *                   middleware will supply, so accepting it today would let a
 *                   caller forge who filed the audit.
 *   - status        always starts at "Passed" (the schema default). It is
 *                   changed only through PUT .../toggle.
 *   - audit_date    defaults to now when omitted; send it to file an audit for
 *                   an earlier date.
 *   - corrective_actions_notes  defaults to "".
 */
export interface CreateFssaiChecklistBody {
    /**
     * The category audited — free text, any name the client sends rather than
     * one of a fixed set. Required and non-blank.
     */
    categories: string;
    /** Hygiene score; the schema bounds it to 0-100. Required. */
    hygiene_score: number;
    /** ISO date string of the audit itself. Defaults to now when omitted. */
    audit_date?: string;
    /** Free-text corrective action. Defaults to "" when omitted. */
    corrective_actions_notes?: string;
}

/**
 * The created checklist — the same row shape GET /api/fssaichecklist returns,
 * so the list can render it without a second request. Aliased rather than
 * redeclared so the two contracts cannot drift apart.
 *
 * inspector_id is absent for the same reason it is absent from a list row: it
 * is a raw ObjectId into a users collection that has no name to join to yet,
 * and the placeholder the service minted carries no meaning to the caller.
 */
export type CreateFssaiChecklistResponse = GetFssaichecklist;

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