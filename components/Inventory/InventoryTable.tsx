"use client";

import { InventoryTableItem } from "@/data/Inventory/type";
import { ChevronsRight } from "lucide-react";
import { useState } from "react";


export interface InventoryTableProps {
    items: InventoryTableItem[];
    onEdit?: (item: InventoryTableItem) => void;
    onDelete?: (item: InventoryTableItem) => void;
    onPOTrigger?: (item: InventoryTableItem) => void;
}

const formatQuantity = (quantity: number, unit: string) => {
    return `${quantity.toLocaleString("en-IN")} ${unit}`;
};

const getTotalQuantity = (item: InventoryTableItem) => {
    console.log(item)
    if (!!item.batches && item.batches.length === 0) {
        return 0;
    }
    return item.batches.reduce(
        (total, batch) =>
            total + Number(batch.current_quantity ?? batch.initial_quantity ?? 0),
        0
    );
};

const getNearestExpiry = (item: InventoryTableItem) => {
    const today = new Date();

    const upcoming = item.batches
        .map((batch) => new Date(batch.expiry))
        .filter((date) => !Number.isNaN(date.getTime()) && date >= today)
        .sort((a, b) => a.getTime() - b.getTime());

    return upcoming[0] ?? null;
};

const formatDate = (date: Date | null) => {
    if (!date) return "-";

    return date.toLocaleDateString("en-CA");
};

const isLowStock = (item: InventoryTableItem) => {
    return getTotalQuantity(item) <= item.threshold_quantity;
};

/* Small inline icons so the table does not depend on another icon package. */
function EditIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
    );
}

function DeleteIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 15H6L5 6" />
            <path d="M10 11v6M14 11v6" />
        </svg>
    );
}

function POIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path d="M4 4h16v16H4z" />
            <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
    );
}

