import type { MealSlot } from "@/data/Menu/type";

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

/**
 * GET /api/mealdispatch/summary — global totals, no query parameters.
 *
 * Returned unwrapped from the `data` envelope:
 *   { statusCode, message, success, data: MealDispatchSummary }
 *
 * total_dispatches counts every dispatch record on the server, while
 * pending_orders and dispatched_orders describe today's tray state.
 */
export interface MealDispatchSummary {
    total_dispatches: number;
    /** Orders still waiting to go out. */
    pending_orders: number;
    /** Orders already sent to the wards. */
    dispatched_orders: number;
}

/**
 * Order lifecycle states observed on live data from
 * GET /api/mealdispatch/pending.
 *
 * Declared here rather than reusing DietOrder's ORDER_STATUS because the two
 * disagree on one value: the dispatch endpoint sends "Received" while
 * /api/dietorder sends the typo "Recieved". Keeping a separate union avoids
 * a type that is wrong for whichever endpoint you read.
 *
 * "Cancelled_Order" and "Lost" are wire spellings, reproduced verbatim.
 */
export const DISPATCH_STATUS = [
    "Ordered",
    "Approved",
    "Ready",
    "Dispatched",
    "Received",
    "Cancelled_Order",
    "Lost",
] as const;

export type DispatchStatus = (typeof DISPATCH_STATUS)[number];

/** The one status a tray can be dispatched from. */
export const READY_STATUS: DispatchStatus = "Ready";

/**
 * GET /api/mealdispatch/pending — orders awaiting dispatch.
 *
 * Rows sit straight on `data` (not doubly nested) and are unpaginated:
 *   { statusCode, message, success, data: PendingDispatchOrder[] }
 *
 * Despite the endpoint name this is NOT server-filtered to Ready: live data
 * returns every status (Ordered, Ready, Dispatched, Received, Lost,
 * Cancelled_Order). getPendingDispatchOrdersApi narrows it client-side.
 *
 * The projection sets `_id: 0`, so no Mongo id is returned. Dispatching uses
 * order_id — the backend resolves it against order_id, not _id.
 *
 * bed_number and delivered_at are renamed from the stored bad_number and
 * misspelled delievered_at.
 */
export interface PendingDispatchOrder {
    /** Business order ID, e.g. "ORDER-2026-0004". Also the dispatch key. */
    order_id: string;
    /** Raw Mongo id of the patient. */
    patient_id: string;
    /** Patient's business ID, e.g. "UHID-2026-0001". Empty string if absent. */
    uhid: string;
    /** Empty string when the lookup found nothing, never null. */
    patient_name: string;
    ward_id: string | null;
    ward_name: string;
    /** Renamed from the stored bad_number. Empty string if absent. */
    bed_number: string;
    diet_plan_id: string | null;
    /** Null when the order has no linked plan. */
    diet_type: string | null;
    meal_type: MealSlot;
    /** ISO timestamp. */
    scheduled_date: string;
    /** Who raised the order, e.g. "Dietitian". */
    order_source: string;
    /** Free-text kitchen note. Empty string when there is none. */
    special_instruction: string;
    status: DispatchStatus;
    is_special: boolean;
    cancellation_reason: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    delivered_by_user_id: string | null;
    qr_code_tag: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * PUT /api/mealdispatch/:order_id/dispatch — flips an order to Dispatched.
 *
 * The path segment is the business order_id; the backend looks it up on
 * order_id. Passing a Mongo _id here will not match.
 *
 * No request body.
 *
 * IMPORTANT — success is not proof of a write. The handler returns 200 with
 * the raw write result, and a non-matching order still reports
 * "Order dispatched successfully" alongside modifiedCount 0 and
 * matchedCount 0. Callers must check matchedCount rather than trusting the
 * status code or the message. It does not upsert: repeated calls against a
 * missing order keep reporting 0/0 with upsertedId null.
 */
export interface DispatchWriteResult {
    acknowledged: boolean;
    /** 1 when the order was found and updated, 0 when nothing matched. */
    modifiedCount: number;
    /** 0 for this endpoint — a missing order is never inserted. */
    upsertedId: null;
    upsertedCount: number;
    /** 0 when the order_id did not resolve to anything. */
    matchedCount: number;
}

/**
 * The body of a successful PUT /dispatch. The server may also return the
 * updated order instead of a write result depending on its version, so both
 * shapes are modelled and narrowed at runtime.
 */
export type DispatchOrderResponse = DispatchWriteResult | PendingDispatchOrder;
