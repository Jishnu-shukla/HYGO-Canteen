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