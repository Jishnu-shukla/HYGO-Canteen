"use client";

import { FssaiChecklistSummaryCards } from "@/components/FssaiChecklist/FssaiChecklistSummaryCards";
import { FssaiChecklistTable } from "@/components/FssaiChecklist/FssaiChecklistTable";
import { getFssaiChecklistApi, getFssaiChecklistSummaryApi } from "@/data/FssaiChecklist/api";
import type { FssaichecklistSummary, GetFssaichecklist } from "@/data/FssaiChecklist/type";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export default function FssaiChecklistPage() {
    const [summary, setSummary] = useState<FssaichecklistSummary | null>(null);
    const [checklists, setChecklists] = useState<GetFssaichecklist[]>([]);

    // Start true so the mount fetches need no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isListLoading, setIsListLoading] = useState(true);

    useEffect(() => {
        // Inlined rather than calling a helper: the set-state-in-effect rule
        // cannot see that the helper awaits before touching state, and a few
        // lines here is cheaper than a disable comment.
        const load = async () => {
            const [summaryData, checklistData] = await Promise.all([
                getFssaiChecklistSummaryApi().catch((error) => {
                    console.log("Error fetching FSSAI checklist summary:", error);
                    return null;
                }),
                getFssaiChecklistApi().catch((error) => {
                    console.log("Error fetching FSSAI checklists:", error);
                    return null;
                }),
            ]);

            setSummary(summaryData);
            setChecklists(checklistData ?? []);
            setIsSummaryLoading(false);
            setIsListLoading(false);
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
                            <ShieldCheck size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                FSSAI Checklist
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                COMPLIANCE
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Track audit hygiene scores and check outcomes.
                    </p>
                </div>
            </section>

            <FssaiChecklistSummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />

            <FssaiChecklistTable
                checklists={checklists}
                loading={isListLoading}
            />
        </main>
    );
}