"use client"

import AddBatchModal, { type AddBatchFormData } from "@/components/Inventory/AddBatchModal";
import AddItemModal, { type AddItemFormData } from "@/components/Inventory/AddItemModal";
import DeleteConfirmModal from "@/components/Inventory/DeleteConfirmModal";
import EditBatchModal from "@/components/Inventory/EditBatchModal";
import EditItemModal from "@/components/Inventory/EditItemModal";
import InventoryFilters from "@/components/Inventory/InventoryFilters";
import { InventorySummaryCard } from "@/components/Inventory/InventorySummaryCard";
import InventoryTable from "@/components/Inventory/InventoryTable";
import SelectInventoryItemModal from "@/components/Inventory/SelectInventoryItemModal";
import { useFoodItemContext } from "@/context/FoodItemContext";
import { EMPTY_INVENTORY_PAGINATION, INVENTORY_PAGE_SIZE, createInventoryBatchApi, createInventoryItemApi, deleteInventoryBatchApi, deleteInventoryItemApi, getInventoryItemsApi, getInventorySummaryApi, updateInventoryItemApi, updateInventoryPreorderApi } from "@/data/Inventory/api";
import { categories } from "@/data/Inventory/dummyData";
import { IinventorySummary, InventoryBatch, InventoryItem, InventoryPagination, InventoryTableItem, UpdateInventoryBatchFields, UpdateInventoryFields } from "@/data/Inventory/type";
import { useCallback, useEffect, useState } from "react";

