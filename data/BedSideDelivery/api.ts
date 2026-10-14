import { API_BASE_URL } from "@/data/apiBaseUrl";
import type {
    BedSideDeliveryOrder,
    BedSideDeliveryRecord,
    BedSideDeliverySummary,
    CreateBedSideDeliveryBody,
    ReceiveBedsideDeliveryResponse,
} from "./type";

/**
 * Placeholder staff id sent as logged_by_user_id.
 *
 * The form never collects this, and the app has no auth layer to derive it
 * from, so a fixed stand-in is sent until a session exists. Replace with the
 * signed-in staff id at that point — the field is a Staff ObjectId, so a real
 * value must be a Mongo id and not a name.
 */
export const LOGGED_BY_USER_ID = "000000000000000000000000";

/**
 * GET /api/bedsidedelivery/summary — global totals, no query parameters.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getBedSideDeliverySummaryApi(): Promise<BedSideDeliverySummary | null> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/bedsidedelivery/summary`
        );

        if (!response.ok) {
            console.log(
                `getBedSideDeliverySummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as BedSideDeliverySummary;
    } catch (error) {
        console.log(error);
        return null;
    }
}

/**
 * GET /api/bedsidedelivery/orders — options for the delivery form's picker.
 *
 * Returns [] on any failure so the picker degrades to an empty list rather
 * than blocking the form.
 */
export async function getBedSideDeliveryOrdersApi(): Promise<BedSideDeliveryOrder[]> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/bedsidedelivery/orders`
        );

        if (!response.ok) {
            console.log(
                `getBedSideDeliveryOrdersApi failed: ${response.status} ${response.statusText}`
            );
            return [];
        }

        const jsonData = await response.json();

        // Rows sit straight on `data`, but a nested { data: [...] } shape is
        // accepted too so a server change does not blank the picker.
        const payload = jsonData.data;
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        return rows as BedSideDeliveryOrder[];
    } catch (error) {
        console.log(error);
        return [];
    }
}

/**
 * POST /api/bedsidedelivery — logs one bedside handover.
 *
 * Throws on failure so the form can keep the entered values and show the
 * reason, rather than reporting success for a record that was never stored.
 */
export async function createBedSideDeliveryApi(
    body: CreateBedSideDeliveryBody
): Promise<BedSideDeliveryRecord> {
    const response = await fetch(
        `${API_BASE_URL}/bedsidedelivery`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        // Prefer the backend's own validation wording over a bare status.
        const jsonData = await response.json().catch(() => null);

        throw new Error(
            jsonData?.message ??
                `Failed to log bedside delivery (${response.status}${
                    jsonData ? `: ${JSON.stringify(jsonData)}` : ""
                })`
        );
    }

    const jsonData = await response.json();

    return (jsonData.data ?? jsonData) as BedSideDeliveryRecord;
}

/**
 * PUT /api/bedsidedelivery/:order_id — confirms the handover.
 *
 * A bare status write: no body, no intake reading. Moves the order into the
 * received state and stamps its delivered_at.
 *
 * Throws on failure so the form can show the backend's wording rather than
 * reporting a flip that never happened.
 */
export async function receiveBedSideDeliveryApi(
    order_id: string
): Promise<ReceiveBedsideDeliveryResponse> {
    const response = await fetch(
        `${API_BASE_URL}/bedsidedelivery/${order_id}`,
        { method: "PUT" }
    );

    if (!response.ok) {
        // Prefer the backend's own wording over a bare status.
        const jsonData = await response.json().catch(() => null);

        throw new Error(
            jsonData?.message ??
                `Failed to confirm handover (${response.status}${
                    jsonData ? `: ${JSON.stringify(jsonData)}` : ""
                })`
        );
    }

    const jsonData = await response.json();

    return (jsonData.data ?? jsonData) as ReceiveBedsideDeliveryResponse;
}
