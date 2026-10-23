import type { GetPatientResponseSummary } from "@/data/Patient/type";
import { CalendarCheck, TriangleAlert, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

type SummaryCardProps = {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    value: number;
    helper: string;
    loading?: boolean;
    valueClassName?: string;
    children?: ReactNode;
};

function SummaryCard({
    icon: Icon,
    label,
    value,
    helper,
    loading = false,
    valueClassName = "text-slate-800",
    children,
}: SummaryCardProps) {
    return (
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Icon size={19} />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                    Patients
                </span>
            </div>

            <p
                className={`mt-4 text-2xl font-semibold leading-none ${valueClassName}`}
            >
                {loading ? "-" : value}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>

            <p className="mt-0.5 text-[10px] text-slate-400">{helper}</p>

            {children}
        </div>
    );
}

/**
 * Share of the roster, or null when the roster is empty.
 *
 * Null rather than 0 so an empty denominator never renders as a real 0%.
 */
function shareOf(part: number, whole: number) {
    if (!whole) return null;

    return Math.round((part / whole) * 100);
}

/**
 * Slim bar under a subset card, showing how much of the roster the metric
 * covers. active_plans and total_allergens are patient counts drawn from
 * total_patient, so the bar keeps them reading as a share of the whole rather
 * than as standalone totals.
 */
function ShareBar({
    percent,
    tone,
}: {
    percent: number | null;
    tone: string;
}) {
    return (
        <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="presentation"
        >
            {percent !== null && percent > 0 && (
                <div
                    className={`h-full rounded-full ${tone}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            )}
        </div>
    );
}

/**
 * The three headline cards for GET /api/patients/summary.
 *
 * Every card counts patients, never records: a patient with two overlapping
 * diet plans or several listed allergies still contributes 1. That is why the
 * first card is the roster the other two are subsets of, and why the subset
 * cards state their share of it instead of standing alone.
 */
export function PatientSummaryCards({
    summary,
    loading = false,
}: {
    summary: GetPatientResponseSummary | null;
    loading?: boolean;
}) {
    const totalPatients = summary?.total_patient ?? 0;
    const activePlans = summary?.active_plans ?? 0;
    const totalAllergens = summary?.total_allergens ?? 0;

    const planShare = shareOf(activePlans, totalPatients);
    const allergenShare = shareOf(totalAllergens, totalPatients);

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
                icon={UsersRound}
                label="Total Patients"
                value={totalPatients}
                helper="Every non-deleted patient on the working roster."
                loading={loading}
            />

            <SummaryCard
                icon={CalendarCheck}
                label="Active Diet Plans"
                value={activePlans}
                valueClassName="text-emerald-600"
                helper={
                    loading
                        ? "Patients with a plan in force today"
                        : planShare === null
                          ? "No patients to compare against yet."
                          : `${planShare}% of the roster`
                }
                loading={loading}
            >
                <ShareBar percent={planShare} tone="bg-emerald-500" />
            </SummaryCard>

            <SummaryCard
                icon={TriangleAlert}
                label="With Allergens"
                value={totalAllergens}
                valueClassName="text-amber-600"
                helper={
                    loading
                        ? "Patients with a recorded allergy preference"
                        : allergenShare === null
                          ? "No patients to compare against yet."
                          : `${allergenShare}% of the roster`
                }
                loading={loading}
            >
                <ShareBar percent={allergenShare} tone="bg-amber-500" />
            </SummaryCard>
        </section>
    );
}