export default function InventoryTable({
    items,
    onEdit,
    onDelete,
    onPOTrigger,
}: InventoryTableProps) {
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    return (
        <div className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                    <thead>
                        <tr className="border-b border-blue-100 bg-blue-50">
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                Item
                            </th>
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                Category
                            </th>
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                Qty
                            </th>
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                Expiry
                            </th>
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                Reorder
                            </th>
                            <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                PO
                            </th>
                            <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-12 text-center text-xs text-slate-400"
                                >
                                    No inventory items found.
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => {
                                const quantity = getTotalQuantity(item);
                                const nearestExpiry = getNearestExpiry(item);
                                const lowStock = isLowStock(item);

                                const itemRow = (
                                    <tr
                                        key={item.item_id}
                                        className={`border-b border-blue-50 last:border-b-0 ${expandedItemId === item.item_id
                                            ? "bg-blue-50/40"
                                            : "hover:bg-slate-50"
                                            }`}
                                        onClick={() => setExpandedItemId(expandedItemId === item.item_id ? null : item.item_id)}
                                    >
                                        {/* Item */}
                                        <td className="px-3 py-3">
                                            <div className="min-w-0">
                                                <div className="flex gap-1">
                                                    <ChevronsRight
                                                        size={18}
                                                        className={`shrink-0 text-slate-400 transition-transform ${expandedItemId === item.item_id
                                                            ? "rotate-90 text-amber-600"
                                                            : ""
                                                            }`}
                                                    />
                                                    <div>
                                                        <p className="truncate text-xs font-medium text-slate-800">
                                                            {item.item_name}
                                                        </p>
                                                        <p className="mt-0.5 text-[9px] text-slate-400">
                                                            {item.batches.length}{" "}
                                                            {item.batches.length === 1
                                                                ? "batch"
                                                                : "batches"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Category */}
                                        <td className="px-3 py-3">
                                            <span className="text-xs text-slate-700">
                                                {item.category}
                                            </span>
                                        </td>

                                        {/* Quantity */}
                                        <td className="px-3 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${lowStock
                                                    ? "bg-red-100 text-red-600"
                                                    : "bg-emerald-100 text-emerald-700"
                                                    }`}
                                            >
                                                {formatQuantity(
                                                    quantity,
                                                    item.unit_of_measure
                                                )}
                                            </span>
                                        </td>

                                        {/* Nearest expiry */}
                                        <td className="px-3 py-3">
                                            <span
                                                className={`text-xs ${nearestExpiry &&
                                                    nearestExpiry.getTime() -
                                                    new Date().getTime() <
                                                    1000 *
                                                    60 *
                                                    60 *
                                                    24 *
                                                    30
                                                    ? "font-medium text-amber-700"
                                                    : "text-slate-700"
                                                    }`}
                                            >
                                                {formatDate(nearestExpiry)}
                                            </span>
                                        </td>

                                        {/* Reorder threshold */}
                                        <td className="px-3 py-3">
                                            <span className="text-xs text-slate-700">
                                                {formatQuantity(
                                                    item.threshold_quantity,
                                                    item.unit_of_measure
                                                )}
                                            </span>
                                        </td>

                                        {/* PO */}
                                        <td className="px-3 py-3">
                                            {item.is_preordered ? (
                                                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-bold text-amber-700">
                                                    TRIGGERED
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-3 py-3">
                                            <div
                                                className="flex items-center justify-center gap-1.5"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    title={`Edit ${item.item_name}`}
                                                    aria-label={`Edit ${item.item_name}`}
                                                    onClick={() => onEdit?.(item)}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-white text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
                                                >
                                                    <EditIcon />
                                                </button>

                                                <button
                                                    type="button"
                                                    title={`Delete ${item.item_name}`}
                                                    aria-label={`Delete ${item.item_name}`}
                                                    onClick={() => onDelete?.(item)}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50"
                                                >
                                                    <DeleteIcon />
                                                </button>

                                                <button
                                                    type="button"
                                                    title={`Trigger PO for ${item.item_name}`}
                                                    aria-label={`Trigger purchase order for ${item.item_name}`}
                                                    onClick={() => onPOTrigger?.(item)}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-amber-100 bg-white text-amber-600 transition hover:border-amber-200 hover:bg-amber-50"
                                                >
                                                    <POIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );

                                if (expandedItemId !== item.item_id) {
                                    return [itemRow];
                                }

                                const batchRow = (
                                    
                                    <tr
                                        key={`${item.item_id}-batches`}
                                        className="border-b border-blue-100 bg-slate-50"
                                        onClick={() => setExpandedItemId(expandedItemId === item.item_id ? null : item.item_id)}
                                    >
                                        <td colSpan={7} className="">
                                            <div className="border border-blue-100 bg-white p-3 shadow-sm">
                                                <div className="min-w-0">
                                                
                                            </div>

                                                {item.batches.length === 0 ? (
                                                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
                                                        No batches found for this item.
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full min-w-[760px] text-left">
                                                            <thead>
                                                                <tr className="border-b border-blue-100 bg-white">
                                                                    <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">Batch</th>
                                                                    <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">Received</th>
                                                                    <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">Expiry</th>
                                                                    <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">Initial Qty</th>
                                                                    <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">Current Qty</th>
                                                                    <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">Unit Cost</th>
                                                                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wide text-slate-500">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {item.batches.map((batch) => (
                                                                    <tr
                                                                        key={batch.batch_number}
                                                                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                                                                    >
                                                                        <td className="px-3 py-2 text-xs font-medium text-slate-700">
                                                                            {batch.batch_number}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-xs text-slate-600">
                                                                            {batch.received_date
                                                                                ? formatDate(new Date(batch.received_date))
                                                                                : "-"}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-xs text-slate-600">
                                                                            {batch.expiry
                                                                                ? formatDate(new Date(batch.expiry))
                                                                                : "-"}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-xs text-slate-600">
                                                                            {formatQuantity(
                                                                                Number(batch.initial_quantity),
                                                                                item.unit_of_measure
                                                                            )}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-xs font-medium text-slate-700">
                                                                            {formatQuantity(
                                                                                Number(batch.current_quantity),
                                                                                item.unit_of_measure
                                                                            )}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-xs text-slate-600">
                                                                            ₹{Number(batch.unit_cost).toLocaleString("en-IN", {
                                                                                minimumFractionDigits: 2,
                                                                                maximumFractionDigits: 2,
                                                                            })}
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <div className="flex items-center justify-center gap-1.5">
                                                                                <button
                                                                                    type="button"
                                                                                    title={`Edit batch ${batch.batch_number}`}
                                                                                    aria-label={`Edit batch ${batch.batch_number}`}
                                                                                    onClick={() =>
                                                                                        console.log("Edit batch", item.item_id, batch)
                                                                                    }
                                                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-white text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
                                                                                >
                                                                                    <EditIcon />
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    title={`Delete batch ${batch.batch_number}`}
                                                                                    aria-label={`Delete batch ${batch.batch_number}`}
                                                                                    onClick={() =>
                                                                                        console.log("Delete batch", item.item_id, batch)
                                                                                    }
                                                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50"
                                                                                >
                                                                                    <DeleteIcon />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )

                                return [itemRow, batchRow];
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
