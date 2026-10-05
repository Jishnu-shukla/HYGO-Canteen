export const categories = [
    {
        name: "Dry Goods",
        count: 1
    },
    {
        name: "Produce",
        count: 1
    },
    {
        name: "Dairy",
        count: 1
    },
    {
        name: "Medical Nutrition",
        count: 1
    },
    {
        name: "Beverages",
        count: 1
    },
    {
        name: "Cleaning",
        count: 1
    },
    {
        name: "Grains",
        count: 1
    },
    {
        name: "Pulses",
        count: 1
    }
]
//export interface InventoryTableItem {
//     item_id: string;
//     item_name: string;
//     category: string;
//     unit_of_measure: string;
//     threshold_quantity: number;
//     is_preordered: boolean;
//     batches: InventoryBatch[];
// }
export const inventoryItems = [
    {
        item_id: "1",
        item_name: "Rice",
        category: "Grains",
        unit_of_measure: "kg",
        threshold_quantity: 50,
        is_preordered: false,
        batches: [{
            batch_number: "B001",
            received_date: "2026-01-01",
            initial_quantity: 100,
            current_quantity: 50,
            expiry: "2026-12-31",
            unit_cost: 1.5,
        }]
    },
    {
        item_id: "2",
        item_name: "Wheat",
        category: "Grains",
        unit_of_measure: "kg",
        threshold_quantity: 30,
        is_preordered: false,
        batches: [{
            batch_number: "B002",
            received_date: "2026-01-01",
            initial_quantity: 50,
            current_quantity: 30,
            expiry: "2026-11-30",
            unit_cost: 1.2,
        }]
    },
    {
        item_id: "3",
        item_name: "Milk",
        category: "Dairy",
        unit_of_measure: "liters",
        threshold_quantity: 20,
        is_preordered: false,
        batches: [{
            batch_number: "B003",
            received_date: "2026-01-01",
            initial_quantity: 50,
            current_quantity: 20,
            expiry: "2026-10-31",
            unit_cost: 2.5
        }]
    },
    {
        item_id: "4",
        item_name: "Cheese",
        category: "Dairy",
        unit_of_measure: "kg",
        threshold_quantity: 10,
        is_preordered: false,
        batches: [{
            batch_number: "B004",
            received_date: "2026-01-01",
            initial_quantity: 30,
            current_quantity: 10,
            expiry: "2026-09-30",
            unit_cost: 3.0  
        }]
    },
    {
        item_id: "5",
        item_name: "Eggs",
        category: "Dairy",
        unit_of_measure: "dozen",
        threshold_quantity: 15,
        is_preordered: false,
        batches: [{
            batch_number: "B005",
            received_date: "2026-01-01",
            initial_quantity: 50,
            current_quantity: 15,
            expiry: "2026-10-31",
            unit_cost: 2.0
        }]
    }
]