export default function Inventory() {

    const [loading, setLoading] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState(categories[0].name);
    const [search, setSearch] = useState("");
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
    const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
    const [isSelectItemModalOpen, setIsSelectItemModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<
        Pick<InventoryItem, "item_id" | "item_name" | "unit_of_measure"> | null
    >(null);
    const [inventorySummary, setInventorySummary] = useState<IinventorySummary | null>(null);
    const [editingItem, setEditingItem] = useState<InventoryTableItem | null>(null);
    const [editingBatch, setEditingBatch] = useState<
        { item: InventoryTableItem; batch: InventoryBatch } | null
    >(null);
    const [deletingItem, setDeletingItem] = useState<InventoryTableItem | null>(null);
    const [deletingBatch, setDeletingBatch] = useState<
        { item: InventoryTableItem; batch: InventoryBatch } | null
    >(null);
    // Pre-order toggle: which row's button is mid-flight, and the last failure
    // to show above the table.
    const [poBusyItemId, setPoBusyItemId] = useState<string | null>(null);
    const [poError, setPoError] = useState("");
    const { items, refreshItems: refreshContextItems } = useFoodItemContext()

    // The table holds its own server-paginated slice, independent of the
    // context's broader item list (which feeds the batch picker and recipes).
    const [tableItems, setTableItems] = useState<InventoryItem[]>([]);
    const [pagination, setPagination] = useState<InventoryPagination>(
        EMPTY_INVENTORY_PAGINATION
    );
    const [page, setPage] = useState(1);
    const [isTableLoading, setIsTableLoading] = useState(true);

    // Loads one server page of inventory for the table. Returns the resolved
    // pagination so callers can react to row counts changing.
    const fetchInventoryPage = useCallback(
        async (
            targetPage: number,
            targetSearch: string
        ): Promise<InventoryPagination> => {
            try {
                setIsTableLoading(true);

                const { data, pagination: meta } = await getInventoryItemsApi({
                    page: targetPage,
                    limit: INVENTORY_PAGE_SIZE,
                    search: targetSearch,
                });

                setTableItems(data);
                setPagination(meta);

                return meta;
            } catch (error) {
                console.log(error);
                return EMPTY_INVENTORY_PAGINATION;
            } finally {
                setIsTableLoading(false);
            }
        },
        []
    );

    // Re-syncs the table's current page and the context list (which feeds the
    // batch picker and recipes) after any inventory mutation. Steps back a page
    // when the delete left the current page empty.
    async function refreshInventory() {
        refreshContextItems();

        const meta = await fetchInventoryPage(page, search);

        if (meta.total_pages > 0 && page > meta.total_pages) {
            const lastPage = meta.total_pages;
            setPage(lastPage);
            fetchInventoryPage(lastPage, search);
        }
    }

    function handlePageChange(nextPage: number) {
        setPage(nextPage);
        fetchInventoryPage(nextPage, search);
    }

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

    // Creates the inventory item, then hands the freshly created item (with
    // its server-assigned item_id) straight to the batch form. Errors bubble
    // up so the modal can show them and stay open.
    async function handleAddItem(data: AddItemFormData) {
        const createdItem = await createInventoryItemApi({
            item_name: data.item_name,
            category: data.category,
            unit_of_measure: data.unit_of_measure,
            stock_type: data.stock_type,
            threshold_quantity: Number(data.threshold_quantity),
            storage_location: data.storage_location,
        });

        setIsAddItemModalOpen(false);
        refreshInventory();

        setSelectedItem({
            item_id: createdItem?.item_id ?? "",
            item_name: createdItem?.item_name ?? data.item_name,
            unit_of_measure:
                createdItem?.unit_of_measure ?? data.unit_of_measure,
        });
        setIsAddBatchModalOpen(true);
    }

    // Submits the batch for the selected item, then re-syncs the inventory
    // list from the API so the fresh batch shows up in the table.
    async function handleAddBatch(data: AddBatchFormData) {
        if (!selectedItem?.item_id) {
            throw new Error("No inventory item selected for this batch.");
        }

        await createInventoryBatchApi(selectedItem.item_id, {
            batch_number: data.batch_number,
            received_date: data.received_date,
            expiry_date: data.expiry_date,
            initial_quantity: Number(data.initial_quantity),
            current_quantity: Number(data.current_quantity),
            unit_cost: Number(data.unit_cost),
        });

        setIsAddBatchModalOpen(false);
        refreshInventory();
    }

    // Updates the inventory item document (PUT /api/inventory/:item_id). Errors
    // bubble up to the modal so it stays open and shows the message.
    async function handleEditItem(data: UpdateInventoryFields) {
        if (!editingItem?.item_id) {
            throw new Error("No inventory item selected for editing.");
        }

        await updateInventoryItemApi(editingItem.item_id, { inventory: data });

        setEditingItem(null);
        refreshInventory();
        getInventorySummary();
    }

    // Updates a single batch, scoped to its parent item, in one PUT request.
    async function handleEditBatch(data: UpdateInventoryBatchFields) {
        if (!editingBatch?.item.item_id) {
            throw new Error("No inventory item selected for editing.");
        }

        await updateInventoryItemApi(editingBatch.item.item_id, {
            batch: data,
        });

        setEditingBatch(null);
        refreshInventory();
        getInventorySummary();
    }

    // Deletes the whole inventory item (and its remaining batches).
    async function handleDeleteItem() {
        if (!deletingItem?.item_id) {
            throw new Error("No inventory item selected for deletion.");
        }

        await deleteInventoryItemApi(deletingItem.item_id);

        setDeletingItem(null);
        refreshInventory();
        getInventorySummary();
    }

    // Deletes a single batch, scoped to its parent item.
    async function handleDeleteBatch() {
        if (!deletingBatch?.item.item_id || !deletingBatch.batch.batch_id) {
            throw new Error("No batch selected for deletion.");
        }

        await deleteInventoryBatchApi(
            deletingBatch.item.item_id,
            deletingBatch.batch.batch_id
        );

        setDeletingBatch(null);
        refreshInventory();
        getInventorySummary();
    }

    // Raises a pre-order, or cancels the existing one. One row at a time via
    // poBusyItemId, and the list plus the Pre Ordered card both re-sync from
    // the server so the button and the count never drift.
    async function handlePOTrigger(item: InventoryTableItem) {
        if (!item.item_id || poBusyItemId) return;

        setPoBusyItemId(item.item_id);
        setPoError("");

        try {
            await updateInventoryPreorderApi(item.item_id, {
                is_preordered: !item.is_preordered,
            });

            refreshInventory();
            getInventorySummary();
        } catch (error) {
            console.log(error);
            setPoError(
                error instanceof Error && error.message
                    ? error.message
                    : "Could not update the pre-order status. Please try again."
            );
        } finally {
            setPoBusyItemId(null);
        }
    }

    useEffect(() => {
        getInventorySummary()
    }, [])

    // The table fetch doubles as the mount load and the debounced server-side
    // search: a new query resets the table to page 1.
    useEffect(() => {
        const handle = setTimeout(
            () => {
                setPage(1);
                fetchInventoryPage(1, search);
            },
            search ? 300 : 0
        );

        return () => clearTimeout(handle);
    }, [search, fetchInventoryPage])
    

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
                search={search}
                onSearchChange={setSearch}
            />

            {poError && (
                <div
                    role="alert"
                    className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5"
                >
                    <p className="text-xs font-medium text-red-600">
                        {poError}
                    </p>

                    <button
                        type="button"
                        onClick={() => setPoError("")}
                        className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-[10px] font-semibold text-red-600 transition hover:bg-red-100"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <InventoryTable
                items={tableItems}
                loading={isTableLoading}
                pagination={pagination}
                onPageChange={handlePageChange}
                onEdit={(item) => setEditingItem(item)}
                onDelete={(item) => setDeletingItem(item)}
                onEditBatch={(item, batch) =>
                    setEditingBatch({ item, batch })
                }
                onDeleteBatch={(item, batch) =>
                    setDeletingBatch({ item, batch })
                }
                onPOTrigger={handlePOTrigger}
                poBusyId={poBusyItemId}
            />

            <AddItemModal
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                onSubmit={handleAddItem}
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

            {/* Mounted fresh each time a target is picked, so the form state is
                initialised from the selected item/batch without an effect. */}
            {editingItem && (
                <EditItemModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSubmit={handleEditItem}
                />
            )}

            {editingBatch && (
                <EditBatchModal
                    batch={editingBatch.batch}
                    itemName={editingBatch.item.item_name}
                    unitOfMeasure={editingBatch.item.unit_of_measure}
                    onClose={() => setEditingBatch(null)}
                    onSubmit={handleEditBatch}
                />
            )}

            {deletingItem && (
                <DeleteConfirmModal
                    title="Delete inventory item?"
                    message={`This will permanently remove ${deletingItem.item_name} and all of its batches. This action cannot be undone.`}
                    confirmLabel="Delete Item"
                    onCancel={() => setDeletingItem(null)}
                    onConfirm={handleDeleteItem}
                />
            )}

            {deletingBatch && (
                <DeleteConfirmModal
                    title="Delete batch?"
                    message={`This will permanently remove batch ${deletingBatch.batch.batch_number} from ${deletingBatch.item.item_name}. This action cannot be undone.`}
                    confirmLabel="Delete Batch"
                    onCancel={() => setDeletingBatch(null)}
                    onConfirm={handleDeleteBatch}
                />
            )}
        </main>
    )
}