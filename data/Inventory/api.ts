import {
    DeleteInventoryQuery,
    GetInventoryQuery,
    GetInventoryResponse,
    InventoryItem,
    InventoryPagination,
    UpdateInventoryBody,
    UpdateInventoryPreorderBody,
    UpdateInventoryPreorderResponse,
    addBatchItem,
    addInventoryItem,
} from "@/data/Inventory/type";

/** Page size used by the inventory table's pager. */
export const INVENTORY_PAGE_SIZE = 10;

/**
 * Page size the shared context requests. The server caps `limit` at 100, so
 * this pulls every item the batch picker and recipe form are allowed to see,
 * independent of which page the table is showing.
 */
export const INVENTORY_FETCH_LIMIT = 100;

export const EMPTY_INVENTORY_PAGINATION: InventoryPagination = {
    page: 1,
    limit: INVENTORY_PAGE_SIZE,
    total: 0,
    total_pages: 1,
};

/**
 * Builds a single-page fallback when the server sends no `pagination` block,
 * so the UI degrades to "everything on page 1" instead of empty pages.
 */
function fallbackPagination(page: number, limit: number, rowCount: number): InventoryPagination {
    return { page, limit, total: rowCount, total_pages: 1 };
}

/**
 * GET /api/inventory?page=&limit=&search= — newest first, each row carrying
 * its batches and the total_quantity / batch_count / stock_type roll-ups.
 *
 * The paginated response is doubly nested:
 *   { statusCode, message, success, data: { data: [...], pagination } }
 * Older/other endpoints put the rows directly on `data`, so both are accepted
 * to stay tolerant of either shape.
 */
export async function getInventoryItemsApi(
    query: GetInventoryQuery = {}
): Promise<GetInventoryResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? INVENTORY_FETCH_LIMIT;

    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    const search = query.search?.trim();
    if (search) {
        params.set("search", search);
    }

    try {
        const response = await fetch(
            `https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory?${params.toString()}`
        );
        const jsonData = await response.json();
        console.log(jsonData);

        const payload = jsonData?.data;
        const rows: InventoryItem[] = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        const pagination: InventoryPagination =
            payload?.pagination &&
            typeof payload.pagination.total_pages === "number"
                ? payload.pagination
                : fallbackPagination(page, limit, rows.length);

        return { data: rows, pagination };
    } catch (error) {
        console.log(error);
        return { data: [], pagination: fallbackPagination(page, limit, 0) };
    }
} 

export async function getInventorySummaryApi() {
    try {
        const data = await fetch('https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory/summary');
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
} 

export async function createInventoryItemApi(inventoryItem: addInventoryItem) {
    try {
        const data = await fetch('https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(inventoryItem)
        });
        const jsonData = await data.json();
        console.log(jsonData);

        if (!data.ok || !jsonData?.data) {
            throw new Error(jsonData?.message || "Failed to create inventory item.");
        }

        return jsonData.data;
    } catch (error) {
        console.log(error);
        throw error;
    }
}
export async function createInventoryBatchApi(item_id: string, batchItem: addBatchItem) {
    try {
        const data = await fetch(`https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory/${item_id}/batch`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(batchItem)
        });
        const jsonData = await data.json();
        console.log(jsonData);

        if (!data.ok || !jsonData?.data) {
            throw new Error(jsonData?.message || "Failed to create inventory batch.");
        }

        return jsonData.data;
    } catch (error) {
        console.log(error);
        throw error;
    }
} 

export async function updateInventoryItemApi(item_id: string, body: UpdateInventoryBody) {
    try {
        const data = await fetch(`https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory/${item_id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        const jsonData = await data.json();
        console.log(jsonData);

        if (!data.ok || !jsonData?.data) {
            throw new Error(jsonData?.message || "Failed to update inventory item.");
        }

        return jsonData.data;
    } catch (error) {
        console.log(error);
        throw error;
    }
} 

/**
 * PUT /api/inventory/:item_id/po — raises (true) or cancels (false) the
 * item's pre-order. A focused alternative to the shared item PUT so the PO
 * toggle cannot touch any other field.
 *
 * Throws on failure so the caller can surface the reason and leaves the caller
 * to refresh the list and the summary counters.
 */
export async function updateInventoryPreorderApi(
    item_id: string,
    body: UpdateInventoryPreorderBody
): Promise<UpdateInventoryPreorderResponse> {
    try {
        const data = await fetch(`https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory/${item_id}/po`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        const jsonData = await data.json();
        console.log(jsonData);

        if (!data.ok || !jsonData?.data) {
            throw new Error(jsonData?.message || "Failed to update pre-order status.");
        }

        return jsonData.data as UpdateInventoryPreorderResponse;
    } catch (error) {
        console.log(error);
        throw error;
    }
} 

// Shared DELETE for the inventory item and its batches. `type` selects what is
// removed; `batch_id` is required when type=batch.
async function deleteInventoryApi(item_id: string, query: DeleteInventoryQuery) {
    try {
        const params = new URLSearchParams({ type: query.type });

        if (query.batch_id) {
            params.set("batch_id", query.batch_id);
        }

        const data = await fetch(`https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory/${item_id}?${params.toString()}`, {
            method: "DELETE",
        });
        const jsonData = await data.json();
        console.log(jsonData);

        if (!data.ok || !jsonData?.data) {
            throw new Error(jsonData?.message || "Failed to delete inventory record.");
        }

        return jsonData.data;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

/** Deletes the whole inventory item (and its remaining batches). */
export function deleteInventoryItemApi(item_id: string) {
    return deleteInventoryApi(item_id, { type: "inventory" });
}

/** Deletes a single batch, scoped to its parent item. */
export function deleteInventoryBatchApi(item_id: string, batch_id: string) {
    return deleteInventoryApi(item_id, { type: "batch", batch_id });
}