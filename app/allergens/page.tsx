"use client";

import { AllergyPrefSummaryCards } from "@/components/AllergyPref/AllergyPrefSummaryCards";
import { AllergyPrefTable } from "@/components/AllergyPref/AllergyPrefTable";
import CreateAllergyPrefForm from "@/components/AllergyPref/CreateAllergyPrefForm";
import {
    ALLERGY_PREF_PAGE_SIZE,
    EMPTY_ALLERGY_PREF_PAGINATION,
    createAllergyPrefApi,
    getAllergyPrefSummaryApi,
    getAllergyPrefsApi,
} from "@/data/AllergyPref/api";
import type {
    AllergyPrefListItem,
    AllergyPrefPagination,
    AllergySeverity,
    CreateAllergyPrefBody,
    CreateAllergyPrefResponse,
    GetAllergyPrefSummaryResponse,
} from "@/data/AllergyPref/type";
import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function AllergensPage() {
    const [summary, setSummary] =
        useState<GetAllergyPrefSummaryResponse | null>(null);

    const [prefs, setPrefs] = useState<AllergyPrefListItem[]>([]);
    const [pagination, setPagination] = useState<AllergyPrefPagination>(
        EMPTY_ALLERGY_PREF_PAGINATION
    );
    const [severityFilter, setSeverityFilter] = useState<
        AllergySeverity | "all"
    >("all");

    // Both start true so the mount fetches need no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);

    const fetchSummary = useCallback(async () => {
        try {
            const data = await getAllergyPrefSummaryApi();
            setSummary(data);
        } catch (error) {
            console.log("Error fetching allergy preference summary:", error);
        } finally {
            setIsSummaryLoading(false);
        }
    }, []);

    // The visible page lives in `pagination`, which the table reads from, so
    // no separate page state is needed here.
    const fetchTable = useCallback(async (targetPage: number) => {
        try {
            setIsTableLoading(true);

            const { data, pagination: meta } = await getAllergyPrefsApi({
                page: targetPage,
                limit: ALLERGY_PREF_PAGE_SIZE,
            });

            setPrefs(data);
            setPagination(meta);
        } catch (error) {
            console.log("Error fetching allergy preferences:", error);
        } finally {
            setIsTableLoading(false);
        }
    }, []);

    useEffect(() => {
        // Inlined rather than calling fetchSummary: the set-state-in-effect
        // rule cannot see that fetchSummary awaits before touching state, and
        // duplicating three lines here is cheaper than a disable comment.
        const load = async () => {
            const [summaryData, tableData] = await Promise.all([
                getAllergyPrefSummaryApi().catch((error) => {
                    console.log(
                        "Error fetching allergy preference summary:",
                        error
                    );
                    return null;
                }),
                getAllergyPrefsApi({
                    page: 1,
                    limit: ALLERGY_PREF_PAGE_SIZE,
                }).catch((error) => {
                    console.log("Error fetching allergy preferences:", error);
                    return {
                        data: [] as AllergyPrefListItem[],
                        pagination: EMPTY_ALLERGY_PREF_PAGINATION,
                    };
                }),
            ]);

            setSummary(summaryData);
            setPrefs(tableData.data);
            setPagination(tableData.pagination);
            setIsSummaryLoading(false);
            setIsTableLoading(false);
        };

        load();
    }, []);

    // A new record moves both the cards and the table, and it is newest-first,
    // so jump back to page 1 to keep the new row visible.
    const handleCreate = async (
        body: CreateAllergyPrefBody
    ): Promise<CreateAllergyPrefResponse> => {
        const record = await createAllergyPrefApi(body);

        await Promise.all([fetchTable(1), fetchSummary()]);

        return record;
    };

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <TriangleAlert size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Allergen &amp; Preference
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                CLINICAL
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Maintain allergen restrictions and patient food
                        preferences.
                    </p>
                </div>
            </section>

            {/* Summary cards */}
            <AllergyPrefSummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />

            <div className="mt-4">
                <CreateAllergyPrefForm onSubmit={handleCreate} />
            </div>

            <AllergyPrefTable
                prefs={prefs}
                loading={isTableLoading}
                pagination={pagination}
                severityFilter={severityFilter}
                onSeverityFilterChange={setSeverityFilter}
                onPageChange={fetchTable}
            />
        </main>
    );
}
