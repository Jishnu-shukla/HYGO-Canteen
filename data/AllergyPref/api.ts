import { API_BASE_URL } from "@/data/apiBaseUrl";
import type {
    AllergyPrefPagination,
    CreateAllergyPrefBody,
    CreateAllergyPrefResponse,
    DeleteAllergyPrefResponse,
    GetAllergyPrefSummaryResponse,
    GetAllergyPrefsQuery,
    GetAllergyPrefsResponse,
    UpdateAllergyPrefBody,
    UpdateAllergyPrefResponse,
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
            `${API_BASE_URL}/allergypref/summary`
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
        `${API_BASE_URL}/allergypref`,
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

/**
 * PUT /api/allergypref/:allergy_preference_id — partial update of one record.
 *
 * Only the fields present on `payload` are touched, so the edit form sends just
 * the values it changed. Throws on a non-2xx response (including the backend's
 * own validation message when it sends one) so the modal can surface the reason
 * and stay open; returns the updated record, unwrapped from the `data`
 * envelope.
 */
export async function updateAllergyPrefApi(
    allergyPreferenceId: string,
    payload: UpdateAllergyPrefBody
): Promise<UpdateAllergyPrefResponse> {
    const response = await fetch(
        `${API_BASE_URL}/allergypref/${allergyPreferenceId}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );

    if (!response.ok) {
        // Surfaces the backend's own validation message, which is far more
        // useful than a bare status to show the dietitian.
        const detail = await response.text().catch(() => "");

        throw new Error(
            `Failed to update allergy preference (${response.status})${
                detail ? `: ${detail}` : ""
            }`
        );
    }

    const jsonData = await response.json();

    return (jsonData.data ?? jsonData) as UpdateAllergyPrefResponse;
}

/**
 * DELETE /api/allergypref/:allergy_preference_id — removes the record outright.
 *
 * AllergyPreference has no soft-delete flag, so the row is gone once this
 * succeeds. Throws on a non-2xx response (including the backend's own message
 * when it sends one) so the confirm dialog can surface the reason and stay open;
 * returns the pre-deletion record, unwrapped from the `data` envelope.
 */
export async function deleteAllergyPrefApi(
    allergyPreferenceId: string
): Promise<DeleteAllergyPrefResponse> {
    const response = await fetch(
        `${API_BASE_URL}/allergypref/${allergyPreferenceId}`,
        {
            method: "DELETE",
        }
    );

    if (!response.ok) {
        const detail = await response.text().catch(() => "");

        throw new Error(
            `Failed to delete allergy preference (${response.status})${
                detail ? `: ${detail}` : ""
            }`
        );
    }

    const jsonData = await response.json();

    return (jsonData.data ?? jsonData) as DeleteAllergyPrefResponse;
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
            `${API_BASE_URL}/allergypref?${params.toString()}`
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
