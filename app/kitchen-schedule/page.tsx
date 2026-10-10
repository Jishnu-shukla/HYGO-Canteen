"use client";

import { KitchenScheduleSummaryCards } from "@/components/KitchenSchedule/KitchenScheduleSummaryCards";
import { getKitchenScheduleSummaryApi } from "@/data/KitchenSchedule/api";
import type { GetKitchenScheduleSummaryResponse } from "@/data/KitchenSchedule/type";
import { ChefHat } from "lucide-react";
import { useEffect, useState } from "react";

export default function KitchenSchedulePage() {
    const [summary, setSummary] = useState<GetKitchenScheduleSummaryResponse | null>(
        null
    );

    // Starts true so the mount fetch needs no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);

    useEffect(() => {
        // Inlined rather than calling a helper: the set-state-in-effect rule
        // cannot see that the helper awaits before touching state.
        const load = async () => {
            const summaryData = await getKitchenScheduleSummaryApi().catch(
                (error) => {
                    console.log(
                        "Error fetching kitchen schedule summary:",
                        error
                    );
                    return null;
                }
            );

            setSummary(summaryData);
            setIsSummaryLoading(false);
        };

        load();
    }, []);

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <ChefHat size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Kitchen Schedule
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                SERVICE
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Plan production batches and kitchen manpower per slot.
                    </p>
                </div>
            </section>

            {/* Summary cards */}
            <KitchenScheduleSummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />
        </main>
    );
}
