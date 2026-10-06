import type { MealDispatchSummary } from "@/data/MealDispatch/type";
import { Send, Truck, UtensilsCrossed } from "lucide-react";
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
                    Dispatch
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
 * The headline cards for GET /api/mealdispatch/summary.
 *
 * pending_orders and dispatched_orders describe today's tray state, so they
 * add up to one workload and each card states its share of that instead of
 * standing alone. total_dispatches is a lifetime count across the whole
 * server and deliberately sits outside that comparison.
 */
export function MealDispatchSummaryCards({
    summary,
    loading = false,
}: {
    summary: MealDispatchSummary | null;
    loading?: boolean;
}) {
    const totalDispatches = summary?.total_dispatches ?? 0;
    const pendingOrders = summary?.pending_orders ?? 0;
    const dispatchedOrders = summary?.dispatched_orders ?? 0;

    const todaysTrays = pendingOrders + dispatchedOrders;

    const pendingShare = shareOf(pendingOrders, todaysTrays);
    const dispatchedShare = shareOf(dispatchedOrders, todaysTrays);

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
                icon={UtensilsCrossed}
                label="Total Dispatches"
                value={totalDispatches}
                helper="Every dispatch recorded on the server to date."
                loading={loading}
            />

            <SummaryCard
                icon={Send}
                label="Pending Orders"
                value={pendingOrders}
                valueClassName="text-amber-600"
                helper={
                    loading
                        ? "Trays still waiting to leave the kitchen"
                        : pendingShare === null
                          ? "No trays scheduled for dispatch yet."
                          : `${pendingShare}% of today's trays are still pending`
                }
                loading={loading}
            >
                <ShareBar percent={pendingShare} tone="bg-amber-500" />
            </SummaryCard>

            <SummaryCard
                icon={Truck}
                label="Dispatched Orders"
                value={dispatchedOrders}
                valueClassName="text-emerald-600"
                helper={
                    loading
                        ? "Trays already sent to the wards"
                        : dispatchedShare === null
                          ? "No trays scheduled for dispatch yet."
                          : `${dispatchedShare}% of today's trays have gone out`
                }
                loading={loading}
            >
                <ShareBar percent={dispatchedShare} tone="bg-emerald-500" />
            </SummaryCard>
        </section>
    );
}
