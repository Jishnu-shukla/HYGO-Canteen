import type { FssaiShift } from "@/data/FssaiChecklist/type";
import type { DietType, MealSlot } from "@/data/Menu/type";

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

/**
 * GET /api/kitchenschedule/summary
 *
 * Today's kitchen workload, counted off DietOrder.
 *
 * No query parameters — this is a scoped report on today, matching the
 * "today" semantics of dashboard.service and bedsideDelivery.service.
 *
 * KitchenSchedule itself carries no order/ward/patient data (only the meal
 * slot, the assigned chef and the menu items to cook), so the counts are
 * derived from the orders scheduled today rather than from the schedule rows:
 * - total_orders    orders scheduled today. Cancelled orders are excluded,
 *                   since the kitchen no longer prepares them.
 * - total_wards     distinct wards across those orders. Orders with no
 *                   ward_name are ignored, so a blank ward is not counted
 *                   as a ward of its own.
 * - total_patients  distinct patients across those orders, grouped by
 *                   patient_id so a patient with several meals today
 *                   counts once.
 * - meal_slots      orders scheduled today, broken down by meal slot. Only
 *                   slots with a non-cancelled order appear, so a missing
 *                   slot counts as zero.
 */
export interface GetKitchenScheduleSummaryResponse {
    total_orders: number;
    total_wards: number;
    total_patients: number;
    meal_slots: Partial<Record<MealSlot, number>>;
}

/**
 * Orders per ward within a single meal_slot × diet_type cell:
 * { "General Ward": 2, "ICU": 3 } — ward_name -> order count.
 *
 * Object.keys(cell).length is therefore the distinct ward count for that
 * cell. Orders with no ward_name are left out, matching the summary's
 * total_wards, so a blank ward is not reported as a ward of its own.
 */
export type KitchenScheduleWardCounts = Record<string, number>;

/**
 * One row of the meal_slot × diet_type pivot: a meal slot and, for each diet
 * type served in it, the per-ward order counts.
 *
 * Orders with no linked diet plan have no diet_type, so they cannot sit in a
 * column and are left out of the pivot.
 */
export interface KitchenScheduleOrderRow {
    meal_slot: MealSlot;
    /**
     * Ward breakdown per diet type for this slot. Keys are a subset of
     * DIET_TYPE, in DIET_TYPE order; a diet type missing from the map has no
     * orders in this slot (read it as 0).
     */
    diet_types: Partial<Record<DietType, KitchenScheduleWardCounts>>;
}

/**
 * The full pivot: one row per meal slot that has orders today, in MEAL_TYPE
 * order. Cancelled orders are excluded, matching GET /api/kitchenschedule/summary.
 *
 * Empty meal slots are omitted rather than returned as all-zero rows; the
 * client renders a missing row/cell as 0.
 */
export type KitchenScheduleOrdersPivot = KitchenScheduleOrderRow[];

/* ------------------------------------------------------------------ *
 * GET /api/kitchenschedule/orders
 * ------------------------------------------------------------------ */

/**
 * Both params arrive as strings, so they are validated against the enum arrays
 * in the controller before reaching the DB.
 *
 * A table cell is identified by its row (meal_slot) and column (diet_type), so
 * no schedule id is involved: the row is a meal slot, and the order rows
 * behind it are found by that slot directly.
 */
export interface GetKitchenScheduleOrdersQuery {
    /**
     * A MEAL_TYPE value, e.g. "Lunch". Omit it for the pivot (the table
     * itself); supply it to get the flat order list behind that slot.
     */
    meal_slot?: MealSlot;
    /**
     * A DIET_TYPE value, e.g. "Diabetic". Only meaningful together with
     * meal_slot, and optional: every returned order carries its own diet_type,
     * so the client may instead filter the slot's list locally.
     */
    diet_type?: DietType;
}

/**
 * One order in the flat list behind a meal slot, flattened for the
 * meal_slot × diet_type cell table.
 *
 * diet_type is not stored on the order — it is read from the linked DietPlan
 * (DietOrder.diet_plan_id -> DietPlan.diet_plan_id, the same join the /orders
 * pivot uses). Orders with no linked plan have no diet_type and cannot sit in
 * a cell, so the service leaves them out and this field is never null.
 */
export interface KitchenScheduleOrderItem {
    /** Business id of the order, e.g. "ORD-000001". */
    order_id: string;
    /**
     * Ward the order is delivered to; "" when the order carries no ward_name.
     */
    ward_name: string;
    meal_type: MealSlot;
    /** From the linked DietPlan — always present (planless orders excluded). */
    diet_type: DietType;
}

/**
 * Orders for one meal slot, as a flat list. One entry per order, so a client
 * rendering a single meal_slot × diet_type cell can count or tabulate the rows
 * locally after filtering by diet_type.
 *
 * Cancelled orders are excluded, matching GET /api/kitchenschedule/summary and
 * the pivot. Planless orders are excluded too: with no diet_type they cannot
 * occupy a cell.
 */
