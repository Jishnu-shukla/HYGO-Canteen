import { filterCreatedToday } from "@/components/DietOrder/orderStatus";
import type {
    CreateDietOrderBody,
    DietOrderPagination,
    DietOrderListItem,
    GetDietOrderSummaryResponse,
    GetDietOrdersQuery,
    GetDietOrdersResponse,
    Patient,
} from "./type";

/**
 * Patient picker for the diet order form.
 *
 * GET /api/dietorder/paitent?name=<substring>&limit=<n>
 * Matching is case-insensitive substring; an unmatched name returns [].
 *
 * `signal` lets the caller abort an in-flight request so a slow early
 * response can't overwrite results for a newer query.
 */
export async function searchPatientsApi(
    query: string,
    limit = 10,
    signal?: AbortSignal
): Promise<Patient[]> {
    const trimmed = query.trim();

    if (!trimmed) return [];

    const params = new URLSearchParams({
        name: trimmed,
        limit: String(limit),
    });

    const response = await fetch(
        `https://4jzhg556-5000.inc1.devtunnels.ms/api/dietorder/paitent?${params.toString()}`,
        { signal }
    );

    const jsonData = await response.json();

    if (!response.ok) {
        throw new Error(
            jsonData?.message ??
                `Patient search failed: ${response.status} ${response.statusText}`
        );
    }

    return (jsonData.data ?? []) as Patient[];
}

export async function getDietOrderSummaryApi(): Promise<
    GetDietOrderSummaryResponse | null
> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/dietorder/summary"
        );

        if (!response.ok) {
            console.log(
                `getDietOrderSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as GetDietOrderSummaryResponse;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/** Page size used by the table's pager. */
export const DIET_ORDER_PAGE_SIZE = 10;

export const EMPTY_PAGINATION: DietOrderPagination = {
    page: 1,
    limit: DIET_ORDER_PAGE_SIZE,
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
 * GET /api/dietorder?page=&limit= — newest first, cancelled included.
 *
 * Returns the page's rows plus the server's pagination block. When no block
 * arrives, falls back to a single page containing every row.
 */
export async function getDietOrdersApi(
    query: GetDietOrdersQuery = {}
): Promise<GetDietOrdersResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DIET_ORDER_PAGE_SIZE;

    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    try {
        const response = await fetch(
            `https://4jzhg556-5000.inc1.devtunnels.ms/api/dietorder?${params.toString()}`
        );

        if (!response.ok) {
            console.log(
                `getDietOrdersApi failed: ${response.status} ${response.statusText}`
            );
            return { data: [], pagination: EMPTY_PAGINATION };
        }

        const jsonData = await response.json();

        // The paginated response is doubly nested:
        //   { statusCode, message, success, data: { data: [...], pagination } }
        // Older/other endpoints put the rows directly on `data`, so both are
        // accepted to stay tolerant of either shape.
        const payload = jsonData.data;
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        const pagination: DietOrderPagination =
            payload?.pagination ?? EMPTY_PAGINATION;

        const hasMeta =
            pagination !== EMPTY_PAGINATION &&
            typeof pagination?.total_pages === "number";

        return {
            data: rows as DietOrderListItem[],
            pagination: hasMeta
                ? pagination
                : fallbackPagination(page, limit, rows.length),
        };
    } catch (error) {
        console.log(error);
        return { data: [], pagination: EMPTY_PAGINATION };
    }
}

/**
 * Today's orders for the board, which shows one slice rather than a pager.
 * `limit=100` is the server cap, so this covers every order created today.
 */
export async function getTodayDietOrdersApi(): Promise<DietOrderListItem[]> {
    const { data } = await getDietOrdersApi({ page: 1, limit: 100 });

    return filterCreatedToday(data);
}

/**
 * Throws on a non-2xx response so the form can surface the failure.
 * Returns the created order (unwrapped from the `data` envelope).
 */
export async function createDietOrderApi(payload: CreateDietOrderBody) {
    const response = await fetch(
        "https://4jzhg556-5000.inc1.devtunnels.ms/api/dietorder",
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
                `Diet order failed: ${response.status} ${response.statusText}`
        );
    }

    return jsonData.data ?? jsonData;
}