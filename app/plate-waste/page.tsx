"use client";

import { PlateWasteDietTypeChart } from "@/components/PlateWaste/PlateWasteDietTypeChart";
import { PlateWasteSummaryCards } from "@/components/PlateWaste/PlateWasteSummaryCards";
import { PlateWasteTable } from "@/components/PlateWaste/PlateWasteTable";
import {
    EMPTY_PLATE_WASTE_PAGINATION,
    PLATE_WASTE_PAGE_SIZE,
    getPlateWasteApi,
    getPlateWasteDietTypeApi,
    getPlateWasteSummaryApi,
} from "@/data/PlateWaste/api";
import type {
    GetPlateWaste,
    PlateWasteDietType,
    PlateWasteInterface,
    PlateWastePagination,
} from "@/data/PlateWaste/type";
import { UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/** Intake groups the table's chips filter on; "all" means no narrowing. */
type IntakeFilterValue = "all" | "low" | "ok";

export default function PlateWastePage() {
    const [summary, setSummary] = useState<PlateWasteInterface | null>(null);
    const [dietTypes, setDietTypes] = useState<PlateWasteDietType[]>([]);

    // The visible page lives in `pagination`, which the table reads from, so
    // no separate page state is needed here.
    const [logs, setLogs] = useState<GetPlateWaste[]>([]);
    const [pagination, setPagination] = useState<PlateWastePagination>(
        EMPTY_PLATE_WASTE_PAGINATION
    );
    const [intakeFilter, setIntakeFilter] = useState<IntakeFilterValue>("all");

    // All start true so the mount fetch needs no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isChartLoading, setIsChartLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);

    useEffect(() => {
        // Inlined rather than calling helpers: the set-state-in-effect rule
        // cannot see that they await before touching state, and a few lines
        // here is cheaper than a disable comment.
        const load = async () => {
            const [summaryData, dietTypeData, tableData] = await Promise.all([
                getPlateWasteSummaryApi().catch((error) => {
                    console.log("Error fetching plate waste summary:", error);
                    return null;
                }),
                getPlateWasteDietTypeApi().catch((error) => {
                    console.log("Error fetching plate waste diet types:", error);
                    return [] as PlateWasteDietType[];
                }),
                getPlateWasteApi({
                    page: 1,
                    limit: PLATE_WASTE_PAGE_SIZE,
                }).catch((error) => {
                    console.log("Error fetching plate waste logs:", error);
                    return {
                        data: [] as GetPlateWaste[],
                        pagination: EMPTY_PLATE_WASTE_PAGINATION,
                    };
                }),
            ]);

            setSummary(summaryData);
            setDietTypes(dietTypeData);
            setLogs(tableData.data);
            setPagination(tableData.pagination);
            setIsSummaryLoading(false);
            setIsChartLoading(false);
            setIsTableLoading(false);
        };

        load();
    }, []);

    const fetchTable = useCallback(async (targetPage: number) => {
        try {
            setIsTableLoading(true);

            const { data, pagination: meta } = await getPlateWasteApi({
                page: targetPage,
                limit: PLATE_WASTE_PAGE_SIZE,
            });

            setLogs(data);
            setPagination(meta);
        } catch (error) {
            console.log("Error fetching plate waste logs:", error);
        } finally {
            setIsTableLoading(false);
        }
    }, []);

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <UtensilsCrossed size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Plate Waste Analytics
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                ANALYTICS
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Track how much of each served plate comes back.
                    </p>
                </div>
            </section>

            <PlateWasteSummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />

            <section className="mt-4 min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3">
                    <h2 className="text-base font-semibold text-slate-800">
                        Average Intake by Diet Type
                    </h2>

                    <p className="text-sm text-slate-500">
                        Mean intake of distinct patients, worst first
                    </p>
                </div>

                <div className="h-[300px]">
                    <PlateWasteDietTypeChart
                        dietTypes={dietTypes}
                        loading={isChartLoading}
                    />
                </div>
            </section>

            <PlateWasteTable
                logs={logs}
                loading={isTableLoading}
                pagination={pagination}
                intakeFilter={intakeFilter}
                onIntakeFilterChange={setIntakeFilter}
                onPageChange={fetchTable}
            />
        </main>
    );
}