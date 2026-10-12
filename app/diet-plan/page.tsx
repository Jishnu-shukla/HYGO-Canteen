"use client";

import CreateDietPlanForm from "@/components/DietPlan/CreateDietPlanForm";
import DeletePlanConfirmModal from "@/components/DietPlan/DeletePlanConfirmModal";
import EditDietPlanModal from "@/components/DietPlan/EditDietPlanModal";
import PlanStatusConfirmModal from "@/components/DietPlan/PlanStatusConfirmModal";
import { DietPlanSummaryCards } from "@/components/DietPlan/DietPlanSummaryCards";
import { DietPlanTable } from "@/components/DietPlan/DietPlanTable";
import {
    DIET_PLAN_PAGE_SIZE,
    EMPTY_DIET_PLAN_PAGINATION,
    createDietPlanApi,
    deleteDietPlanApi,
    getDietPlansApi,
    getDietPlanSummaryApi,
    updateDietPlanApi,
} from "@/data/DietPlan/api";
import { getPatientMenuPickItemsApi } from "@/data/Menu/api";
import type { PatientMenuPickItem } from "@/data/Menu/type";
import type {
    CreateDietPlanBody,
    CreateDietPlanResponse,
    DietPlanListItem,
    DietPlanPagination,
    DietPlanStatus,
    GetDietPlanSummaryResponse,
    UpdateDietPlanBody,
    UpdateDietPlanResponse,
} from "@/data/DietPlan/type";
import { Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function DietPlanContent() {
    // The patient menu, one row per item per meal slot: the withhold roster
    // shows what the patient could actually be served, not the master list.
    const [menuItems, setMenuItems] = useState<PatientMenuPickItem[]>([]);
    const [menuLoading, setMenuLoading] = useState(true);

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

    // Row actions. Only one modal is ever open, so the plan under edit and the
    // plan awaiting a status or delete confirmation are separate pieces of
    // state.
    const [editingPlan, setEditingPlan] = useState<DietPlanListItem | null>(
        null
    );
    const [planToToggleStatus, setPlanToToggleStatus] =
        useState<DietPlanListItem | null>(null);
    const [planToDelete, setPlanToDelete] =
        useState<DietPlanListItem | null>(null);

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
            const [summaryData, tableData, pickItems] = await Promise.all([
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
                getPatientMenuPickItemsApi().catch((error) => {
                    console.log("Error fetching patient menu items:", error);
                    return undefined;
                }),
            ]);

            setSummary(summaryData);
            setPlans(tableData.data);
            setPagination(tableData.pagination);
            setMenuItems(pickItems ?? []);
            setIsSummaryLoading(false);
            setIsTableLoading(false);
            setMenuLoading(false);
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

    // Edit and disable both change the plan, so both refresh the table (on the
    // same page) and the summary, which counts active plans.
    const handleUpdatePlan = async (
        plan: DietPlanListItem,
        payload: UpdateDietPlanBody
    ): Promise<UpdateDietPlanResponse> => {
        const updated = await updateDietPlanApi(plan.diet_plan_id, payload);

        await Promise.all([fetchTable(pagination.page), fetchSummary()]);

        return updated;
    };

    // Flips a plan between Active and Disable: the button is a toggle, so the
    // target status is the opposite of what the row currently shows.
    // Rejects on failure so the confirm dialog can surface the reason and stay
    // open; closes the dialog only once the write lands.
    const handleTogglePlanStatus = async () => {
        if (!planToToggleStatus) return;

        const nextStatus: DietPlanStatus =
            planToToggleStatus.status === "Disable" ? "Active" : "Disable";

        await updateDietPlanApi(planToToggleStatus.diet_plan_id, {
            status: nextStatus,
        });

        await Promise.all([fetchTable(pagination.page), fetchSummary()]);

        setPlanToToggleStatus(null);
    };

    // Rejects on failure so the confirm dialog can surface the reason and stay
    // open; closes the dialog only once the row is gone.
    const handleDeletePlan = async () => {
        if (!planToDelete) return;

        await deleteDietPlanApi(planToDelete.diet_plan_id);

        // Removing the last row on a page would leave it empty, so step back a
        // page in that case; otherwise reload the page we were on.
        const targetPage =
            plans.length === 1 && pagination.page > 1
                ? pagination.page - 1
                : pagination.page;

        await Promise.all([fetchTable(targetPage), fetchSummary()]);

        setPlanToDelete(null);
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
                onEdit={setEditingPlan}
                onToggleStatus={setPlanToToggleStatus}
                onDelete={setPlanToDelete}
            />

            {editingPlan && (
                <EditDietPlanModal
                    key={editingPlan.diet_plan_id}
                    plan={editingPlan}
                    onSubmit={(payload) => handleUpdatePlan(editingPlan, payload)}
                    onClose={() => setEditingPlan(null)}
                />
            )}

            {planToToggleStatus && (
                <PlanStatusConfirmModal
                    planId={planToToggleStatus.diet_plan_id}
                    patientName={planToToggleStatus.patient_name}
                    nextStatus={
                        planToToggleStatus.status === "Disable"
                            ? "Active"
                            : "Disable"
                    }
                    onCancel={() => setPlanToToggleStatus(null)}
                    onConfirm={handleTogglePlanStatus}
                />
            )}

            {planToDelete && (
                <DeletePlanConfirmModal
                    planId={planToDelete.diet_plan_id}
                    patientName={planToDelete.patient_name}
                    onCancel={() => setPlanToDelete(null)}
                    onConfirm={handleDeletePlan}
                />
            )}
        </main>
    );
}

export default DietPlanContent;
