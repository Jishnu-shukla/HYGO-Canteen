import type { GetAssessmentSummaryResponse } from "@/data/Assessment/type";
import { ClipboardList, Gauge, TriangleAlert } from "lucide-react";

type SummaryCardProps = {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    value: string;
    helper: string;
    valueClassName?: string;
};

function SummaryCard({
    icon: Icon,
    label,
    value,
    helper,
    valueClassName = "text-slate-800",
}: SummaryCardProps) {
    return (
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Icon size={19} />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                    Screening
                </span>
            </div>

            <p
                className={`mt-4 text-2xl font-semibold leading-none ${valueClassName}`}
            >
                {value}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>

            <p className="mt-0.5 text-[10px] text-slate-400">{helper}</p>
        </div>
    );
}

/**
 * Formats the mean latest NRS.
 *
 * avg_nrs is null until something has actually been scored, which is a
 * different statement from a measured mean of zero — so null renders as a dash
 * while a genuine 0 renders as 0.
 */
function formatAvgNrs(
    avgNrs: number | null,
    loading: boolean
): { value: string; helper: string } {
    if (loading) return { value: "-", helper: "Mean of latest scores" };

    if (avgNrs === null) {
        return { value: "—", helper: "No scores recorded yet." };
    }

    return { value: String(avgNrs), helper: "Mean of latest scores" };
}

/**
 * The three headline cards for GET /api/assessments/summary.
 *
 * There is deliberately no "x% of assessments" bar on the at-risk card, unlike
 * the allergy screen. total_assessments counts records and at_risk_paitent
 * counts distinct patients, so with repeat screenings the two are not a
 * numerator and denominator of the same set and a ratio between them would be
 * meaningless. The threshold and the per-patient basis are stated as text
 * instead, which is what a reader needs in order to act on the number.
 */
export function AssessmentSummaryCards({
    summary,
    loading = false,
}: {
    summary: GetAssessmentSummaryResponse | null;
    loading?: boolean;
}) {
    const totalAssessments = summary?.total_assessments ?? 0;
    const atRiskPatients = summary?.at_risk_paitent ?? 0;
    const avgNrs = summary?.avg_nrs ?? null;

    const avg = formatAvgNrs(avgNrs, loading);

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
                icon={ClipboardList}
                label="Total Assessments"
                value={loading ? "-" : String(totalAssessments)}
                helper="Every screening record, including repeat assessments."
            />

            <SummaryCard
                icon={TriangleAlert}
                label="At-Risk Patients"
                value={loading ? "-" : String(atRiskPatients)}
                valueClassName="text-amber-600"
                helper="Distinct patients whose latest score is 3 or above."
            />

            <SummaryCard
                icon={Gauge}
                label="Average NRS"
                value={avg.value}
                valueClassName="text-blue-600"
                helper={avg.helper}
            />
        </section>
    );
}