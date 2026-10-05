import type {
    AllergyPrefPagination,
    CreateAllergyPrefBody,
    CreateAllergyPrefResponse,
    GetAllergyPrefSummaryResponse,
    GetAllergyPrefsQuery,
    GetAllergyPrefsResponse,
} from "./type";

/**
 * GET /api/allergypref/summary — global totals, no query parameters.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getAllergyPrefSummaryApi(): Promise<GetAllergyPrefSummaryResponse | null> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/allergypref/summary"
        );

        if (!response.ok) {
            console.log(
                `getAllergyPrefSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as GetAllergyPrefSummaryResponse;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * POST /api/allergypref — creates one allergy preference record.
 *
 * Unlike the summary getter this throws on failure, because a swallowed error
 * here would let the form report success for a record that was never stored.
 */
export async function createAllergyPrefApi(
    body: CreateAllergyPrefBody
): Promise<CreateAllergyPrefResponse> {
    const response = await fetch(
        "https://4jzhg556-5000.inc1.devtunnels.ms/api/allergypref",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        // Surfaces the backend's own validation message, which is far more
        // useful than a bare status to show the dietitian.
        const detail = await response.text().catch(() => "");

        throw new Error(
            `Failed to save allergy preference (${response.status})${
                detail ? `: ${detail}` : ""
            }`
        );
    }

    const jsonData = await response.json();

    return (jsonData.data ?? jsonData) as CreateAllergyPrefResponse;
}

/** Page size used by the table's pager. */
export const ALLERGY_PREF_PAGE_SIZE = 10;

export const EMPTY_ALLERGY_PREF_PAGINATION: AllergyPrefPagination = {
    page: 1,
    limit: ALLERGY_PREF_PAGE_SIZE,
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
 * GET /api/allergypref?page=&limit= — newest record first, no server filters.
 *
 * Returns the page's rows plus the server's pagination block. When no block
 * arrives, falls back to a single page containing every row.
 */
export async function getAllergyPrefsApi(
    query: GetAllergyPrefsQuery = {}
): Promise<GetAllergyPrefsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? ALLERGY_PREF_PAGE_SIZE;

    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    try {
        const response = await fetch(
            `https://4jzhg556-5000.inc1.devtunnels.ms/api/allergypref?${params.toString()}`
        );

        if (!response.ok) {
            console.log(
                `getAllergyPrefsApi failed: ${response.status} ${response.statusText}`
            );
            return { data: [], pagination: EMPTY_ALLERGY_PREF_PAGINATION };
        }

        const jsonData = await response.json();

        // The paginated response comes back doubly nested
        // ({ data: { data, pagination } }), same as GET /api/dietplan, while
        // other endpoints put rows straight on `data`. Accept either.
        const payload = jsonData.data;
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        const pagination: AllergyPrefPagination =
            payload?.pagination ?? EMPTY_ALLERGY_PREF_PAGINATION;

        const hasMeta =
            pagination !== EMPTY_ALLERGY_PREF_PAGINATION &&
            typeof pagination?.total_pages === "number";

        return {
            data: rows as GetAllergyPrefsResponse["data"],
            pagination: hasMeta
                ? pagination
                : fallbackPagination(page, limit, rows.length),
        };
    } catch (error) {
        console.log(error);
        return { data: [], pagination: EMPTY_ALLERGY_PREF_PAGINATION };
    }
}
