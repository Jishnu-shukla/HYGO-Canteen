"use client";

import CreateBedSideDeliveryForm from "@/components/BedSideDelivery/CreateBedSideDeliveryForm";
import { BedSideDeliverySummaryCards } from "@/components/BedSideDelivery/BedSideDeliverySummaryCards";
import {
    createBedSideDeliveryApi,
    getBedSideDeliveryOrdersApi,
    getBedSideDeliverySummaryApi,
} from "@/data/BedSideDelivery/api";
import type {
    BedSideDeliveryOrder,
    BedSideDeliverySummary,
} from "@/data/BedSideDelivery/type";
import { Truck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function BedsideDeliveryPage() {
    const [summary, setSummary] = useState<BedSideDeliverySummary | null>(
        null
    );

    // Picker options for the form below.
    const [orders, setOrders] = useState<BedSideDeliveryOrder[]>([]);

    // Both start true so the mount fetch needs no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isOrdersLoading, setIsOrdersLoading] = useState(true);

    useEffect(() => {
        // Inlined rather than calling fetch helpers: the set-state-in-effect
        // rule cannot see that they await before touching state, and
        // duplicating these lines is cheaper than a disable comment.
        const load = async () => {
            const [summaryData, ordersData] = await Promise.all([
                getBedSideDeliverySummaryApi().catch((error) => {
                    console.log(
                        "Error fetching bedside delivery summary:",
                        error
                    );
                    return null;
                }),
                getBedSideDeliveryOrdersApi().catch((error) => {
                    console.log(
                        "Error fetching bedside delivery orders:",
                        error
                    );
                    return [] as BedSideDeliveryOrder[];
                }),
            ]);

            setSummary(summaryData);
            setOrders(ordersData);
            setIsSummaryLoading(false);
            setIsOrdersLoading(false);
        };

        load();
    }, []);

    // A new delivery changes every card, so refetch the summary after saving.
    const fetchSummary = useCallback(async () => {
        setSummary(await getBedSideDeliverySummaryApi());
    }, []);

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <Truck size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Bedside Delivery
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                SERVICE
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Track last-mile tray handover and confirmations.
                    </p>
                </div>
            </section>

            <BedSideDeliverySummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />

            <CreateBedSideDeliveryForm
                orders={orders}
                loadingOrders={isOrdersLoading}
                onSubmit={async (body) => {
                    const record = await createBedSideDeliveryApi(body);

                    // Deliveries today and avg_intake both move on a save.
                    await fetchSummary();

                    return record;
                }}
            />
        </main>
    );
}
