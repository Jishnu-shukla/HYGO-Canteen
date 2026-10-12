"use client";

import {
    getKitchenScheduleSlotOrdersApi,
    updateKitchenScheduleOrdersReadyApi,
} from "@/data/KitchenSchedule/api";
import type { KitchenScheduleOrderItem } from "@/data/KitchenSchedule/type";
import { DIET_TYPE } from "@/data/Menu/type";
import type { DietType, MealSlot } from "@/data/Menu/type";
import { CheckCheck, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

/** Wire order of the diet types, so the list reads like the pivot grid. */
const DIET_ORDER = new Map<DietType, number>(
    DIET_TYPE.map((diet, index) => [diet, index])
);

/**
 * Diet type first (wire order), then ward A→Z. Keeps a slot that spans several
 * diets grouped, and the wards predictable inside each group.
 */
function sortOrders(
    orders: KitchenScheduleOrderItem[]
): KitchenScheduleOrderItem[] {
    return [...orders].sort((a, b) => {
        const dietDelta =
            (DIET_ORDER.get(a.diet_type) ?? DIET_TYPE.length) -
            (DIET_ORDER.get(b.diet_type) ?? DIET_TYPE.length);

        if (dietDelta !== 0) return dietDelta;

        return a.ward_name.localeCompare(b.ward_name);
    });
}

/**
 * Drill-down for one meal slot's cell, opened from the pivot's slot column.
 *
 * Loads GET /api/kitchenschedule/orders?meal_slot=... on mount and lists every
 * order behind that slot. "Ready" marks a single order; the header's "Ready
 * All" marks the batch. Both go through the bulk PUT /orders/ready endpoint —
 * one id or many — and a successful write drops the moved orders from the list,
 * so what remains is exactly what still needs preparing.
 */
export default function MealSlotOrdersModal({
    slot,
    onClose,
    onOrdersChanged,
}: {
    slot: MealSlot;
    onClose: () => void;
    /** Called after any order moves to Ready, so the pivot behind can refresh. */
    onOrdersChanged?: () => void;
}) {
    const [orders, setOrders] = useState<KitchenScheduleOrderItem[] | null>(
        null
    );

    // Starts true so the mount fetch needs no synchronous setState.
    const [isLoading, setIsLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
    const [isBulkReady, setIsBulkReady] = useState(false);
    const [error, setError] = useState("");

    const fetchOrders = async (): Promise<KitchenScheduleOrderItem[] | null> => {
        const data = await getKitchenScheduleSlotOrdersApi(slot);
        return data === null ? null : sortOrders(data);
    };

    useEffect(() => {
        // Only the async result path touches state, so the rule that flags
        // synchronous setState in an effect body stays satisfied.
        let active = true;

        const load = async () => {
            const data = await fetchOrders();

            if (!active) return;

            setOrders(data);
            setLoadFailed(data === null);
            setIsLoading(false);
        };

        load();

        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slot]);

    const handleRetry = async () => {
        setIsLoading(true);
        setLoadFailed(false);
        setError("");

        const data = await fetchOrders();

        setOrders(data);
        setLoadFailed(data === null);
        setIsLoading(false);
    };

    const handleReady = async (orderId: string) => {
        setBusyOrderId(orderId);
        setError("");

        try {
            // The single-order button is the bulk endpoint with one id, so both
            // paths share one contract.
            const result = await updateKitchenScheduleOrdersReadyApi([orderId]);

            if (result.skipped_order_ids.includes(orderId)) {
                setError(
                    `${orderId} was not moved. Only orders still being prepared can go to Ready.`
                );

                // Leave the row in place: it was reported, not updated.
                return;
            }

            setOrders((previous) =>
                previous
                    ? previous.filter((order) => order.order_id !== orderId)
                    : previous
            );

            onOrdersChanged?.();
        } catch (readyError) {
            setError(
                readyError instanceof Error
                    ? readyError.message
                    : "Could not mark the order ready. Please try again."
            );
        } finally {
            setBusyOrderId(null);
        }
    };

    const handleReadyAll = async () => {
        if (!orders || orders.length === 0) return;

        const batch = orders;
        const batchIds = batch.map((order) => order.order_id);

        setIsBulkReady(true);
        setError("");

        try {
            // One request for the whole slot rather than one per order.
            const result =
                await updateKitchenScheduleOrdersReadyApi(batchIds);

            const skipped = new Set(result.skipped_order_ids);

            // Drop exactly what the server moved; keep anything it skipped so
            // a stale or non-preparation row stays visible.
            setOrders((previous) =>
                previous
                    ? previous.filter(
                          (order) => skipped.has(order.order_id)
                      )
                    : previous
            );

            if (result.updated_count > 0) {
                onOrdersChanged?.();
            }

            if (skipped.size > 0) {
                setError(
                    `${skipped.size} of ${batchIds.length} orders could not be marked ready. The rest were updated.`
                );
            }
        } catch (bulkError) {
            setError(
                bulkError instanceof Error
                    ? bulkError.message
                    : "Could not mark the orders ready. Please try again."
            );
        } finally {
            setIsBulkReady(false);
        }
    };

    const remaining = orders?.length ?? 0;
    const busy = isBulkReady || busyOrderId !== null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="meal-slot-orders-title"
                className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-blue-50/60 px-5 py-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Kitchen Schedule
                        </p>

                        <h2
                            id="meal-slot-orders-title"
                            className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-800"
                        >
                            {slot} Orders
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                {isLoading ? "…" : `${remaining} left`}
                            </span>
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Mark each tray Ready, or send the whole slot at
                            once.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleReadyAll}
                            disabled={
                                isLoading ||
                                loadFailed ||
                                busy ||
                                remaining === 0
                            }
                            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isBulkReady ? (
                                <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                />
                            ) : (
                                <CheckCheck size={14} />
                            )}
                            {isBulkReady ? "Marking..." : "Ready All"}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            disabled={busy}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Error banner */}
                {error && (
                    <p className="border-b border-red-100 bg-red-50 px-5 py-2.5 text-xs font-medium text-red-600">
                        {error}
                    </p>
                )}

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-11 animate-pulse rounded-xl bg-slate-100"
                                />
                            ))}
                        </div>
                    ) : loadFailed ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                            <p className="text-sm font-semibold text-slate-600">
                                Could not load this slot&apos;s orders.
                            </p>

                            <p className="text-xs text-slate-400">
                                The schedule response may have expired.
                            </p>

                            <button
                                type="button"
                                onClick={handleRetry}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                                <RefreshCw size={14} />
                                Try again
                            </button>
                        </div>
                    ) : remaining === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                <CheckCheck size={22} />
                            </span>

                            <p className="text-sm font-semibold text-slate-600">
                                Nothing left to prepare
                            </p>

                            <p className="text-xs text-slate-400">
                                Every order in this slot is marked Ready.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2.5">
                                            Order ID
                                        </th>
                                        <th className="px-3 py-2.5">Ward</th>
                                        <th className="px-3 py-2.5">
                                            Diet Type
                                        </th>
                                        <th className="px-3 py-2.5 text-right">
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {orders?.map((order) => (
                                        <tr
                                            key={order.order_id}
                                            className="border-t border-slate-100"
                                        >
                                            <td className="px-3 py-2.5 font-semibold text-slate-700">
                                                {order.order_id}
                                            </td>

                                            <td className="px-3 py-2.5 text-slate-600">
                                                {order.ward_name || (
                                                    <span className="text-slate-300">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-3 py-2.5">
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                    {order.diet_type}
                                                </span>
                                            </td>

                                            <td className="px-3 py-2.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleReady(
                                                            order.order_id
                                                        )
                                                    }
                                                    disabled={busy}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    {busyOrderId ===
                                                    order.order_id ? (
                                                        <LoaderCircle
                                                            size={13}
                                                            className="animate-spin"
                                                        />
                                                    ) : (
                                                        <CheckCheck size={13} />
                                                    )}
                                                    Ready
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                    <p className="text-[11px] text-slate-400">
                        {isLoading
                            ? "Loading orders..."
                            : `${remaining} order${remaining === 1 ? "" : "s"} awaiting preparation`}
                    </p>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
