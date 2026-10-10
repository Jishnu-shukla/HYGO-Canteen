"use client";

import { PackageSearch, Search } from "lucide-react";
import { useState } from "react";
import { InventoryItem } from "@/data/Inventory/type";

interface SelectInventoryItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: InventoryItem) => void;
    items: InventoryItem[];
}

/** Total stock currently on hand for an item, across all of its batches. */
function getTotalStock(item: InventoryItem): number {
    return (item.batches ?? []).reduce(
        (total, batch) =>
            total +
            Number(batch.current_quantity ?? batch.initial_quantity ?? 0),
        0
    );
}

/**
 * Step 1 of the "Add Batch" flow. Shows every inventory item (pulled from the
 * FoodItemContext) so the user can pick which item a new batch belongs to.
 * The parent then opens the batch form with the selected item in context.
 */
export default function SelectInventoryItemModal({
    isOpen,
    onClose,
    onSelect,
    items,
}: SelectInventoryItemModalProps) {
    const [query, setQuery] = useState("");

    if (!isOpen) return null;

    const needle = query.trim().toLowerCase();
    const filteredItems = items.filter((item) => {
        if (!needle) return true;

        return (
            item.item_name.toLowerCase().includes(needle) ||
            item.category.toLowerCase().includes(needle) ||
            item.item_id.toLowerCase().includes(needle)
        );
    });

    const handlePick = (item: InventoryItem) => {
        onSelect(item);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="select-item-title"
                className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 bg-blue-50/60 px-5 py-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Kitchen Inventory
                        </p>

                        <h2
                            id="select-item-title"
                            className="mt-1 text-lg font-semibold text-slate-800"
                        >
                            Add Batch
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Select which inventory item the new batch belongs to.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none text-slate-400 transition hover:bg-white hover:text-slate-700"
                    >
                        ×
                    </button>
                </div>

                {/* Item picker */}
                <div className="px-5 py-4">
                    <div className="relative">
                        <Search
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search by item, category or ID..."
                            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                        />
                    </div>

                    <div className="no-scrollbar mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10 text-center">
                                <PackageSearch
                                    size={28}
                                    className="text-slate-300"
                                />

                                <p className="text-sm font-semibold text-slate-600">
                                    No inventory items yet
                                </p>

                                <p className="text-xs text-slate-400">
                                    Add an item first, then you can log batches
                                    against it.
                                </p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10 text-center">
                                <PackageSearch
                                    size={28}
                                    className="text-slate-300"
                                />

                                <p className="text-sm font-semibold text-slate-600">
                                    No items match &quot;{query}&quot;
                                </p>

                                <p className="text-xs text-slate-400">
                                    Try a different name, category or item ID.
                                </p>
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <button
                                    key={item.item_id}
                                    type="button"
                                    onClick={() => handlePick(item)}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-amber-400 hover:bg-amber-50/70 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-slate-800">
                                            {item.item_name}
                                        </span>

                                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                                            <span className="truncate">
                                                {item.category}
                                            </span>

                                            <span className="shrink-0 text-slate-300">
                                                •
                                            </span>

                                            <span className="shrink-0">
                                                {item.unit_of_measure}
                                            </span>
                                        </span>
                                    </span>

                                    <span className="shrink-0 text-right">
                                        <span className="block text-xs font-semibold text-slate-700">
                                            {getTotalStock(item)}{" "}
                                            {item.unit_of_measure}
                                        </span>

                                        <span className="block text-[10px] text-slate-400">
                                            {item.batches?.length ?? 0}{" "}
                                            {(item.batches?.length ?? 0) === 1
                                                ? "batch"
                                                : "batches"}
                                        </span>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                    <p className="text-[11px] text-slate-400">
                        {filteredItems.length} of {items.length} items
                    </p>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}