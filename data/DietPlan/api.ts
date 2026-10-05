import type {
    CreateDietPlanBody,
    CreateDietPlanResponse,
    DietPlanListItem,
    DietPlanPagination,
    GetDietPlanSummaryResponse,
    GetDietPlansQuery,
    GetDietPlansResponse,
} from "./type";

/**
 * GET /api/dietplan/summary — global totals, no query parameters.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getDietPlanSummaryApi(): Promise<GetDietPlanSummaryResponse | null> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/dietplan/summary"
        );

        if (!response.ok) {
            console.log(
                `getDietPlanSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as GetDietPlanSummaryResponse;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * Throws on a non-2xx response so the form can surface the failure itself
 * rather than silently doing nothing. Returns the created plan, unwrapped
 * from the `data` envelope the other endpoints use.
 */
export async function createDietPlanApi(
    payload: CreateDietPlanBody
): Promise<CreateDietPlanResponse> {
    const response = await fetch(
        "https://4jzhg556-5000.inc1.devtunnels.ms/api/dietplan",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        }
    );

    const jsonData = await response.json();

    if (!response.ok) {
        throw new Error(
            jsonData?.message ??
                `Diet plan failed: ${response.status} ${response.statusText}`
        );
    }

    return (jsonData.data ?? jsonData) as CreateDietPlanResponse;
}

/** Page size used by the table's pager. */
export const DIET_PLAN_PAGE_SIZE = 10;

export const EMPTY_DIET_PLAN_PAGINATION: DietPlanPagination = {
    page: 1,
    limit: DIET_PLAN_PAGE_SIZE,
    total: 0,
    total_pages: 1,
};

/**
 * Builds a single-page fallback when the server sends no `pagination` block,
 * so the pager degrades to "everything on page 1" instead of empty pages.
 */
function fallbackPagination(page: number, limit: number, rowCount: number) {
    return {
        page,
        limit,
        total: rowCount,
        total_pages: 1,
    };
}

/**
 * GET /api/dietplan?page=&limit= — newest record first, every status.
 *
 * Returns the page's rows plus the server's pagination block. When no block
 * arrives, falls back to a single page containing every row.
 */
export async function getDietPlansApi(
    query: GetDietPlansQuery = {}
): Promise<GetDietPlansResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DIET_PLAN_PAGE_SIZE;

    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    try {
        const response = await fetch(
            `https://4jzhg556-5000.inc1.devtunnels.ms/api/dietplan?${params.toString()}`
        );

        if (!response.ok) {
            console.log(
                `getDietPlansApi failed: ${response.status} ${response.statusText}`
            );
            return { data: [], pagination: EMPTY_DIET_PLAN_PAGINATION };
        }

        const jsonData = await response.json();

        // Same tolerance as GET /api/dietorder: the paginated response comes
        // back doubly nested ({ data: { data, pagination } }), while other
        // endpoints put rows straight on `data`. Accept either.
        const payload = jsonData.data;
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        const pagination: DietPlanPagination =
            payload?.pagination ?? EMPTY_DIET_PLAN_PAGINATION;

        const hasMeta =
            pagination !== EMPTY_DIET_PLAN_PAGINATION &&
            typeof pagination?.total_pages === "number";

        return {
            data: rows as DietPlanListItem[],
            pagination: hasMeta
                ? pagination
                : fallbackPagination(page, limit, rows.length),
        };
    } catch (error) {
        console.log(error);
        return { data: [], pagination: EMPTY_DIET_PLAN_PAGINATION };
    }
}
