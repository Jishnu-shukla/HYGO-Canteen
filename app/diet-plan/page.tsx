"use client";

import CreateDietPlanForm from "@/components/DietPlan/CreateDietPlanForm";
import { DietPlanSummaryCards } from "@/components/DietPlan/DietPlanSummaryCards";
import { DietPlanTable } from "@/components/DietPlan/DietPlanTable";
import MenuProvider, { useMenuContext } from "@/context/MenuContext";
import {
    DIET_PLAN_PAGE_SIZE,
    EMPTY_DIET_PLAN_PAGINATION,
    createDietPlanApi,
    getDietPlansApi,
    getDietPlanSummaryApi,
} from "@/data/DietPlan/api";
import type {
    CreateDietPlanBody,
    CreateDietPlanResponse,
    DietPlanListItem,
    DietPlanPagination,
    GetDietPlanSummaryResponse,
} from "@/data/DietPlan/type";
import { Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function DietPlanContent() {
    // Supplies the master dishes offered in the form's withhold roster.
    const { items: menuItems, loading: menuLoading } = useMenuContext();

    const [summary, setSummary] =
        useState<GetDietPlanSummaryResponse | null>(null);

    // The table owns its own page; the summary is global and unpaginated.
    // The visible page lives in `pagination`, which the table reads from, so
    // no separate page state is needed here.
    const [plans, setPlans] = useState<DietPlanListItem[]>([]);
    const [pagination, setPagination] = useState<DietPlanPagination>(
        EMPTY_DIET_PLAN_PAGINATION
    );

    // All start true so the mount fetch needs no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);

    const fetchSummary = useCallback(async () => {
        try {
            const data = await getDietPlanSummaryApi();
            setSummary(data);
        } catch (error) {
            console.log("Error fetching diet plan summary:", error);
        } finally {
            setIsSummaryLoading(false);
        }
    }, []);

    // Returns the resolved pagination so the create handler can clamp the page.
    const fetchTable = useCallback(
        async (targetPage: number): Promise<DietPlanPagination> => {
            try {
                setIsTableLoading(true);

                const { data, pagination: meta } = await getDietPlansApi({
                    page: targetPage,
                    limit: DIET_PLAN_PAGE_SIZE,
                });

                setPlans(data);
                setPagination(meta);

                return meta;
            } catch (error) {
                console.log("Error fetching diet plans:", error);

                return EMPTY_DIET_PLAN_PAGINATION;
            } finally {
                setIsTableLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        // Inlined so setState sits behind an await inside the effect rather
        // than in a helper the effect calls.
        const load = async () => {
            const [summaryData, tableData] = await Promise.all([
                getDietPlanSummaryApi().catch((error) => {
                    console.log("Error fetching diet plan summary:", error);
                    return null;
                }),
                getDietPlansApi({
                    page: 1,
                    limit: DIET_PLAN_PAGE_SIZE,
                }).catch((error) => {
                    console.log("Error fetching diet plans:", error);
                    return {
                        data: [] as DietPlanListItem[],
                        pagination: EMPTY_DIET_PLAN_PAGINATION,
                    };
                }),
            ]);

            setSummary(summaryData);
            setPlans(tableData.data);
            setPagination(tableData.pagination);
            setIsSummaryLoading(false);
            setIsTableLoading(false);
        };

        load();
    }, []);

    // A new plan changes active_plans and the diet-type mix, so the cards
    // are refreshed alongside the table.
    const handleCreatePlan = async (
        payload: CreateDietPlanBody
    ): Promise<CreateDietPlanResponse> => {
        const plan = await createDietPlanApi(payload);

        // Back to page 1 so the new plan is visible — it is newest-first.
        await Promise.all([fetchTable(1), fetchSummary()]);

        return plan;
    };

    const handlePageChange = (nextPage: number) => {
        fetchTable(nextPage);
    };

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <Wrench size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Diet Plan Builder
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                CLINICAL
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Build and adjust therapeutic diet plans per patient.
                    </p>
                </div>
            </section>

            {/* Summary cards */}
            <DietPlanSummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />

            <div className="mt-4">
                <CreateDietPlanForm
                    menuItems={menuItems}
                    menuLoading={menuLoading}
                    onSubmit={handleCreatePlan}
                />
            </div>

            <DietPlanTable
                plans={plans}
                loading={isTableLoading}
                pagination={pagination}
                onPageChange={handlePageChange}
            />
        </main>
    );
}

export default function DietPlanPage() {
    return (
        <MenuProvider>
            <DietPlanContent />
        </MenuProvider>
    );
}
