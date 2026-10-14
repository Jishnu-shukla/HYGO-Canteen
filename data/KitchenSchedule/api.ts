import { API_BASE_URL } from "@/data/apiBaseUrl";
import type { MealSlot } from "@/data/Menu/type";
import type {
    CreateKitchenScheduleBody,
    CreateKitchenScheduleResponse,
    GetKitchenScheduleSummaryResponse,
    KitchenScheduleOrdersPivot,
    KitchenScheduleSlotOrders,
    MarkKitchenScheduleOrderReadyResponse,
    MarkKitchenScheduleOrderReadyWriteResult,
    UpdateKitchenScheduleOrdersReadyResponse,
} from "./type";

/**
 * GET /api/kitchenschedule/summary — today's kitchen workload, no query
 * parameters.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getKitchenScheduleSummaryApi(): Promise<GetKitchenScheduleSummaryResponse | null> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/kitchenschedule/summary`
        );

        if (!response.ok) {
            console.log(
                `getKitchenScheduleSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as GetKitchenScheduleSummaryResponse;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * GET /api/kitchenschedule/orders — today's orders pivoted by meal slot and
 * diet type, with per-ward counts, no query parameters.
 *
 * Returns null on any failure so the table can show zeroes rather than
 * blocking the screen; the caller logs the reason.
 */
export async function getKitchenScheduleOrdersApi(): Promise<KitchenScheduleOrdersPivot | null> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/kitchenschedule/orders`
        );

        if (!response.ok) {
            console.log(
                `getKitchenScheduleOrdersApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as KitchenScheduleOrdersPivot;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * GET /api/kitchenschedule/orders?meal_slot=... — the flat order list behind
 * one meal slot, for the slot drill-down modal.
 *
 * `diet_type` is left off on purpose: every returned order carries its own
 * diet_type, so the modal filters the slot's list locally rather than issuing
 * one request per cell.
 *
 * Returns null on any failure so the modal can fall back to an error state;
 * an empty slot comes back as [] rather than null, so "no orders" and "could
 * not load" stay distinguishable.
 */
export async function getKitchenScheduleSlotOrdersApi(
    mealSlot: MealSlot
): Promise<KitchenScheduleSlotOrders | null> {
    try {
        const params = new URLSearchParams({ meal_slot: mealSlot });

        const response = await fetch(
            `${API_BASE_URL}/kitchenschedule/orders?${params.toString()}`
        );

        if (!response.ok) {
            console.log(
                `getKitchenScheduleSlotOrdersApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as KitchenScheduleSlotOrders;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/** Narrows a ready response to the raw write-result shape. */
function isReadyWriteResult(
    response: MarkKitchenScheduleOrderReadyResponse
): response is MarkKitchenScheduleOrderReadyWriteResult {
    return typeof (response as MarkKitchenScheduleOrderReadyWriteResult)
        ?.matchedCount === "number";
}

/**
 * PUT /api/kitchenschedule/orders/:order_id/ready — flips one order to Ready.
 *
 * `order_id` is the business ID (e.g. "ORD-000001"); the backend resolves it
 * against order_id rather than the Mongo _id.
 *
 * Throws when the server reports no match, even if it answers 200, so the
 * modal never drops a row whose write did not happen. Body is empty on
 * purpose — the backend reads the order from the path.
 */
export async function markKitchenScheduleOrderReadyApi(
    orderId: string
): Promise<MarkKitchenScheduleOrderReadyResponse> {
    const response = await fetch(
        `${API_BASE_URL}/kitchenschedule/orders/${orderId}/ready`,
        { method: "PUT" }
    );

    if (!response.ok) {
        const jsonData = await response.json().catch(() => null);

        throw new Error(
            jsonData?.message ??
                `Could not mark ${orderId} ready: ${response.status} ${response.statusText}`
        );
    }

    const jsonData = await response.json().catch(() => null);
    const result = (jsonData?.data ?? jsonData) as
        | MarkKitchenScheduleOrderReadyResponse
        | null;

    if (result && isReadyWriteResult(result) && result.matchedCount === 0) {
        throw new Error(
            `${orderId} was not found, so nothing was marked ready. It may already be gone.`
        );
    }

    return result ?? {};
}

/**
 * PUT /api/kitchenschedule/orders/ready — bulk mark-ready for the kitchen.
 *
 * Takes the business order ids (e.g. "ORD-000001") in the body's `order_ids`,
 * one request for the whole selection, instead of one round-trip per order.
 * Orders the server leaves untouched are reported in `skipped_order_ids`, never
 * made to fail the request.
 *
 * Throws on a non-2xx response (including the backend's own message when it
 * sends one) so the modal can surface the reason and keep the affected rows.
 */
export async function updateKitchenScheduleOrdersReadyApi(
    orderIds: string[]
): Promise<UpdateKitchenScheduleOrdersReadyResponse> {
    const response = await fetch(
        `${API_BASE_URL}/kitchenschedule/orders/ready`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_ids: orderIds }),
        }
    );

    if (!response.ok) {
        const jsonData = await response.json().catch(() => null);

        throw new Error(
            jsonData?.message ??
                `Could not mark orders ready: ${response.status} ${response.statusText}`
        );
    }

    const jsonData = await response.json().catch(() => null);

    return (jsonData?.data ?? jsonData) as UpdateKitchenScheduleOrdersReadyResponse;
}

/**
 * POST /api/kitchenschedule — publishes one schedule row for one meal slot at
 * one moment.
 *
 * The body carries `schedule_at` (the moment, an ISO string the server parses
 * to a Date) and `meal_slot`; schedule_id, shift and the assignment fields are
 * all server-set (see CreateKitchenScheduleBody). The contract takes a single
 * meal_slot per row, so scheduling a whole day is one call per selected slot.
 *
 * Throws on a non-2xx response (including the backend's own message when it
 * sends one) so the modal can report exactly which slot failed instead of
 * claiming the whole day was scheduled. Returns the minted row, unwrapped from
 * the `data` envelope.
 */
export async function createKitchenScheduleApi(
    body: CreateKitchenScheduleBody
): Promise<CreateKitchenScheduleResponse> {
    const response = await fetch(
        `${API_BASE_URL}/kitchenschedule`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        const jsonData = await response.json().catch(() => null);

        throw new Error(
            jsonData?.message ??
                `Could not schedule ${body.meal_slot}: ${response.status} ${response.statusText}`
        );
    }

    const jsonData = await response.json().catch(() => null);

    return (jsonData?.data ?? jsonData) as CreateKitchenScheduleResponse;
}
