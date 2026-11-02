/* ------------------------------------------------------------------ *
 * Shared inventory documents
 * ------------------------------------------------------------------ */

/** Values accepted by the schema's `category` enum. */
export const INVENTORY_CATEGORIES = [
    "Dry_Goods",
    "Produce",
    "Dairy",
    "Medical_Nutrition",
    "Beverages",
    "Cleaning",
    "Grains",
    "Pulses",
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

/** Whether the item attracts GST. */
export const INVENTORY_TAX_TYPES = ["taxable", "non-taxable"] as const;

export type InventoryTaxType = (typeof INVENTORY_TAX_TYPES)[number];

/**
 * A single inventory document as returned by writes (POST/PUT/DELETE) — the
 * plain stored record, without GET's batch roll-ups.
 *
 * Dates are ISO 8601 strings on the wire. Raw Mongo `_id` / `__v` are also
 * present at runtime but are omitted here — clients key off the business
 * `item_id`.
 */
export interface InventoryRecord {
    item_id: string;
    item_name: string;
    category: InventoryCategory;
    /** Whether the item attracts GST. */
    tax_type: InventoryTaxType;
    /** Default GST percentage applied to the item, e.g. 5 for 5%. */
    default_gst: number;
    unit_of_measure: string;
    stock_pre_usage: boolean;
    stock_post_usage: boolean;
    threshold_quantity: number;
    storage_location: string;
    is_preordered: boolean;
    updated_by: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * A single batch document, shared by GET /api/inventory (embedded under
 * `item.batches`) and DELETE /api/inventory/:item_id?type=batch.
 *
 * The $lookup pulls whole InventoryBatch documents, so every batch carries its
 * own expiry_date / received_date. Dates are ISO 8601 strings on the wire; raw
 * `_id` / `item_id` / timestamps are omitted here.
 */
export interface InventoryBatchRecord {
    batch_id: string;
    batch_number: string;
    received_date: string;
    /** ISO 8601, or null when the batch was created without an expiry. */
    expiry_date: string | null;
    initial_quantity: number;
    current_quantity: number;
    unit_cost: number;
    /** GST percentage applied to this batch, e.g. 5 for 5%. */
    gst: number;
    /** Total amount for the batch after GST. */
    grand_total: number;
    /** Cloudinary URL of the bill (PDF/PNG/JPG), or null when not uploaded. */
    bill_image?: string | null;
}

/* ------------------------------------------------------------------ *
 * GET /api/inventory
 * ------------------------------------------------------------------ */

/**
 * GET /api/inventory list row: an InventoryRecord plus the roll-ups
 * getAll() adds with $addFields.
 */
export interface InventoryItem extends InventoryRecord {
    /** Batches joined on InventoryBatch.item_id -> Inventory._id. */
    batches: InventoryBatchRecord[];
    /** Sum of the item's batches[].current_quantity. */
    total_quantity: number;
    batch_count: number;
    /** Derived from the stock flags — post-usage wins when set. */
    stock_type: "stock_post_usage" | "stock_pre_usage";
}

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

/* ------------------------------------------------------------------ *
 * POST /api/inventory
 * ------------------------------------------------------------------ */

/**
 * POST /api/inventory request body.
 *
 * item_id is intentionally absent — it is minted server-side via
 * generateId("INVENTORY_ID", "ITEM"). stock_pre_usage / stock_post_usage
 * are not accepted here: they default to false on create and are toggled
 * through PUT /api/inventory/:item_id.
 */
export interface CreateInventoryItemBody {
    item_name: string;
    category: InventoryCategory;
    /** Whether the item attracts GST. */
    tax_type: InventoryTaxType;
    /** Default GST percentage applied to the item, e.g. 5 for 5%. */
    default_gst: number;
    unit_of_measure: string;
    threshold_quantity?: number;
    storage_location?: string;
    is_preordered?: boolean;
}

/** POST /api/inventory/:item_id/batch request body. */
export interface CreateInventoryBatchBody {
    batch_number: string;
    initial_quantity: number;
    /** Defaults to initial_quantity when omitted. */
    current_quantity?: number;
    received_date?: Date;
    expiry_date?: Date;
    unit_cost?: number;
    /** GST percentage; defaults to the inventory item's default_gst, then 0. */
    gst?: number;
    /** Total after GST; may be computed server-side when omitted. */
    grand_total?: number;
    /** Cloudinary URL from the bill upload; null when no bill is attached. */
    bill_image?: string | null;
}

/**
 * POST /api/inventory/bill (multipart/form-data) — the Cloudinary URL of the
 * uploaded bill, ready to save as batch.bill_image in the next create/update.
 */
export interface UploadInventoryBatchBillResponse {
    /** Public HTTPS URL of the uploaded bill. */
    url: string;
}

/* ------------------------------------------------------------------ *
 * PUT /api/inventory/:item_id  (shared: inventory item and/or batch)
 * ------------------------------------------------------------------ */

/**
 * Inventory-document fields accepted by PUT /api/inventory/:item_id.
 *
 * A partial update — omitted fields are left unchanged. item_id is the
 * immutable business id and is not accepted here; createdAt / updatedAt are
 * managed by Mongoose timestamps. stock_pre_usage / stock_post_usage —
 * rejected by POST /api/inventory — are toggled here.
 */
export interface UpdateInventoryFields {
    item_name?: string;
    category?: InventoryCategory;
    tax_type?: InventoryTaxType;
    /** Default GST percentage; must be >= 0 when supplied. */
    default_gst?: number;
    unit_of_measure?: string;
    threshold_quantity?: number;
    storage_location?: string;
    is_preordered?: boolean;
    stock_pre_usage?: boolean;
    stock_post_usage?: boolean;
    /** ObjectId string of the user making the change (schema ref: "User"). */
    updated_by?: string;
}

/**
 * Single-batch fields accepted by PUT /api/inventory/:item_id.
 *
 * `batch_id` selects the batch, scoped to the item in the URL — it is the only
 * required field and is not itself writable, nor is item_id. Every other field
 * is optional and left unchanged when omitted.
 */
export interface UpdateInventoryBatchFields {
    /** Business id of the batch to update, e.g. "BATCH-000001". */
    batch_id: string;
    batch_number?: string;
    initial_quantity?: number;
    current_quantity?: number;
    received_date?: Date;
    expiry_date?: Date;
    unit_cost?: number;
    gst?: number;
    grand_total?: number;
    /** Set to a new upload URL or null to clear the bill. */
    bill_image?: string | null;
}

/** The service accepts `inventory` and/or `batch` in one PUT request. */
export interface UpdateInventoryBody {
    inventory?: UpdateInventoryFields;
    batch?: UpdateInventoryBatchFields;
}

/** PUT answers with the updated item and/or batch. */
export interface UpdateInventoryItemResponse {
    item: InventoryRecord | null;
    batch: InventoryBatchRecord | null;
}

// DELETE /api/inventory/:item_id?type=inventory|batch
export type InventoryDeleteType = "inventory" | "batch";

export interface DeleteInventoryQuery {
    type: InventoryDeleteType;
    /** Business id of the batch to delete, e.g. "BATCH-000001". type=batch only. */
    batch_id?: string;
}

/** DELETE answers with what was removed, under `item` or `batch`. */
export interface DeleteInventoryResponse {
    type: InventoryDeleteType;
    deleted: boolean;
    /** Present when type=inventory. */
    item?: InventoryRecord;
    /** Present when type=batch. */
    batch?: InventoryBatchRecord;
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
