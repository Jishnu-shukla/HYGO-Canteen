import {
    LOW_INTAKE_THRESHOLD_PERCENTAGE,
    type PlateWasteInterface,
} from "@/data/PlateWaste/type";
import { Gauge, TriangleAlert, UtensilsCrossed } from "lucide-react";

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
                    Analytics
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
 * Formats avg_intake.
 *
 * Unlike the bedside-delivery summary this value is never null — the contract
 * returns 0 on an empty log — so there is no dash state. Rendered to two
 * decimals to match the precision the server reports it at.
 *
 * Zero is deliberately ambiguous (every plate untouched, or none logged yet),
 * so when the value is 0 the helper says exactly that instead of claiming to
 * know which situation produced it.
 */
function formatAvgIntake(
    avgIntake: number,
    loading: boolean
): { value: string; helper: string } {
    if (loading) {
        return { value: "-", helper: "Mean intake across every logged plate" };
    }

    if (avgIntake === 0) {
        return {
            value: "0.00%",
            helper: "0% = every plate untouched, or none logged yet",
        };
    }

    return {
        value: `${avgIntake.toFixed(2)}%`,
        helper: "Mean intake across every logged plate",
    };
}

/**
 * The three headline cards for GET /api/platewaste/summary.
 *
 * All three aggregate across the whole logged history and the contract offers
 * no pair of nested numbers for the cards, so unlike the allergy screen there
 * are no comparison bars here — each counter is stated as text instead, which
 * is all a reader needs in order to act on it. diet_types in particular is a
 * breadth measure (distinct diet types among logged patients), not a share of
 * anything, so a bar would silently misread it.
 */
export function PlateWasteSummaryCards({
    summary,
    loading = false,
}: {
    summary: PlateWasteInterface | null;
    loading?: boolean;
}) {
    const avgIntake = summary?.avg_intake ?? 0;
    const lowIntake = summary?.low_intake ?? 0;
    const dietTypes = summary?.diet_types ?? 0;

    const avg = formatAvgIntake(avgIntake, loading);

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
                icon={Gauge}
                label="Average Intake"
                value={avg.value}
                helper={avg.helper}
            />

            <SummaryCard
                icon={TriangleAlert}
                label="Low Intake Patients"
                value={loading ? "-" : lowIntake.toLocaleString()}
                valueClassName="text-red-500"
                helper={
                    loading
                        ? "Patients eating at or below the threshold"
                        : `Distinct patients whose logged intake is ${LOW_INTAKE_THRESHOLD_PERCENTAGE}% or below.`
                }
            />

            <SummaryCard
                icon={UtensilsCrossed}
                label="Diet Types Covered"
                value={loading ? "-" : dietTypes.toLocaleString()}
                valueClassName="text-blue-600"
                helper={
                    loading
                        ? "Breadth of coverage among logged patients"
                        : "Distinct diet types among patients with plate-waste logs."
                }
            />
        </section>
    );
}