"use client";

import { AssessmentSummaryCards } from "@/components/Assessment/AssessmentSummaryCards";
import { AssessmentTable } from "@/components/Assessment/AssessmentTable";
import CreateAssessmentForm from "@/components/Assessment/CreateAssessmentForm";
import {
    ASSESSMENT_PAGE_SIZE,
    EMPTY_ASSESSMENT_PAGINATION,
    createAssessmentApi,
    getAssessmentSummaryApi,
    getAssessmentsApi,
} from "@/data/Assessment/api";
import type {
    AssessmentListItem,
    AssessmentPagination,
    CreateAssessmentBody,
    CreateAssessmentResponse,
    GetAssessmentSummaryResponse,
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
            />
        </main>
    );
}