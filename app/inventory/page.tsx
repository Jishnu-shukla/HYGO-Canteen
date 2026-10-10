"use client"

import AddBatchModal, { type AddBatchFormData } from "@/components/Inventory/AddBatchModal";
import AddItemModal from "@/components/Inventory/AddItemModal";
import InventoryFilters from "@/components/Inventory/InventoryFilters";
import { InventorySummaryCard } from "@/components/Inventory/InventorySummaryCard";
import InventoryTable from "@/components/Inventory/InventoryTable";
import SelectInventoryItemModal from "@/components/Inventory/SelectInventoryItemModal";
import { useFoodItemContext } from "@/context/FoodItemContext";
import { createInventoryBatchApi, getInventorySummaryApi } from "@/data/Inventory/api";
import { categories } from "@/data/Inventory/dummyData";
import { IinventorySummary, InventoryItem } from "@/data/Inventory/type";
import { useEffect, useState } from "react";

export default function Inventory() {

    const [loading, setLoading] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState(categories[0].name);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
    const [isSelectItemModalOpen, setIsSelectItemModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<
        Pick<InventoryItem, "item_id" | "item_name" | "unit_of_measure"> | null
    >(null);
    const [inventorySummary, setInventorySummary] = useState<IinventorySummary | null>(null);
    const { items, refreshItems } = useFoodItemContext()

    async function getInventorySummary() {
        try {
            setLoading(true)
            const data = await getInventorySummaryApi();
            setInventorySummary(data);
        } catch (error) {
            console.log(error);
        }
        finally{
            setLoading(false);
        }
    }

    // Step 1 of the add-batch flow: pick an existing inventory item.
    function openAddBatchPicker() {
        setIsSelectItemModalOpen(true);
    }

    // Step 2: the item is chosen, hand it to the batch form.
    function handleSelectItem(
        item: Pick<InventoryItem, "item_id" | "item_name" | "unit_of_measure">
    ) {
        setSelectedItem(item);
        setIsSelectItemModalOpen(false);
        setIsAddBatchModalOpen(true);
    }

    // Submits the batch for the selected item, then re-syncs the inventory
    // list from the API so the fresh batch shows up in the table.
    async function handleAddBatch(data: AddBatchFormData) {
        if (!selectedItem?.item_id) return;

        try {
            setLoading(true);
            console.log("Submitting form data with selectedItem id is:", selectedItem);
            await createInventoryBatchApi(selectedItem.item_id, {
                batch_number: data.batch_number,
                received_date: data.received_date,
                expiry_date: data.expiry_date,
                initial_quantity: Number(data.initial_quantity),
                current_quantity: Number(data.current_quantity),
                unit_cost: Number(data.unit_cost),
            });
            setIsAddBatchModalOpen(false);
            refreshItems();
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    }
    
    useEffect(() => {
        getInventorySummary()
    }, [])
    

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                            Kitchen Inventory
                        </h1>

                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            SERVICE
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-amber-800/80">
                        FIFO stock levels, expiry tracking, and auto purchase orders.
                    </p>
                </div>

                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={() => setIsAddItemModalOpen(true)}
                        className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 cursor-pointer"
                    >
                        Add Item
                    </button>
                    <button
                        type="button"
                        onClick={openAddBatchPicker}
                        className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 cursor-pointer"
                    >
                        Add Batch
                    </button>
                </div>
            </section>

            {/* CARDS */}
            <section className="mb-5 grid grid-cols-1 gap-3 mx-auto sm:grid-cols-2 xl:grid-cols-4">
                <InventorySummaryCard title="Low Stock" value={inventorySummary?.low_stock ?? 0} />
                <InventorySummaryCard title="Pre Ordered" value={inventorySummary?.preorder ?? 0} />
                <InventorySummaryCard title="Recently added" value={inventorySummary?.recently_added ?? 0} />
                <InventorySummaryCard title="Category" value={inventorySummary?.categories ?? 0} />
            </section>
            <InventoryFilters
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
            />
            <InventoryTable
                items={items}
            />

            <AddItemModal
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                onNext={(data) => {
                    // Carry the freshly defined item into the batch step so the
                    // form is pre-framed for it (item_id is still empty here —
                    // the server assigns it, so batch submission waits).
                    setSelectedItem({
                        item_id: "",
                        item_name: data.item_name,
                        unit_of_measure: data.unit_of_measure,
                    });
                    setIsAddBatchModalOpen(true);
                }}
            />

            {/* A fresh key each time it opens remounts the picker, which
                resets its internal search bar without an effect. */}
            <SelectInventoryItemModal
                key={String(isSelectItemModalOpen)}
                isOpen={isSelectItemModalOpen}
                onClose={() => setIsSelectItemModalOpen(false)}
                onSelect={handleSelectItem}
                items={items}
            />

            <AddBatchModal
                isOpen={isAddBatchModalOpen}
                onClose={() => setIsAddBatchModalOpen(false)}
                onSubmit={handleAddBatch}
                itemName={selectedItem?.item_name}
                unitOfMeasure={selectedItem?.unit_of_measure}
            />
        </main>
    )
}