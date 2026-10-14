export interface InventoryBatch {
    batch_id: string;
    batch_number: string;
    received_date: string;
    expiry_date: string | null;
    initial_quantity: number;
    current_quantity: number;
    unit_cost: number;
}

/**
 * The stored Inventory record, without the batch roll-ups GET /api/inventory
 * adds. `stock_type` is not persisted: the two stock flags below are, and the
 * GET derives `stock_type` from them.
 */
export interface InventoryRecord {
    item_id: string;
    item_name: string;
    category: string;
    unit_of_measure: string;
    threshold_quantity: number;
    is_preordered: boolean;
    storage_location?: string;
    stock_pre_usage?: boolean;
    stock_post_usage?: boolean;
}

/**
 * GET /api/inventory list row: an InventoryRecord plus the roll-ups
 * getAll() adds with $addFields.
 */
export interface InventoryItem extends InventoryRecord {
    /** Batches joined on InventoryBatch.item_id -> Inventory._id. */
    batches: InventoryBatch[];
    /** Sum of the item's batches[].current_quantity. */
    total_quantity: number;
    batch_count: number;
    /** Derived from the stock flags — post-usage wins when set. */
    stock_type: "stock_post_usage" | "stock_pre_usage";
}

/* ------------------------------------------------------------------ *
 * GET /api/inventory
 * ------------------------------------------------------------------ */

/** GET /api/inventory?page=1&limit=10&search=rice */
export interface GetInventoryQuery {
    /** 1-based. Defaults to 1. */
    page?: number;
    /** Page size. Defaults to 10, capped at 100. */
    limit?: number;
    /**
     * Case-insensitive substring match on item_name or item_id. A blank or
     * omitted value searches nothing (every item matches), and the match is
     * applied before pagination, so pagination.total counts the matches.
     */
    search?: string;
}

/** Page metadata, so the UI can render a pager without a second request. */
export interface InventoryPagination {
    page: number;
    limit: number;
    /** Total matching rows across all pages. */
    total: number;
    total_pages: number;
}

/**
 * One page of inventory, newest first, each row carrying its batches.
 *
 * data is only the requested page while pagination.total describes the whole
 * collection, so the UI can render a pager — the same envelope every other
 * paginated GET (dietorder, dietplan, assessments, platewaste) returns.
 */
export interface GetInventoryResponse {
    data: InventoryItem[];
    pagination: InventoryPagination;
}

export interface IinventorySummary {
    low_stock: number;
    preorder: number;
    recently_added: number;
    categories: number
}
//Inventory Table

// export interface InventoryBatch {
//     batch_number: string;
//     initial_quantity: number;
//     current_quantity?: number;
//     expiry: string | Date;
// }

/**
 * Row shape the inventory table and its modals render. That is exactly the GET
 * list row, so it is aliased rather than duplicated.
 */
export type InventoryTableItem = InventoryItem;

//filters

export interface InventoryFilterCategory {
    name: string;
    count: number;
}

// API payloads. Named lowercase because data/Inventory/api.ts already
// references them under these names in its function signatures.
export interface addInventoryItem {
    item_name: string;
    category: string;
    unit_of_measure: string;
    stock_type: "stock_pre_usage" | "stock_post_usage";
    threshold_quantity: number;
    storage_location: string;
}

export interface addBatchItem {
    batch_number: string;
    received_date: string;
    expiry_date: string;
    initial_quantity: number;
    current_quantity: number;
    unit_cost: number;
}

// PUT /api/inventory/:item_id payloads. The endpoint is shared by the item and
// its batches: send `inventory` and/or `batch`. `batch.batch_id` selects which
// batch to update, scoped to the item in the URL.
export interface UpdateInventoryFields {
    item_name?: string;
    category?: string;
    unit_of_measure?: string;
    threshold_quantity?: number;
    storage_location?: string;
    is_preordered?: boolean;
    stock_pre_usage?: boolean;
    stock_post_usage?: boolean;
    updated_by?: string;
}

export interface UpdateInventoryBatchFields {
    batch_id: string;
    batch_number?: string;
    initial_quantity?: number;
    current_quantity?: number;
    received_date?: string;
    expiry_date?: string;
    unit_cost?: number;
}

export interface UpdateInventoryBody {
    inventory?: UpdateInventoryFields;
    batch?: UpdateInventoryBatchFields;
}

// DELETE /api/inventory/:item_id?type=inventory|batch
export type InventoryDeleteType = "inventory" | "batch";

export interface DeleteInventoryQuery {
    type: InventoryDeleteType;
    /** Business id of the batch to delete, e.g. "BATCH-000001". type=batch only. */
    batch_id?: string;
}

// PUT /api/inventory/:item_id/po — the pre-order toggle.

/** Route param: PUT /api/inventory/:item_id/po */
export interface UpdateInventoryPreorderParams {
    /**
     * Business id, e.g. "ITEM-000001". Optional at the type level only — the
     * controller's 400 guard enforces presence.
     */
    item_id?: string;
}

/**
 * A focused alternative to the shared PUT /api/inventory/:item_id for the
 * single `is_preordered` flag: true raises a pre-order for the item, false
 * cancels one. The item is the route param, so nothing else is touched.
 */
export interface UpdateInventoryPreorderBody {
    is_preordered: boolean;
}

/**
 * The item after the status change, in the shared InventoryRecord shape the
 * other inventory writes return (no GET batch roll-ups).
 */
export type UpdateInventoryPreorderResponse = InventoryRecord;