export type KitchenScheduleSlotOrders = KitchenScheduleOrderItem[];

/** No meal_slot -> the pivot; with it -> that slot's flat order list. */
export type GetKitchenScheduleOrdersResponse =
    | KitchenScheduleOrdersPivot
    | KitchenScheduleSlotOrders;

/* ------------------------------------------------------------------ *
 * Writes
 * ------------------------------------------------------------------ */

/**
 * PUT /api/kitchenschedule/orders/:order_id/ready — flips one order's status
 * to Ready.
 *
 * The path segment is the business order_id; the backend looks it up on
 * order_id rather than the Mongo _id.
 *
 * No request body. The exact success payload is not pinned down yet, so both a
 * raw write result and the updated order are modelled and narrowed at runtime;
 * a write result reporting zero matches is treated as a failure so the modal
 * does not drop a row that was never written.
 */
export interface MarkKitchenScheduleOrderReadyWriteResult {
    acknowledged?: boolean;
    /** 0 when the order_id did not resolve to anything. */
    matchedCount?: number;
    modifiedCount?: number;
    upsertedCount?: number;
}

export type MarkKitchenScheduleOrderReadyResponse =
    | MarkKitchenScheduleOrderReadyWriteResult
    | KitchenScheduleOrderItem;

/**
 * PUT /api/kitchenschedule/orders/ready — bulk status transition for the
 * kitchen: move the listed orders to "Ready".
 *
 * The kitchen works from the /orders pivot, where one cell can hold many
 * orders, so the action is a bulk one. The "ready to dispatch" queue
 * (GET /api/mealdispatch/pending) reports exactly the orders this produces.
 *
 * The selection is identified by the body's ids, not a route param: a selection
 * can span several meal slots/wards, so no single order or schedule id can key
 * the request.
 */
export interface UpdateKitchenScheduleOrdersReadyBody {
    /**
     * Business ids of the orders to move to "Ready", e.g. ["ORD-000001"].
     *
     * Required and non-empty: an empty list is a 400, because a 200 would look
     * like a successful bulk action that changed nothing.
     */
    order_ids: string[];
}

/**
 * The outcome of a bulk "mark ready".
 *
 * Not every listed id necessarily moves:
 * - only orders still being prepared (status "Ordered" or "Approved") are
 *   moved, so an order already "Ready" is a no-op;
 * - a cancelled, dispatched, received or lost order is never reopened by this
 *   call — the same integrity rule mealdispatch.service.dispatchOrder() and
 *   bedsideDelivery.service enforce for a single order.
 *
 * An id that was not moved is reported rather than failing the whole request,
 * so one unknown or stale id in a multi-select does not discard the rest.
 */
export interface UpdateKitchenScheduleOrdersReadyResponse {
    /** Number of ids the request carried. */
    requested_count: number;
    /** Number of orders actually moved to "Ready". */
    updated_count: number;
    /** Number of requested ids left untouched. Equals skipped_order_ids.length. */
    skipped_count: number;
    /**
     * The requested ids that were not moved: unknown ids, and orders whose
     * status is not a preparation state. Empty when every id was moved.
     */
    skipped_order_ids: string[];
}

/* ------------------------------------------------------------------ *
 * POST /api/kitchenschedule
 * ------------------------------------------------------------------ */

/**
 * Fields the client owns when publishing a kitchen schedule — just the moment
 * and the meal slot. Everything else on the row is server-set:
 * - schedule_id          minted server-side via generateId (a SCHEDULE_ID
 *                        counter key must be registered; none exists yet).
 * - master_menu_item_ids left empty (nothing pinned to the schedule).
 * - assigned_chef_id     left null (unassigned).
 * - shift                falls back to the schema default, "Morning".
 * - createdAt / updatedAt  timestamps.
 */
export interface CreateKitchenScheduleBody {
    /**
     * The moment the schedule is for — the schema stores a single schedule_at
     * Date. ISO string; the server converts it to a Date. 400 if unparseable.
     */
    schedule_at: string;
    /** Meal to prepare; a MEAL_TYPE value, e.g. "Lunch". */
    meal_slot: MealSlot;
}

/**
 * The created schedule row.
 *
 * master_menu_item_ids is empty on a fresh schedule — nothing is pinned at
 * create time. When populated it holds raw MasterMenuItem ObjectIds (hex
 * strings once serialized), not business ids.
 */
export interface CreateKitchenScheduleResponse {
    /** Business id minted by the server, e.g. "KS-000001". */
    schedule_id: string;
    /** ISO timestamp; echoes the client's schedule_at. */
    schedule_at: string;
    meal_slot: MealSlot;
    /** Raw MasterMenuItem ObjectIds; [] on create. */
    master_menu_item_ids: string[];
    /** Raw Staff ObjectId, or null while unassigned. */
    assigned_chef_id: string | null;
    shift: FssaiShift;
    /** ISO timestamp. */
    createdAt: string;
    /** ISO timestamp. */
    updatedAt: string;
}
