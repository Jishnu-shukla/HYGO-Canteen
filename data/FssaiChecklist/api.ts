import type {
    FssaichecklistSummary,
    GetFssaichecklist,
    UpdateFssaiChecklistStatusBody,
    UpdateFssaiChecklistStatusResponse,
} from "./type";

/**
 * GET /api/fssaichecklist/summary — audit totals, no query parameters.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getFssaiChecklistSummaryApi(): Promise<FssaichecklistSummary | null> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/fssaichecklist/summary"
        );

        if (!response.ok) {
            console.log(
                `getFssaiChecklistSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as FssaichecklistSummary;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * GET /api/fssaichecklist — every checklist, newest audit first, returned as a
 * bare array under `data` (no pagination envelope).
 */
export async function getFssaiChecklistApi(): Promise<GetFssaichecklist[] | null> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/fssaichecklist"
        );

        if (!response.ok) {
            console.log(
                `getFssaiChecklistApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as GetFssaichecklist[];
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * PUT /api/fssaichecklist/:checklist_id/toggle — sets the audit's review
 * status explicitly (Passed / Failed_Needs_Review / Resolved). Idempotent:
 * the client names the target status rather than flipping it.
 *
 * body.notes, when sent, persists as corrective_actions_notes alongside the
 * status; omitting it leaves the stored notes untouched (verified against the
 * service — it does not clear them).
 *
 * Returns the whole updated checklist row on success, so the caller can
 * re-render without a second GET. Null otherwise.
 */
export async function updateFssaiChecklistStatusApi(
    checklist_id: string,
    body: UpdateFssaiChecklistStatusBody
): Promise<UpdateFssaiChecklistStatusResponse | null> {
    try {
        const response = await fetch(
            `https://4jzhg556-5000.inc1.devtunnels.ms/api/fssaichecklist/${checklist_id}/toggle`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            console.log(
                `updateFssaiChecklistStatusApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as UpdateFssaiChecklistStatusResponse;
    } catch (error) {
        console.log(error);
        return null;
    }
}