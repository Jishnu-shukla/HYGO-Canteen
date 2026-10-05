import type {
    CreateAssessmentBody,
    CreateAssessmentResponse,
    GetAssessmentSummaryResponse,
} from "./type";

/**
 * GET /api/assessments/summary — global totals, no query parameters.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getAssessmentSummaryApi(): Promise<GetAssessmentSummaryResponse | null> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/assessments/summary"
        );

        if (!response.ok) {
            console.log(
                `getAssessmentSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as GetAssessmentSummaryResponse;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * POST /api/assessments — creates one nutritional assessment.
 *
 * Unlike the summary getter this throws on failure, because a swallowed error
 * here would let the form report success for a record that was never stored.
 */
export async function createAssessmentApi(
    body: CreateAssessmentBody
): Promise<CreateAssessmentResponse> {
    const response = await fetch(
        "https://4jzhg556-5000.inc1.devtunnels.ms/api/assessments",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        // Surfaces the backend's own validation message, which is far more
        // useful than a bare status to show the clinician.
        const detail = await response.text().catch(() => "");

        throw new Error(
            `Failed to save assessment (${response.status})${
                detail ? `: ${detail}` : ""
            }`
        );
    }

    const jsonData = await response.json();

    return (jsonData.data ?? jsonData) as CreateAssessmentResponse;
}