import type {
    GetPlateWasteQuery,
    GetPlateWasteResponse,
    PlateWasteDietType,
    PlateWasteInterface,
    PlateWastePagination,
} from "./type";

/**
 * GET /api/platewaste/summary — lifetime totals, no query parameters.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getPlateWasteSummaryApi(): Promise<PlateWasteInterface | null> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/platewaste/summary"
        );

        if (!response.ok) {
            console.log(
                `getPlateWasteSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as PlateWasteInterface;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * GET /api/platewaste/diettype — chart payload, one row per logged diet type.
 *
 * Returns [] on any failure so the chart can render its empty state rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getPlateWasteDietTypeApi(): Promise<PlateWasteDietType[]> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/platewaste/diettype"
        );

        if (!response.ok) {
            console.log(
                `getPlateWasteDietTypeApi failed: ${response.status} ${response.statusText}`
            );
            return [];
        }

        const jsonData = await response.json();

        // Contract puts rows under data.diet_types; a bare array on data is
        // accepted too so a server shape change does not blank the chart.
        const payload = jsonData.data;
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.diet_types)
              ? payload.diet_types
              : [];

        return rows as PlateWasteDietType[];
    } catch (error) {
        console.log(error);
        return [];
    }
}

/** Page size used by the table's pager. */
export const PLATE_WASTE_PAGE_SIZE = 10;

export const EMPTY_PLATE_WASTE_PAGINATION: PlateWastePagination = {
    page: 1,
    limit: PLATE_WASTE_PAGE_SIZE,
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
 * GET /api/platewaste?page=&limit= — every plate-waste log, newest first.
 *
 * Returns the page's rows plus the server's pagination block. When no block
 * arrives, falls back to a single page containing every row.
 */
export async function getPlateWasteApi(
    query: GetPlateWasteQuery = {}
): Promise<GetPlateWasteResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? PLATE_WASTE_PAGE_SIZE;

    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    try {
        const response = await fetch(
            `https://4jzhg556-5000.inc1.devtunnels.ms/api/platewaste?${params.toString()}`
        );

        if (!response.ok) {
            console.log(
                `getPlateWasteApi failed: ${response.status} ${response.statusText}`
            );
            return { data: [], pagination: EMPTY_PLATE_WASTE_PAGINATION };
        }

        const jsonData = await response.json();

        // The paginated response comes back doubly nested
        // ({ data: { data, pagination } }), same as the other list endpoints,
        // while other endpoints put rows straight on `data`. Accept either.
        const payload = jsonData.data;
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        const pagination: PlateWastePagination =
            payload?.pagination ?? EMPTY_PLATE_WASTE_PAGINATION;

        const hasMeta =
            pagination !== EMPTY_PLATE_WASTE_PAGINATION &&
            typeof pagination?.total_pages === "number";

        return {
            data: rows as GetPlateWasteResponse["data"],
            pagination: hasMeta
                ? pagination
                : fallbackPagination(page, limit, rows.length),
        };
    } catch (error) {
        console.log(error);
        return { data: [], pagination: EMPTY_PLATE_WASTE_PAGINATION };
    }
}