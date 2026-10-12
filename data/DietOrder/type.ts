import type { MealSlot } from "@/data/Menu/type";

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

export interface GetDietOrderSummaryResponse {
    total_orders: number;
    pending_orders: number;
    special_orders: number;
}

/**
 * A patient as returned by the picker endpoint.
 * Only { uhid, name } — exactly what the form needs to send back.
 */
export interface Patient {
    uhid: string;
    name: string;
}

/**
 * Observed on live data from GET /api/dashboard/orders:
 * Ordered | Approved | Ready | Dispatched | Cancelled_Order | Lost
 *
 * "Cancelled_Order" and "Lost" are wire values, so they are reproduced
 * verbatim rather than normalised for display. The UI maps them to
 * friendlier labels at render time.
 */
export const ORDER_STATUS = [
    "Ordered",
    "Approved",
    "Ready",
    "Dispatched",
    "Recieved",
    "Cancelled_Order",
    "Lost",
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

/**
 * One row of today's order list.
 *
 * Every DietOrder field is returned, plus two denormalized conveniences:
 * - patient_name / uhid  from the Paitent collection via $lookup, so the
 *                         table can render without a second request.
 * - diet_type            from the linked DietPlan, null when the order has
 *                         no plan attached.
 *
 * Note bad_number is surfaced as bed_number and delievered_at as
 * delivered_at, matching POST /api/dietorder and the schema aliases.
 */
export interface DietOrderListItem {
    order_id: string;
    /** Raw Mongo id of the patient. */
    patient_id: string;
    /** Patient's business ID, e.g. "UHID-2026-0001". */
    uhid: string;
    patient_name: string;
    /** Always null: the UI has no ward-id source, so nothing writes it. */
    ward_id: string | null;
    ward_name: string;
    bed_number: string;
    diet_plan_id: string | null;
    /** Null when the order has no linked plan. */
    diet_type: string | null;
    meal_type: MealSlot;
    /** ISO timestamp. */
    scheduled_date: string;
    order_source: string;
    special_instruction: string;
    status: OrderStatus;
    is_special: boolean;
    /** Null unless the order was cancelled. */
    cancellation_reason: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    delivered_by_user_id: string | null;
    qr_code_tag: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Orders created today, newest first. No filters or pagination.
 *
 * "Today" is based on createdAt — what was entered today — not
 * scheduled_date. Cancelled orders are included; filter on status
 * client-side.
 */

/** GET /api/dietorder?page=1&limit=10 */
export interface GetDietOrdersQuery {
    /** 1-based. Defaults to 1. */
    page?: number;
    /** Page size. Defaults to 10, capped at 100. */
    limit?: number;
}

/** Page metadata, so the UI can render a pager without a second request. */
export interface DietOrderPagination {
    page: number;
    limit: number;
    /** Total matching rows across all pages. */
    total: number;
    total_pages: number;
}

/**
 * All orders, newest first. No date filter — cancelled orders included, so the
 * UI can filter on status itself.
 */
export interface GetDietOrdersResponse {
    data: DietOrderListItem[];
    pagination: DietOrderPagination;
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

export interface CreateDietOrderBody {
    /** Patient's business ID, e.g. "UHID-2026-0001". Must resolve to a patient. */
    uhid: string;
    /** ISO date string; the server converts it to a Date. */
    scheduled_date: string;
    meal_type: MealSlot;
    /** Ward display text, e.g. "Cardiology Ward". */
    ward_name?: string;
    /** Maps to the schema's misspelled bad_number field. */
    bed_number?: string;
    /** Who raised the order, e.g. "Dietitian", "Nurse", "Doctor". Free text. */
    order_source?: string;
    /** Free-text kitchen note, e.g. "Thickened liquid". */
    special_instruction?: string;
    /** Flags the order for priority kitchen handling. Feeds special_orders in the summary. */
    is_special?: boolean;
}

/**
 * The order as returned by POST /api/dietorder and PUT /api/dietorder/:order_id.
 *
 * It is the stored order with patient_name resolved from Paitent. The list row
 * (DietOrderListItem) adds the diet_type lookup on top of this, so a create/update
 * response is a subset of what the table renders.
 */
export interface CreateDietOrderResponse {
    order_id: string;
    /** Raw Mongo id of the patient. */
    patient_id: string;
    uhid: string;
    patient_name: string;
    ward_id: string | null;
    ward_name: string;
    bed_number: string;
    diet_plan_id: string | null;
    /** Items the server derived from the active plan and published menu. */
    master_item_ids: string[];
    meal_type: MealSlot;
    /** ISO timestamp. */
    scheduled_date: string;
    order_source: string;
    special_instruction: string;
    status: OrderStatus;
    is_special: boolean;
    cancellation_reason: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    delivered_by_user_id: string | null;
    qr_code_tag: string | null;
    createdAt: string;
    updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Update
 * ------------------------------------------------------------------ */

/** Route param: PUT /api/dietorder/:order_id */
export interface UpdateDietOrderParams {
    /**
     * Business id of the order, e.g. "ORDER-000001". Optional at the type level
     * only — the controller's 400 guard enforces presence.
     */
    order_id?: string;
}

/**
 * Partial update of one order — every field is optional and omitted fields are
 * left unchanged. The identity, derived and lifecycle fields are deliberately
 * not updatable:
 *
 * - order_id            is the route param.
 * - uhid / patient_id   an order is not reassigned to another patient; raise
 *                       a new order instead.
 * - patient_name        is display-only and never persisted (see
 *                       CreateDietOrderBody).
 * - diet_plan_id / master_item_ids  are derived by the server at create time
 *                       from the patient's active plan and published menu for
 *                       the meal. They are not accepted here; the service
 *                       re-derives them when scheduled_date or meal_type
 *                       changes, the same way create() does, so the order
 *                       cannot point at a plan or a set of items for a meal it
 *                       no longer is.
 * - status and the lifecycle fields (cancellation_reason, dispatched_at,
 *   delivered_at, delivered_by_user_id, qr_code_tag)  are owned by the
 *   kitchen/dispatch/delivery endpoints, not the edit form.
 *
 * Free-text fields (ward_name, bed_number, order_source,
 * special_instruction) accept "" to clear the value, which is what the schema
 * stores for an unset field.
 */
export interface UpdateDietOrderBody {
    /** ISO date string; the server converts it to a Date. */
    scheduled_date?: string;
    meal_type?: MealSlot;
    /** Ward display text, e.g. "Cardiology Ward". "" clears it. */
    ward_name?: string;
    /** Maps to the schema's misspelled bad_number field. "" clears it. */
    bed_number?: string;
    /** Who raised the order, e.g. "Dietitian", "Nurse", "Doctor". "" clears it. */
    order_source?: string;
    /** Free-text kitchen note, e.g. "Thickened liquid". "" clears it. */
    special_instruction?: string;
    /** Flags the order for priority kitchen handling. */
    is_special?: boolean;
}

/**
 * The order after the update — the same shape the create response returns, with
 * diet_plan_id / master_item_ids reflecting any re-derivation.
 */
export type UpdateDietOrderResponse = CreateDietOrderResponse;

/* ------------------------------------------------------------------ *
 * Delete
 * ------------------------------------------------------------------ */

/** Route param: DELETE /api/dietorder/:order_id */
export interface DeleteDietOrderParams {
    /**
     * Business id of the order, e.g. "ORDER-000001". Optional at the type level
     * only — the controller's 400 guard enforces presence.
     */
    order_id?: string;
}

/**
 * The order as it looked immediately before deletion, in the same shape the
 * create/update responses return, plus a deleted flag so clients can
 * distinguish a real delete from an empty payload.
 *
 * DietOrder has no soft-delete flag, so the row is removed outright. That is
 * deliberately not the same as status: "Cancelled_Order" (see
 * CreateDietOrderBody): cancelling keeps the order and its cancellation_reason
 * for the audit trail, whereas this erases the record.
 */
export interface DeleteDietOrderResponse {
    deleted: true;
    /** The removed order. */
    diet_order: CreateDietOrderResponse;
}