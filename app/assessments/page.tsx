"use client";

import { AssessmentSummaryCards } from "@/components/Assessment/AssessmentSummaryCards";
import { AssessmentTable } from "@/components/Assessment/AssessmentTable";
import CreateAssessmentForm from "@/components/Assessment/CreateAssessmentForm";
import DeleteAssessmentConfirmModal from "@/components/Assessment/DeleteAssessmentConfirmModal";
import EditAssessmentModal from "@/components/Assessment/EditAssessmentModal";
import {
    ASSESSMENT_PAGE_SIZE,
    EMPTY_ASSESSMENT_PAGINATION,
    createAssessmentApi,
    deleteAssessmentApi,
    getAssessmentSummaryApi,
    getAssessmentsApi,
    updateAssessmentApi,
} from "@/data/Assessment/api";
import type {
    AssessmentListItem,
    AssessmentPagination,
    CreateAssessmentBody,
    CreateAssessmentResponse,
    DeleteAssessmentResponse,
    GetAssessmentSummaryResponse,
    UpdateAssessmentBody,
    UpdateAssessmentResponse,
} from "@/data/Assessment/type";
import { ClipboardList } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/** Risk groups the table's chips filter on; "all" means no narrowing. */
type RiskFilterValue = "all" | "at-risk" | "low" | "unscored";

export default function AssessmentsPage() {
    const [summary, setSummary] =
        useState<GetAssessmentSummaryResponse | null>(null);

    // The visible page lives in `pagination`, which the table reads from, so
    // no separate page state is needed here.
    const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
    const [pagination, setPagination] = useState<AssessmentPagination>(
        EMPTY_ASSESSMENT_PAGINATION
    );
    const [riskFilter, setRiskFilter] = useState<RiskFilterValue>("all");

    /** The row whose edit modal is open, or null when the table is at rest. */
    const [editing, setEditing] = useState<AssessmentListItem | null>(null);

    /** The row awaiting a delete confirmation, or null when none is pending. */
    const [assessmentToDelete, setAssessmentToDelete] =
        useState<AssessmentListItem | null>(null);

    // All start true so the mount fetches need no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);

    const fetchSummary = useCallback(async () => {
        try {
            const data = await getAssessmentSummaryApi();
            setSummary(data);
        } catch (error) {
            console.log("Error fetching assessment summary:", error);
        } finally {
            setIsSummaryLoading(false);
        }
    }, []);

    const fetchTable = useCallback(async (targetPage: number) => {
        try {
            setIsTableLoading(true);

            const { data, pagination: meta } = await getAssessmentsApi({
                page: targetPage,
                limit: ASSESSMENT_PAGE_SIZE,
            });

            setAssessments(data);
            setPagination(meta);
        } catch (error) {
            console.log("Error fetching assessments:", error);
        } finally {
            setIsTableLoading(false);
        }
    }, []);

    useEffect(() => {
        // Inlined rather than calling the fetchers: the set-state-in-effect
        // rule cannot see that they await before touching state, and a few
        // lines here is cheaper than disable comments.
        const load = async () => {
            const [summaryData, tableData] = await Promise.all([
                getAssessmentSummaryApi().catch((error) => {
                    console.log("Error fetching assessment summary:", error);
                    return null;
                }),
                getAssessmentsApi({
                    page: 1,
                    limit: ASSESSMENT_PAGE_SIZE,
                }).catch((error) => {
                    console.log("Error fetching assessments:", error);
                    return {
                        data: [] as AssessmentListItem[],
                        pagination: EMPTY_ASSESSMENT_PAGINATION,
                    };
                }),
            ]);

            setSummary(summaryData);
            setAssessments(tableData.data);
            setPagination(tableData.pagination);
            setIsSummaryLoading(false);
            setIsTableLoading(false);
        };

        load();
    }, []);

    // A new assessment moves every card and adds a row, and the list is
    // newest-first — so jump back to page 1 to keep the new record visible.
    const handleCreate = async (
        body: CreateAssessmentBody
    ): Promise<CreateAssessmentResponse> => {
        const record = await createAssessmentApi(body);

        await Promise.all([fetchTable(1), fetchSummary()]);

        return record;
    };

    // An edit can move a score across the at-risk threshold and reshuffles the
    // summary, so refresh both the current page and the cards. The page is kept
    // (not reset to 1) since the record is already on it.
    const handleUpdateAssessment = async (
        assessmentId: string,
        body: UpdateAssessmentBody
    ): Promise<UpdateAssessmentResponse> => {
        const record = await updateAssessmentApi(assessmentId, body);

        await Promise.all([fetchTable(pagination.page), fetchSummary()]);

        return record;
    };

    // Rejects on failure so the confirm dialog can surface the reason and stay
    // open; closes the dialog only once the row is gone.
    const handleDeleteAssessment = async (): Promise<DeleteAssessmentResponse> => {
        if (!assessmentToDelete) {
            throw new Error("No assessment selected to delete.");
        }

        const result = await deleteAssessmentApi(
            assessmentToDelete.assessment_id
        );

        // Removing the last row on a page would leave it empty, so step back a
        // page in that case; otherwise reload the page we were on.
        const targetPage =
            assessments.length === 1 && pagination.page > 1
                ? pagination.page - 1
                : pagination.page;

        await Promise.all([fetchTable(targetPage), fetchSummary()]);

        setAssessmentToDelete(null);

        return result;
    };

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <ClipboardList size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Nutritional Assessments
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                CLINICAL
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Capture screening, anthropometrics and malnutrition
                        scores.
                    </p>
                </div>
            </section>

            {/* Summary cards */}
            <AssessmentSummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />

            <div className="mt-4">
                <CreateAssessmentForm onSubmit={handleCreate} />
            </div>

            <AssessmentTable
                assessments={assessments}
                loading={isTableLoading}
                pagination={pagination}
                riskFilter={riskFilter}
                onRiskFilterChange={setRiskFilter}
                onPageChange={fetchTable}
                onEdit={setEditing}
                onDelete={setAssessmentToDelete}
            />

            {editing && (
                <EditAssessmentModal
                    assessment={editing}
                    onSubmit={(body) =>
                        handleUpdateAssessment(editing.assessment_id, body)
                    }
                    onClose={() => setEditing(null)}
                />
            )}

            {assessmentToDelete && (
                <DeleteAssessmentConfirmModal
                    assessmentId={assessmentToDelete.assessment_id}
                    patientName={assessmentToDelete.patient_name}
                    onCancel={() => setAssessmentToDelete(null)}
                    onConfirm={handleDeleteAssessment}
                />
            )}
        </main>
    );
}