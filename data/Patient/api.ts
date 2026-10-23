import { API_BASE_URL } from "@/data/apiBaseUrl";
import { normalizeAllergyPrefRow } from "@/data/AllergyPref/api";
import type { RawAllergyPrefRow } from "@/data/AllergyPref/api";
import type {
    GetPatientHistoryResponse,
    GetPatientResponseSummary,
    GetPatientsQuery,
    GetPatientsResponse,
    PatientDietOrderHistoryItem,
    PatientListItem,
    PatientMealOrderHistoryItem,
    PatientPagination,
} from "./type";

/**
 * GET /api/patients/summary — patient counts, no query parameters.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getPatientSummaryApi(): Promise<GetPatientResponseSummary | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/summary`);

        if (!response.ok) {
            console.log(
                `getPatientSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as GetPatientResponseSummary;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * GET /api/patients/:uhid — one patient's whole history in a single read.
 *
 * Every section is scoped to the patient and already ordered newest first by
 * the server, so the modal renders the arrays as they arrive. Section arrays
 * are defaulted to [] so a partial payload cannot crash the timeline; the
 * `patient` row is the one required part of the contract.
 *
 * Returns null on any failure (including a missing patient row) so the modal
 * can offer a retry instead of rendering an empty history.
 */
export async function getPatientHistoryApi(
    uhid: string
): Promise<GetPatientHistoryResponse | null> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/patients/${encodeURIComponent(uhid)}`
        );

        if (!response.ok) {
            console.log(
                `getPatientHistoryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        // Tolerate both { data: {...} } and a bare payload, matching the
        // other read endpoints.
        const payload = jsonData?.data ?? jsonData;

        if (!payload?.patient) return null;

        // The history endpoint reuses the allergy list-row shape, so it can
        // carry the same legacy scalar (`allergies: "Peanuts"`) the allergy
        // endpoint normalizes. Resolve it here, once, so every consumer of the
        // history contract can treat allergies as an array.
        const allergies = Array.isArray(payload.allergies)
            ? (payload.allergies as RawAllergyPrefRow[])
            : [];

        // Item lines are resolved by the server; an old or partial row could
        // still omit them, so the card renderer always receives an array.
        const dietOrders = Array.isArray(payload.diet_orders)
            ? (payload.diet_orders as PatientDietOrderHistoryItem[])
            : [];

        const mealOrders = Array.isArray(payload.meal_orders)
            ? (payload.meal_orders as PatientMealOrderHistoryItem[])
            : [];

        return {
            patient: payload.patient as PatientListItem,
            diet_orders: dietOrders.map((order) => ({
                ...order,
                items: Array.isArray(order.items) ? order.items : [],
            })),
            meal_orders: mealOrders.map((order) => ({
                ...order,
                items: Array.isArray(order.items) ? order.items : [],
            })),
            diet_plans: Array.isArray(payload.diet_plans)
                ? payload.diet_plans
                : [],
            allergies: allergies.map(normalizeAllergyPrefRow),
            nutritional_assessments: Array.isArray(
                payload.nutritional_assessments
            )
                ? payload.nutritional_assessments
                : [],
            plate_waste_analytics: Array.isArray(
                payload.plate_waste_analytics
            )
                ? payload.plate_waste_analytics
                : [],
        };
    } catch (error) {
        console.log(error);
        return null;
    }
}

/** Page size used by the table's pager. */
export const PATIENT_PAGE_SIZE = 10;

export const EMPTY_PATIENT_PAGINATION: PatientPagination = {
    page: 1,
    limit: PATIENT_PAGE_SIZE,
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
 * GET /api/patients?page=&limit= — uhid ascending, soft-deleted rows included.
 *
 * Returns the page's rows plus the server's pagination block. When no block
 * arrives, falls back to a single page containing every row.
 *
 * uhid is unique, so the server order is stable: paging backwards and forwards
 * cannot duplicate or skip a patient.
 */
export async function getPatientsApi(
    query: GetPatientsQuery = {}
): Promise<GetPatientsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? PATIENT_PAGE_SIZE;

    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    try {
        const response = await fetch(
            `${API_BASE_URL}/patients?${params.toString()}`
        );

        if (!response.ok) {
            console.log(
                `getPatientsApi failed: ${response.status} ${response.statusText}`
            );
            return { data: [], pagination: EMPTY_PATIENT_PAGINATION };
        }

        const jsonData = await response.json();

        // Same tolerance as the other paginated list endpoints: the payload may
        // be doubly nested ({ data: { data, pagination } }) or put rows
        // straight on `data`. Accept either.
        const payload = jsonData.data;
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        const pagination: PatientPagination =
            payload?.pagination ?? EMPTY_PATIENT_PAGINATION;

        const hasMeta =
            pagination !== EMPTY_PATIENT_PAGINATION &&
            typeof pagination?.total_pages === "number";

        return {
            data: rows as PatientListItem[],
            pagination: hasMeta
                ? pagination
                : fallbackPagination(page, limit, rows.length),
        };
    } catch (error) {
        console.log(error);
        return { data: [], pagination: EMPTY_PATIENT_PAGINATION };
    }
}
