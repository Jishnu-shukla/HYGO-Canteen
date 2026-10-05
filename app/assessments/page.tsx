"use client";

import { AssessmentSummaryCards } from "@/components/Assessment/AssessmentSummaryCards";
import CreateAssessmentForm from "@/components/Assessment/CreateAssessmentForm";
import { createAssessmentApi, getAssessmentSummaryApi } from "@/data/Assessment/api";
import type {
    CreateAssessmentBody,
    CreateAssessmentResponse,
    GetAssessmentSummaryResponse,
} from "@/data/Assessment/type";
import { ClipboardList } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function AssessmentsPage() {
    const [summary, setSummary] =
        useState<GetAssessmentSummaryResponse | null>(null);

    // Starts true so the mount fetch needs no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);

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

    useEffect(() => {
        // Inlined rather than calling fetchSummary: the set-state-in-effect
        // rule cannot see that fetchSummary awaits before touching state, and
        // duplicating three lines here is cheaper than a disable comment.
        const load = async () => {
            const data = await getAssessmentSummaryApi().catch((error) => {
                console.log("Error fetching assessment summary:", error);
                return null;
            });

            setSummary(data);
            setIsSummaryLoading(false);
        };

        load();
    }, []);

    // A new assessment moves all three card values, so the cards are refreshed
    // from the handler rather than waiting for a reload.
    const handleCreate = async (
        body: CreateAssessmentBody
    ): Promise<CreateAssessmentResponse> => {
        const record = await createAssessmentApi(body);

        await fetchSummary();

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
        </main>
    );
}