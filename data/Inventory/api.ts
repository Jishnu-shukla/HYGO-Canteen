import { addBatchItem, addInventoryItem } from "@/data/Inventory/type";

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
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}
export async function createInventoryBatchApi(item_id: string, batchItem: addBatchItem) {
    try {
        const data = await fetch(`https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory/${item_id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(batchItem)
        });
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
} 

export async function updateInventoryItemApi(item_id: string, inventoryItem: addInventoryItem, batchItem: addBatchItem) {
    try {
        const data = await fetch(`https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory/${item_id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                batchItem, inventoryItem
            })
        });
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
} 

export async function deleteInventoryItemApi(item_id: string) {
    try {
        const data = await fetch(`https://4jzhg556-5000.inc1.devtunnels.ms/api/inventory/${item_id}`, {
            method: "PUT",
        });
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}