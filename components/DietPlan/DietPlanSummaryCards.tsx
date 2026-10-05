import type { DietTypeCount, GetDietPlanSummaryResponse } from "@/data/DietPlan/type";
import { CalendarCheck, Layers, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SummaryCardProps = {
    icon: LucideIcon;
    label: string;
    value: number;
    helper: string;
    loading?: boolean;
    valueClassName?: string;
    /** Extra content rendered under the headline, e.g. the diet-type mix. */
    children?: ReactNode;
};

/**
 * Shared shell for the three diet-plan cards. Keeps the height stable while
 * loading by reserving the headline's line box.
 */
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
                    Diet Plan
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
 * Per-type counts as wrapping pills rather than a fixed-height list, so every
 * diet type stays readable instead of collapsing behind a scrollbar.
 */
function DietTypeMix({
    dietTypes,
    loading,
}: {
    dietTypes: DietTypeCount[];
    loading: boolean;
}) {
    // Reserving the divider row keeps the card heights stable, and staying
    // silent while loading avoids claiming there are no diets yet.
    if (loading) {
        return <div className="mt-3 border-t border-slate-100 pt-3" />;
    }

    if (dietTypes.length === 0) {
        return (
            <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                No diet types on active plans yet.
            </p>
        );
    }

    return (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
            {dietTypes.map((row) => (
                <span
                    key={row.diet_type}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-800 ring-1 ring-blue-200"
                >
                    {row.diet_type}
                    <span className="tabular-nums text-blue-500">{row.count}</span>
                </span>
            ))}
        </div>
    );
}

/**
 * The three headline cards for GET /api/dietplan/summary:
 *   - Active Plans    plans in force today (status, start and end date all check out)
 *   - Diet Types      how many diet types those active plans cover, plus the mix
 *   - With Allergens  patients carrying at least one allergy — a patient count,
 *                     not a plan count, so it is labelled as such
 */
export function DietPlanSummaryCards({
    summary,
    loading = false,
}: {
    summary: GetDietPlanSummaryResponse | null;
    loading?: boolean;
}) {
    // Types can repeat across rows if the backend ever splits them, so the
    // headline counts distinct types and the mix sums the plans behind them.
    const dietTypes = summary?.diet_types ?? [];
    const distinctDietTypes = new Set(dietTypes.map((row) => row.diet_type)).size;
    const plansBehindMix = dietTypes.reduce((sum, row) => sum + row.count, 0);

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
                icon={CalendarCheck}
                label="Active Plans"
                value={summary?.active_plans ?? 0}
                helper="Started, in date and still running today"
                loading={loading}
            />

            <SummaryCard
                icon={Layers}
                label="Diet Types"
                value={distinctDietTypes}
                helper={
                    loading
                        ? "Active plans by diet type"
                        : dietTypes.length === 0
                          ? "Breakdown of active plans by diet"
                          : `${plansBehindMix} active plan${plansBehindMix === 1 ? "" : "s"} on therapeutic diets`
                }
                loading={loading}
            >
                <DietTypeMix dietTypes={dietTypes} loading={loading} />
            </SummaryCard>

            <SummaryCard
                icon={TriangleAlert}
                label="With Allergens"
                value={summary?.with_allergens ?? 0}
                valueClassName="text-amber-600"
                helper="Patients with at least one allergy restriction"
                loading={loading}
            />
        </section>
    );
}
