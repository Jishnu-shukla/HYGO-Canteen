export interface InventoryBatch {
    batch_id: string;
    batch_number: string;
    received_date: string;
    expiry_date: string | null;
    initial_quantity: number;
    current_quantity: number;
    unit_cost: number;
}

export interface InventoryItem {
    item_id: string;
    item_name: string;
    category: string;
    unit_of_measure: string;
    threshold_quantity: number;
    is_preordered: boolean;
    storage_location?: string;
    stock_type?: "stock_pre_usage" | "stock_post_usage";
    batches: InventoryBatch[];
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

export interface InventoryTableItem {
    item_id: string;
    item_name: string;
    category: string;
    unit_of_measure: string;
    threshold_quantity: number;
    is_preordered: boolean;
    storage_location?: string;
    stock_type?: "stock_pre_usage" | "stock_post_usage";
    batches: InventoryBatch[];
}

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
 * other inventory writes return (no GET batch roll-ups). That shape is what
 * the client already models as InventoryItem.
 */
export type UpdateInventoryPreorderResponse = InventoryItem;