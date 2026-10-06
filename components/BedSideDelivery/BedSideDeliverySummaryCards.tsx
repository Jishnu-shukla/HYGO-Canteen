import type { BedSideDeliverySummary } from "@/data/BedSideDelivery/type";
import { BedSingle, Gauge, TriangleAlert, Truck } from "lucide-react";
import type { ReactNode } from "react";

const DASH = "—";

type SummaryCardProps = {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    value: number | string;
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
                    Delivery
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
 * Share of the day's tray workload, or null when there is nothing to compare
 * against. Null rather than 0 so an empty denominator never renders as a real
 * 0%.
 */
function shareOf(part: number, whole: number) {
    if (!whole) return null;

    return Math.round((part / whole) * 100);
}

/** Slim bar showing how much of the day's workload a metric accounts for. */
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
 * The headline cards for GET /api/bedsidedelivery/summary.
 *
 * deliveries_today and pending_orders describe today's tray state, so they
 * add up to one workload and each states its share of that. low_intake and
 * avg_intake are patient-level intake measures over a different population,
 * so they stand alone rather than being compared against the tray counts.
 */
export function BedSideDeliverySummaryCards({
    summary,
    loading = false,
}: {
    summary: BedSideDeliverySummary | null;
    loading?: boolean;
}) {
    const deliveriesToday = summary?.deliveries_today ?? 0;
    const pendingOrders = summary?.pending_orders ?? 0;
    const lowIntake = summary?.low_intake ?? 0;

    // Null until something is delivered: there is no mean over an empty set.
    const avgIntake = summary?.avg_intake ?? null;

    const todaysTrays = deliveriesToday + pendingOrders;

    const deliveredShare = shareOf(deliveriesToday, todaysTrays);
    const pendingShare = shareOf(pendingOrders, todaysTrays);

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
                icon={Truck}
                label="Delivered Today"
                value={deliveriesToday}
                helper={
                    loading
                        ? "Trays handed over at the bedside"
                        : deliveredShare === null
                          ? "No deliveries recorded yet today."
                          : `${deliveredShare}% of today's trays delivered`
                }
                loading={loading}
            >
                <ShareBar percent={deliveredShare} tone="bg-emerald-500" />
            </SummaryCard>

            <SummaryCard
                icon={BedSingle}
                label="Pending Deliveries"
                value={pendingOrders}
                valueClassName="text-amber-600"
                helper={
                    loading
                        ? "Orders still waiting to be delivered"
                        : pendingShare === null
                          ? "Nothing is waiting to be delivered."
                          : `${pendingShare}% of today's trays still pending`
                }
                loading={loading}
            >
                <ShareBar percent={pendingShare} tone="bg-amber-500" />
            </SummaryCard>

            <SummaryCard
                icon={TriangleAlert}
                label="Low Intake Patients"
                value={lowIntake}
                valueClassName="text-red-500"
                helper={
                    loading
                        ? "Review needed"
                        : lowIntake > 0
                          ? "Intake below target — needs review"
                          : "No patients below target intake"
                }
                loading={loading}
            />

            <SummaryCard
                icon={Gauge}
                label="Average Intake"
                // avg_intake is null when nothing has been delivered yet, which
                // must not read as a genuine 0%.
                value={avgIntake === null ? DASH : `${avgIntake}%`}
                valueClassName={avgIntake === null ? "text-slate-300" : "text-slate-800"}
                helper={
                    loading
                        ? "Mean intake across today's deliveries"
                        : avgIntake === null
                          ? "No deliveries to average yet"
                          : "Mean intake across today's deliveries"
                }
                loading={loading}
            />
        </section>
    );
}
