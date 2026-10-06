"use client";

import { MealDispatchSummaryCards } from "@/components/MealDispatch/MealDispatchSummaryCards";
import { MealDispatchTable } from "@/components/MealDispatch/MealDispatchTable";
import { TrolleyCards, type Trolley } from "@/components/MealDispatch/TrolleyCards";
import {
    dispatchOrderApi,
    getMealDispatchSummaryApi,
    getPendingDispatchOrdersApi,
} from "@/data/MealDispatch/api";
import type {
    MealDispatchSummary,
    PendingDispatchOrder,
} from "@/data/MealDispatch/type";
import { Utensils } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function MealDispatchPage() {
    const [summary, setSummary] = useState<MealDispatchSummary | null>(null);
    const [pendingOrders, setPendingOrders] = useState<PendingDispatchOrder[]>(
        []
    );

    // Both start true so the mount fetch needs no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);

    // What is in flight: a single tray's order_id, or a whole trolley's key.
    const [dispatchingId, setDispatchingId] = useState<string | null>(null);
    const [dispatchingKey, setDispatchingKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchTable = useCallback(async () => {
        try {
            setIsTableLoading(true);
            setPendingOrders(await getPendingDispatchOrdersApi());
        } catch (error) {
            console.log("Error fetching pending dispatch orders:", error);
        } finally {
            setIsTableLoading(false);
        }
    }, []);

    useEffect(() => {
        // Inlined rather than calling the fetch helpers: the
        // set-state-in-effect rule cannot see that they await before touching
        // state, and duplicating these lines is cheaper than a disable comment.
        const load = async () => {
            const [summaryData, ordersData] = await Promise.all([
                getMealDispatchSummaryApi().catch((error) => {
                    console.log("Error fetching meal dispatch summary:", error);
                    return null;
                }),
                getPendingDispatchOrdersApi().catch((error) => {
                    console.log(
                        "Error fetching pending dispatch orders:",
                        error
                    );
                    return [] as PendingDispatchOrder[];
                }),
            ]);

            setSummary(summaryData);
            setPendingOrders(ordersData);
            setIsSummaryLoading(false);
            setIsTableLoading(false);
        };

        load();
    }, []);

    // Dispatching by order_id: the pending projection omits `_id`, and the
    // backend resolves this segment against order_id.
    const handleDispatch = async (order: PendingDispatchOrder) => {
        setDispatchingId(order.order_id);
        setError(null);

        try {
            await dispatchOrderApi(order.order_id);

            // The tray has left the kitchen, so the cards, the trolleys and
            // the table are all stale — refresh them together.
            await Promise.all([
                fetchTable(),
                getMealDispatchSummaryApi().then(setSummary),
            ]);
        } catch (err) {
            // Keeps the row in place: the tray did not actually go out.
            setError(
                err instanceof Error
                    ? err.message
                    : `Could not dispatch ${order.order_id}.`
            );
        } finally {
            setDispatchingId(null);
        }
    };

    const handleDispatchTrolley = async (trolley: Trolley) => {
        setDispatchingKey(trolley.key);
        setError(null);

        // Trays go out one PUT at a time, so they are sent in sequence rather
        // than in parallel: the server mutates one order per call and a burst
        // of concurrent writes on the same order risks partial dispatch.
        const failed: string[] = [];

        for (const order of trolley.orders) {
            try {
                await dispatchOrderApi(order.order_id);
            } catch (err) {
                failed.push(order.bed_number || order.order_id || "a tray");

                console.log(`Failed to dispatch ${order.order_id}:`, err);
            }
        }

        await Promise.all([
            fetchTable(),
            getMealDispatchSummaryApi().then(setSummary),
        ]);

        // Partial success is still worth reporting: those trays stayed on
        // the trolley and the cook needs to know which ones.
        setError(
            failed.length === 0
                ? null
                : `${trolley.ward_name}: could not dispatch ${failed.length} tray${
                      failed.length === 1 ? "" : "s"
                  } (${failed.join(", ")}). The rest went out.`
        );

        setDispatchingKey(null);
    };

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <Utensils size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Meal Dispatch
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                SERVICE
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Mark prepared trays ready and dispatch them to wards.
                    </p>
                </div>
            </section>

            <MealDispatchSummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />

            {/* Quick dispatch — one click per trolley */}
            <TrolleyCards
                orders={pendingOrders}
                loading={isTableLoading}
                dispatchingKey={dispatchingKey}
                onDispatchTrolley={handleDispatchTrolley}
            />

            <MealDispatchTable
                orders={pendingOrders}
                loading={isTableLoading}
                dispatchingId={dispatchingId}
                error={error}
                onDispatch={handleDispatch}
            />
        </main>
    );
}
