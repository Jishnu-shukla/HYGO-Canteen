export interface InventoryBatch {
    batch_number: string;
    received_date: string;
    expiry: string;
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