"use client";

import { FssaiChecklistSummaryCards } from "@/components/FssaiChecklist/FssaiChecklistSummaryCards";
import { FssaiChecklistTable } from "@/components/FssaiChecklist/FssaiChecklistTable";
import CreateFssaiChecklistModal from "@/components/FssaiChecklist/CreateFssaiChecklistModal";
import { getFssaiChecklistApi, getFssaiChecklistSummaryApi } from "@/data/FssaiChecklist/api";
import type { FssaichecklistSummary, GetFssaichecklist } from "@/data/FssaiChecklist/type";
import { showToast } from "@/utils/toast";
import { Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const TABS = [
    { id: "certificate", label: "Certificate" },
    { id: "inspection", label: "Inspection" },
    { id: "internal-inspection", label: "Internal inspection" },
    { id: "corrective-actions", label: "Corrective actions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function FssaiChecklistPage() {
    const [summary, setSummary] = useState<FssaichecklistSummary | null>(null);
    const [checklists, setChecklists] = useState<GetFssaichecklist[]>([]);

    // The "Add Category" modal is mounted only while open, so it starts clean.
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Start true so the mount fetches need no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isListLoading, setIsListLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<TabId>("internal-inspection");

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

    /**
     * Adopts a freshly filed checklist. The list is newest-audit-first, so the
     * row is inserted ahead of the others and the result re-sorted by
     * audit_date — a backdated filing then lands where the endpoint would put
     * it rather than at the top.
     */
    async function handleCreated(created: GetFssaichecklist) {
        setChecklists((previous) =>
            [created, ...previous].sort(
                (a, b) =>
                    new Date(b.audit_date).getTime() -
                    new Date(a.audit_date).getTime()
            )
        );

        showToast({
            variant: "success",
            message: `Checklist ${created.checklist_id} filed.`,
        });

        // The summary aggregates every audit — the latest score and the
        // passed/failed split — so a new filing changes it. Re-read rather than
        // recompute client-side.
        const freshSummary = await getFssaiChecklistSummaryApi();

        if (freshSummary) setSummary(freshSummary);
    }

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

                {activeTab === "internal-inspection" && (
                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex items-center gap-1.5 self-start rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 md:self-auto"
                    >
                        <Plus size={16} />
                        Add Category
                    </button>
                )}
            </section>

            <FssaiChecklistSummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />

            <div className="mt-4 mb-4">
                <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 min-w-[120px] rounded-lg px-4 py-2 text-sm font-medium transition ${
                                activeTab === tab.id
                                    ? "bg-amber-100 text-amber-900"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === "internal-inspection" && (
                <FssaiChecklistTable
                    checklists={checklists}
                    loading={isListLoading}
                />
            )}

            {(activeTab === "certificate" ||
                activeTab === "inspection" ||
                activeTab === "corrective-actions") && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
                    <ShieldCheck className="mx-auto text-slate-300" size={28} />
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        No data available
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                        Content for this tab will be added soon.
                    </p>
                </div>
            )}

            {isCreateOpen && (
                <CreateFssaiChecklistModal
                    onCreated={handleCreated}
                    onClose={() => setIsCreateOpen(false)}
                />
            )}
        </main>
    );
}