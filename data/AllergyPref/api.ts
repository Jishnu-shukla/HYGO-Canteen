import { API_BASE_URL } from "@/data/apiBaseUrl";
import { ALLERGY_SEVERITY } from "./type";
import type {
    AllergyEntry,
    AllergyPrefListItem,
    AllergyPrefPagination,
    AllergySeverity,
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
 * A list row as it actually arrives, which may still be the pre-migration
 * scalar shape the server has been observed sending: `allergies: "Penuts"`,
 * `intolerances: "Lactos"` and a record-level `severity`.
 */
type RawAllergyPrefRow = Omit<AllergyPrefListItem, "allergies" | "intolerances"> & {
    allergies?: unknown;
    intolerances?: unknown;
    severity?: unknown;
};

function isAllergyEntry(value: unknown): value is AllergyEntry {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as { name?: unknown }).name === "string"
    );
}

/** Falls back to "Mild" for a value outside the declared vocabulary. */
function normalizeSeverity(value: unknown): AllergySeverity {
    return ALLERGY_SEVERITY.includes(value as AllergySeverity)
        ? (value as AllergySeverity)
        : "Mild";
}

/**
 * Accepts either shape the API has shipped: the array of { name, severity }
 * entries the create body uses, or the legacy single free-text string. A
 * legacy string has no per-allergy severity, so the record-level `severity` is
 * borrowed for it when the server still sends one.
 */
function normalizeAllergies(
    value: unknown,
    recordSeverity: unknown
): AllergyEntry[] {
    if (Array.isArray(value)) {
        return value
            .map((entry) =>
                isAllergyEntry(entry)
                    ? {
                          name: entry.name,
                          severity: normalizeSeverity(entry.severity),
                      }
                    : {
                          name: typeof entry === "string" ? entry : "",
                          severity: normalizeSeverity(recordSeverity),
                      }
            )
            .map((entry) => ({ ...entry, name: entry.name.trim() }))
            .filter((entry) => entry.name !== "");
    }

    if (typeof value === "string" && value.trim() !== "") {
        return [{ name: value.trim(), severity: normalizeSeverity(recordSeverity) }];
    }

    return [];
}

/** Accepts a string[] or the legacy comma-separated single string. */
function normalizeIntolerances(value: unknown): string[] {
    const parts = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(",")
          : [];

    return parts.map((item) => String(item).trim()).filter((item) => item !== "");
}

/** Pins one wire row to the array-shaped contract every consumer expects. */
function normalizeAllergyPrefRow(row: RawAllergyPrefRow): AllergyPrefListItem {
    return {
        ...row,
        allergies: normalizeAllergies(row.allergies, row.severity),
        intolerances: normalizeIntolerances(row.intolerances),
    };
}

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
            data: (rows as RawAllergyPrefRow[]).map(normalizeAllergyPrefRow),
            pagination: hasMeta
                ? pagination
                : fallbackPagination(page, limit, rows.length),
        };
    } catch (error) {
        console.log(error);
        return { data: [], pagination: EMPTY_ALLERGY_PREF_PAGINATION };
    }
}
