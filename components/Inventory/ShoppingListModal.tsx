"use client";

import { InventoryBatch, InventoryTableItem } from "@/data/Inventory/type";
import { ShoppingCart, X } from "lucide-react";

export interface ShoppingListModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: InventoryTableItem[];
    onPOTrigger?: (item: InventoryTableItem) => void;
    poBusyId?: string | null;
}

const getTotalQuantity = (item: InventoryTableItem) => {
    if (typeof item.total_quantity === "number") {
        return item.total_quantity;
    }

    return (item.batches ?? []).reduce(
        (total, batch) =>
            total + Number(batch.current_quantity ?? batch.initial_quantity ?? 0),
        0
    );
};

const formatQuantity = (quantity: number, unit: string) => {
    return `${quantity.toLocaleString("en-IN")} ${unit}`;
};

const formatDate = (date: string | null | undefined) => {
    if (!date) return "-";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("en-CA");
};

export default function ShoppingListModal({
    isOpen,
    onClose,
    items,
    onPOTrigger,
    poBusyId,
}: ShoppingListModalProps) {
    if (!isOpen) return null;

    const shoppingListItems = (items ?? []).filter((item) => {
        if (item.is_preordered) return true;
        const totalQty = getTotalQuantity(item);
        const threshold = Number(item.threshold_quantity ?? 0);
        if (threshold <= 0) return false;
        return totalQty <= threshold;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3">
            <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <ShoppingCart size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                Shopping List
                            </h2>
                            <p className="text-xs text-slate-400">
                                Items below or at threshold, plus items already
                                marked for pre-order
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                        aria-label="Close shopping list"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                    {shoppingListItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <p className="text-sm font-medium text-slate-700">
                                No items to reorder
                            </p>
                            <p className="text-xs text-slate-400">
                                There are no items below/at threshold or marked
                                for pre-order.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {shoppingListItems.map((item) => {
                                const totalQty = getTotalQuantity(item);
                                const batches: InventoryBatch[] =
                                    item.batches ?? [];
                                const isBusy = poBusyId === item.item_id;

                                return (
                                    <div
                                        key={item.item_id}
                                        className="rounded-xl border border-slate-200 bg-white"
                                    >
                                        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-base font-semibold text-slate-900">
                                                        {item.item_name}
                                                    </h3>
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                                                        {item.category}
                                                    </span>
                                                    {item.is_preordered && (
                                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                                            Pre-ordered
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                                    <span>
                                                        <span className="font-medium text-slate-500">
                                                            Item ID:
                                                        </span>{" "}
                                                        <span className="font-semibold text-slate-700">
                                                            {item.item_id}
                                                        </span>
                                                    </span>
                                                    <span>
                                                        <span className="font-medium text-slate-500">
                                                            Unit:
                                                        </span>{" "}
                                                        <span className="font-semibold text-slate-700">
                                                            {item.unit_of_measure}
                                                        </span>
                                                    </span>
                                                    <span>
                                                        <span className="font-medium text-slate-500">
                                                            Current Qty:
                                                        </span>{" "}
                                                        <span
                                                            className={`font-semibold ${
                                                                totalQty <=
                                                                Number(
                                                                    item.threshold_quantity ??
                                                                        0
                                                                )
                                                                    ? "text-red-600"
                                                                    : "text-slate-700"
                                                            }`}
                                                        >
                                                            {formatQuantity(
                                                                totalQty,
                                                                item.unit_of_measure
                                                            )}
                                                        </span>
                                                    </span>
                                                    <span>
                                                        <span className="font-medium text-slate-500">
                                                            Threshold Qty:
                                                        </span>{" "}
                                                        <span className="font-semibold text-slate-700">
                                                            {formatQuantity(
                                                                Number(
                                                                    item.threshold_quantity ??
                                                                        0
                                                                ),
                                                                item.unit_of_measure
                                                            )}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={
                                                    !onPOTrigger || isBusy
                                                }
                                                onClick={() =>
                                                    onPOTrigger?.(item)
                                                }
                                                className={`rounded-full px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                                    item.is_preordered
                                                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                        : "bg-blue-700 text-white hover:bg-blue-800"
                                                }`}
                                            >
                                                {isBusy
                                                    ? "Updating..."
                                                    : item.is_preordered
                                                      ? "Cancel Pre-order"
                                                      : "Trigger Pre-order"}
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[720px] border-collapse text-left">
                                                <thead>
                                                    <tr className="bg-slate-50">
                                                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                                            Batch No.
                                                        </th>
                                                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                                            Received Date
                                                        </th>
                                                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                                            Expiry Date
                                                        </th>
                                                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                                            Initial Qty
                                                        </th>
                                                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                                            Current Qty
                                                        </th>
                                                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                                            Unit Cost
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {batches.length === 0 ? (
                                                        <tr>
                                                            <td
                                                                colSpan={6}
                                                                className="px-4 py-3 text-center text-xs text-slate-400"
                                                            >
                                                                No batch details
                                                                available
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        batches.map((batch) => (
                                                            <tr
                                                                key={batch.batch_id}
                                                                className="border-t border-slate-100 transition hover:bg-slate-50/70"
                                                            >
                                                                <td className="px-4 py-2.5 text-sm font-medium text-slate-800">
                                                                    {
                                                                        batch.batch_number
                                                                    }
                                                                </td>
                                                                <td className="px-4 py-2.5 text-sm text-slate-600">
                                                                    {formatDate(
                                                                        batch.received_date
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-sm text-slate-600">
                                                                    {formatDate(
                                                                        batch.expiry_date
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-sm text-slate-600">
                                                                    {formatQuantity(
                                                                        Number(
                                                                            batch.initial_quantity ??
                                                                                0
                                                                        ),
                                                                        item.unit_of_measure
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-sm font-semibold text-slate-800">
                                                                    {formatQuantity(
                                                                        Number(
                                                                            batch.current_quantity ??
                                                                                batch.initial_quantity ??
                                                                                0
                                                                        ),
                                                                        item.unit_of_measure
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-sm text-slate-700">
                                                                    ₹
                                                                    {Number(
                                                                        batch.unit_cost ??
                                                                            0
                                                                    ).toLocaleString(
                                                                        "en-IN"
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex justify-end border-t border-slate-100 px-5 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
