import type { GetAllergyPrefSummaryResponse } from "@/data/AllergyPref/type";
import { TriangleAlert, UsersRound, Utensils } from "lucide-react";
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
                    Preferences
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
 * Share of the patient registry, or null when the registry is empty.
 * Null rather than 0 so an empty denominator never renders as a real 0%.
 */
function shareOf(part: number, whole: number) {
    if (!whole) return null;

    return Math.round((part / whole) * 100);
}

/**
 * Slim bar under a subset card, showing how much of the patient registry the
 * metric covers. with_allergens and cultural_pref are counts of patients drawn
 * from paitents_count, so the bar keeps them reading as a share of the whole
 * rather than as standalone totals.
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
 * The three headline cards for GET /api/allergypref/summary.
 *
 * The first card is the registry the other two are subsets of, so the subset
 * cards state their share of it rather than standing alone. Note
 * cultural_pref excludes "Vegetarian", which the backend treats as the
 * implicit baseline — hence the wording below.
 */
export function AllergyPrefSummaryCards({
    summary,
    loading = false,
}: {
    summary: GetAllergyPrefSummaryResponse | null;
    loading?: boolean;
}) {
    const totalPatients = summary?.paitents_count ?? 0;
    const withAllergens = summary?.with_allergens ?? 0;
    const culturalPref = summary?.cultural_pref ?? 0;

    const allergyShare = shareOf(withAllergens, totalPatients);
    const culturalShare = shareOf(culturalPref, totalPatients);

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
                icon={UsersRound}
                label="Total Patients"
                value={totalPatients}
                helper="Every patient in the registry, with or without a preference record."
                loading={loading}
            />

            <SummaryCard
                icon={TriangleAlert}
                label="With Allergens"
                value={withAllergens}
                valueClassName="text-amber-600"
                helper={
                    loading
                        ? "Patients with an allergy restriction"
                        : allergyShare === null
                          ? "No patients to compare against yet."
                          : `${allergyShare}% of all patients`
                }
                loading={loading}
            >
                <ShareBar percent={allergyShare} tone="bg-amber-500" />
            </SummaryCard>

            <SummaryCard
                icon={Utensils}
                label="Cultural Preferences"
                value={culturalPref}
                helper={
                    loading
                        ? "Patients with a religious restriction"
                        : culturalShare === null
                          ? "No patients to compare against yet."
                          : `${culturalShare}% of all patients`
                }
                loading={loading}
            >
                <ShareBar percent={culturalShare} tone="bg-blue-500" />
            </SummaryCard>
        </section>
    );
}
