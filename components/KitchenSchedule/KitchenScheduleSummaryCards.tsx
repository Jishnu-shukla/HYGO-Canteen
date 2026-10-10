import type { GetKitchenScheduleSummaryResponse } from "@/data/KitchenSchedule/type";
import { Building2, ClipboardList, Users } from "lucide-react";

type SummaryCardProps = {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    value: number;
    helper: string;
    loading?: boolean;
    valueClassName?: string;
};

function SummaryCard({
    icon: Icon,
    label,
    value,
    helper,
    loading = false,
    valueClassName = "text-slate-800",
}: SummaryCardProps) {
    return (
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Icon size={19} />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                    Kitchen
                </span>
            </div>

            <p
                className={`mt-4 text-2xl font-semibold leading-none ${valueClassName}`}
            >
                {loading ? "-" : value.toLocaleString()}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>

            <p className="mt-0.5 text-[10px] text-slate-400">{helper}</p>
        </div>
    );
}

/**
 * The three headline cards for GET /api/kitchenschedule/summary.
 *
 * All three counts describe the same slice — orders scheduled for today — and
 * are derived from DietOrder rather than from the schedule rows. They are
 * deliberately not compared with one another: orders outnumber wards and
 * patients by design (a patient eats several meals a day), so a share bar
 * would misread any of them as a fraction of the whole.
 */
export function KitchenScheduleSummaryCards({
    summary,
    loading = false,
}: {
    summary: GetKitchenScheduleSummaryResponse | null;
    loading?: boolean;
}) {
    const totalOrders = summary?.total_orders ?? 0;
    const totalWards = summary?.total_wards ?? 0;
    const totalPatients = summary?.total_patients ?? 0;

    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
                icon={ClipboardList}
                label="Orders Today"
                value={totalOrders}
                helper="Orders scheduled for today. Cancelled orders are excluded."
                loading={loading}
            />

            <SummaryCard
                icon={Building2}
                label="Wards Covered"
                value={totalWards}
                valueClassName="text-blue-600"
                helper="Distinct wards with an order on today's schedule."
                loading={loading}
            />

            <SummaryCard
                icon={Users}
                label="Patients Served"
                value={totalPatients}
                valueClassName="text-emerald-600"
                helper="Distinct patients eating today, counted once each."
                loading={loading}
            />
        </section>
    );
}
