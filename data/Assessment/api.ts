import type {
    AssessmentPagination,
    CreateAssessmentBody,
    CreateAssessmentResponse,
    GetAssessmentSummaryResponse,
    GetAssessmentsQuery,
    GetAssessmentsResponse,
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

/** Page size used by the table's pager. */
export const ASSESSMENT_PAGE_SIZE = 10;

export const EMPTY_ASSESSMENT_PAGINATION: AssessmentPagination = {
    page: 1,
    limit: ASSESSMENT_PAGE_SIZE,
    total: 0,
    total_pages: 1,
};

/**
 * Builds a single-page fallback when the server sends no `pagination` block,
 * so the pager degrades to "everything on page 1" instead of empty pages.
 */
function fallbackPagination(page: number, limit: number, rowCount: number) {
    return { page, limit, total: rowCount, total_pages: 1 };
}

/**
 * GET /api/assessments?page=&limit= — newest assessment first, no filters.
 *
 * Returns the page's rows plus the server's pagination block. When no block
 * arrives, falls back to a single page containing every row.
 */
export async function getAssessmentsApi(
    query: GetAssessmentsQuery = {}
): Promise<GetAssessmentsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? ASSESSMENT_PAGE_SIZE;

    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    try {
        const response = await fetch(
            `https://4jzhg556-5000.inc1.devtunnels.ms/api/assessments?${params.toString()}`
        );

        if (!response.ok) {
            console.log(
                `getAssessmentsApi failed: ${response.status} ${response.statusText}`
            );
            return { data: [], pagination: EMPTY_ASSESSMENT_PAGINATION };
        }

        const jsonData = await response.json();

        // The paginated response comes back doubly nested
        // ({ data: { data, pagination } }), same as the diet-order and
        // allergy-preference lists, while other endpoints put rows straight on
        // `data`. Accept either.
        const payload = jsonData.data;
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        const pagination: AssessmentPagination =
            payload?.pagination ?? EMPTY_ASSESSMENT_PAGINATION;

        const hasMeta =
            pagination !== EMPTY_ASSESSMENT_PAGINATION &&
            typeof pagination?.total_pages === "number";

        return {
            data: rows as GetAssessmentsResponse["data"],
            pagination: hasMeta
                ? pagination
                : fallbackPagination(page, limit, rows.length),
        };
    } catch (error) {
        console.log(error);
        return { data: [], pagination: EMPTY_ASSESSMENT_PAGINATION };
    }
}