import { READY_STATUS } from "./type";
import type {
    DispatchOrderResponse,
    DispatchWriteResult,
    MealDispatchSummary,
    PendingDispatchOrder,
} from "./type";

/**
 * GET /api/mealdispatch/summary — global totals, no query parameters.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getMealDispatchSummaryApi(): Promise<MealDispatchSummary | null> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/mealdispatch/summary"
        );

        if (!response.ok) {
            console.log(
                `getMealDispatchSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as MealDispatchSummary;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * GET /api/mealdispatch/pending — orders awaiting dispatch.
 *
 * Despite its name this is NOT server-filtered to Ready: live data returns
 * every status (Ordered, Ready, Dispatched, Received, Lost, Cancelled_Order).
 * The Ready filter is applied here so callers only ever see dispatchable
 * trays. Unpaginated, so the table takes the whole list as-is.
 *
 * Returns [] on any failure so a dead backend shows an empty tray list rather
 * than blocking the screen.
 */
export async function getPendingDispatchOrdersApi(): Promise<PendingDispatchOrder[]> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/mealdispatch/pending"
        );

        if (!response.ok) {
            console.log(
                `getPendingDispatchOrdersApi failed: ${response.status} ${response.statusText}`
            );
            return [];
        }

        const jsonData = await response.json();

        // Rows sit straight on `data` here, but a nested { data: [...] } shape
        // is accepted too so a future server change does not blank the table.
        const payload = jsonData.data;
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        return (rows as PendingDispatchOrder[]).filter(
            (order) => order.status === READY_STATUS
        );
    } catch (error) {
        console.log(error);
        return [];
    }
}

/** Narrows a dispatch response to the raw write-result shape. */
function isWriteResult(
    response: DispatchOrderResponse
): response is DispatchWriteResult {
    return typeof (response as DispatchWriteResult)?.matchedCount === "number";
}

/**
 * PUT /api/mealdispatch/:order_id/dispatch — marks one order as dispatched.
 *
 * `order_id` is the business ID (e.g. "ORDER-2026-0004"); the backend
 * resolves it against order_id. Note the pending projection omits `_id`, so
 * this is the only identifier available.
 *
 * Throws when the server reports no match, even though it returns 200 with
 * "Order dispatched successfully" in that case. Trusting the status code would
 * silently drop the tray from the UI while nothing was written, so the write
 * result is checked and a zero-match is turned into an error.
 */
export async function dispatchOrderApi(
    orderId: string
): Promise<DispatchOrderResponse> {
    const response = await fetch(
        `https://4jzhg556-5000.inc1.devtunnels.ms/api/mealdispatch/${orderId}/dispatch`,
        { method: "PUT" }
    );

    if (!response.ok) {
        // Prefer the backend's own wording ("Order not found or already
        // dispatched!") over a bare status.
        const jsonData = await response.json().catch(() => null);

        throw new Error(
            jsonData?.message ??
                `Dispatch failed: ${response.status} ${response.statusText}`
        );
    }

    const jsonData = await response.json();
    const result = (jsonData.data ?? jsonData) as DispatchOrderResponse;

    // A 200 here does not mean the tray went out — see the type's note.
    if (isWriteResult(result) && result.matchedCount === 0) {
        throw new Error(
            `${orderId} was not found, so nothing was dispatched. It may already be gone.`
        );
    }

    return result;
}
