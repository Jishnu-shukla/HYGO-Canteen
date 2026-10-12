import { DeleteInventoryQuery, UpdateInventoryBody, UpdateInventoryPreorderBody, UpdateInventoryPreorderResponse, addBatchItem, addInventoryItem } from "@/data/Inventory/type";

export async function getInventoryItemsApi() {
    try {
        const data = await fetch('https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory');
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
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