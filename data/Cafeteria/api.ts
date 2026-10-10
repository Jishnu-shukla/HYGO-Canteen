import type {
    AddTableOrderBody,
    CafeteriaSummary,
    CreateCafeteriaTransactionBody,
    GetTableTransactionDetails,
    GetTableTransactionDetailsQuery,
    PlaceTableOrderResponse,
    UpdateTableOrderResponse,
} from "./type";

const BASE_URL = "https://4jzhg556-5000.inc1.devtunnels.ms/api/cafeteria";

/**
 * GET /api/cafeteria/summary — today's cafeteria POS totals and the current
 * count of free tables. No query parameters: "today" is fixed server-side to
 * the dashboard's Asia/Kolkata day window, so this endpoint and
 * GET /api/dashboard always agree on the day.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getCafeteriaSummaryApi(): Promise<CafeteriaSummary | null> {
    try {
        const response = await fetch(`${BASE_URL}/summary`);

        if (!response.ok) {
            console.log(
                `getCafeteriaSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as CafeteriaSummary;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * Outcome of a place-order POST.
 *
 * A form must be able to show WHY the backend said no — it names the reason
 * (unknown table_id, empty order) — so failures carry a displayable message
 * instead of collapsing to the null the read endpoints return. Success keeps
 * the whole envelope, whose `message` doubles as the confirmation text.
 */
export type PlaceTableOrderResult =
    | { ok: true; response: PlaceTableOrderResponse }
    | { ok: false; error: string };

/**
 * Pulls the backend's own message out of a failed response. Validation
 * errors arrive as JSON { message }, but a route the server has not mounted
 * yet answers with Express's HTML 404, which carries nothing to extract —
 * fall back to the status so the form never shows a blank error.
 */
function readErrorMessage(text: string, status: number): string {
    try {
        const parsed = JSON.parse(text) as { message?: unknown };

        if (typeof parsed.message === "string" && parsed.message !== "") {
            return parsed.message;
        }
    } catch {
        // Not JSON — the status fallback below carries the error.
    }

    return `Request failed with status ${status}.`;
}

/**
 * POST /api/cafeteria/table — a customer at a table places an order.
 *
 * table_id is validated-only and customer_name display-only (see the body
 * contract); every other field on the created document is server-owned, so
 * this sends exactly the three interface fields and nothing more.
 *
 * The route is contract-only on the server as of this writing — until it is
 * mounted, every call lands in the not-JSON 404 branch above.
 */
export async function placeTableOrderApi(
    body: AddTableOrderBody
): Promise<PlaceTableOrderResult> {
    try {
        const response = await fetch(`${BASE_URL}/table`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();

        if (!response.ok) {
            console.log(
                `placeTableOrderApi failed: ${response.status} ${response.statusText}`
            );
            return { ok: false, error: readErrorMessage(text, response.status) };
        }

        return {
            ok: true,
            response: JSON.parse(text) as PlaceTableOrderResponse,
        };
    } catch (error) {
        console.log(error);
        return {
            ok: false,
            error: "Could not reach the server — the order was not placed.",
        };
    }
}

/**
 * GET /api/cafeteria/table?table_number=number — fetch open tab for a table.
 */
export async function getTableTransactionDetailsApi(
    query: GetTableTransactionDetailsQuery
): Promise<GetTableTransactionDetails | null> {
    try {
        const params = new URLSearchParams();
        params.set("table_number", query.table_number.trim());
        const response = await fetch(`${BASE_URL}/table?${params.toString()}`);

        if (!response.ok) {
            console.log(
                `getTableTransactionDetailsApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();
        return jsonData.data as GetTableTransactionDetails;
    } catch (error) {
        console.log(error);
        return null;
    }
}

export type UpdateTableOrderResult =
    | { ok: true; response: UpdateTableOrderResponse }
    | { ok: false; error: string };

/**
 * PUT /api/cafeteria/table — update the open transaction for a table.
 */
export async function updateTableTransactionApi(
    body: CreateCafeteriaTransactionBody
): Promise<UpdateTableOrderResult> {
    try {
        const response = await fetch(`${BASE_URL}/table`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();

        if (!response.ok) {
            console.log(
                `updateTableTransactionApi failed: ${response.status} ${response.statusText}`
            );
            return { ok: false, error: readErrorMessage(text, response.status) };
        }

        return {
            ok: true,
            response: JSON.parse(text) as UpdateTableOrderResponse,
        };
    } catch (error) {
        console.log(error);
        return {
            ok: false,
            error: "Could not reach the server — the transaction was not updated.",
        };
    }
}
