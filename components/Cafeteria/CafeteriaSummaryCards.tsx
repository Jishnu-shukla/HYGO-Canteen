import type { CafeteriaSummary } from "@/data/Cafeteria/type";
import { Armchair, IndianRupee, Receipt } from "lucide-react";
import type { ReactNode } from "react";

type SummaryCardProps = {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    /** Pre-formatted strings (₹ amounts) render as-is; numbers use en-IN. */
    value: string | number;
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
                    Today
                </span>
            </div>

            <p
                className={`mt-4 text-2xl font-semibold leading-none ${valueClassName}`}
            >
                {loading
                    ? "-"
                    : typeof value === "number"
                      ? value.toLocaleString("en-IN")
                      : value}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>

            <p className="mt-0.5 text-[10px] text-slate-400">{helper}</p>

            {children}
        </div>
    );
}

/**
 * Helper lines keyed on the contract's zero semantics — each field documents
 * what its 0 means, and the cards say so instead of claiming a real number
 * when nothing has been filed. A failed fetch also renders 0 (the api layer
 * returns null and the page falls back), which reads as "nothing yet" too.
 */
function revenueHelper(revenue: number, loading: boolean): string {
    if (loading) return "Paid sales, today's POS run";

    if (revenue === 0) return "No paid sale filed today";

    return "Sum of today's paid sales";
}

function transactionsHelper(transactions: number, loading: boolean): string {
    if (loading) return "Settled transactions today";

    if (transactions === 0) return "No settled transaction filed today";

    return "Paid + Refunded, pending excluded";
}

function tablesHelper(tables: number, loading: boolean): string {
    if (loading) return "Free to seat right now";

    if (tables === 0) return "No free table right now";

    return "Free to seat right now";
}

/**
 * The three headline cards for GET /api/cafeteria/summary.
 *
 * The pair on the left comes from the POS ledger and the one on the right
 * from TableOrder, so the footnote carries the contract's two traps: refunds
 * count under transactions but contribute 0 revenue (the two are not an
 * average-ticket ratio), and free tables are a point-in-time count rather
 * than an inventory. "Today" is the dashboard's own Asia/Kolkata day window —
 * no card can show a different day.
 */
export function CafeteriaSummaryCards({
    summary,
    loading = false,
}: {
    summary: CafeteriaSummary | null;
    loading?: boolean;
}) {
    const revenue = summary?.today_revenue ?? 0;
    const transactions = summary?.transactions ?? 0;
    const availableTables = summary?.available_tables ?? 0;

    return (
        <section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <SummaryCard
                    icon={IndianRupee}
                    label="Today's Revenue"
                    value={`₹${revenue.toLocaleString("en-IN")}`}
                    valueClassName="text-emerald-600"
                    helper={revenueHelper(revenue, loading)}
                    loading={loading}
                />

                <SummaryCard
                    icon={Receipt}
                    label="Transactions"
                    value={transactions}
                    valueClassName="text-slate-800"
                    helper={transactionsHelper(transactions, loading)}
                    loading={loading}
                />

                <SummaryCard
                    icon={Armchair}
                    label="Available Tables"
                    value={availableTables}
                    valueClassName="text-sky-600"
                    helper={tablesHelper(availableTables, loading)}
                    loading={loading}
                />
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-400">
                Today = the dashboard&apos;s Asia/Kolkata day window. Revenue
                counts Paid only while the transaction count also includes
                Refunded — the pair is not an average ticket, and pending rows
                count as neither. Free tables move as tables seat and free.
            </p>
        </section>
    );
}
