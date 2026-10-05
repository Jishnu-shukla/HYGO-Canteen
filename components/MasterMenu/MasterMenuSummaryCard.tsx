import { MasterMenuSummary } from "@/data/MasterMenu/type";
import { BookOpenCheck, ChefHat, ClipboardList } from "lucide-react";

type MasterMenuSummaryCardProps = {
    icon: React.ReactNode;
    label: string;
    value: number;
    helper: string;
};

export function MasterMenuSummaryCard({
    icon,
    label,
    value,
    helper,
}: MasterMenuSummaryCardProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    {icon}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                    Master Menu
                </span>
            </div>
            <p className="mt-4 text-2xl font-semibold text-slate-800">{value}</p>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{helper}</p>
        </div>
    );
}

export default function MasterMenuSummaryCards({
    summary,
}: {
    summary: MasterMenuSummary;
}) {
    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MasterMenuSummaryCard
                icon={<ChefHat size={19} />}
                label="Total Menu Items"
                value={summary.total_menu_items}
                helper="Across all categories"
            />
            <MasterMenuSummaryCard
                icon={<BookOpenCheck size={19} />}
                label="Approved Recipes"
                value={summary.approved_recipes}
                helper="Cleared for service"
            />
            <MasterMenuSummaryCard
                icon={<ClipboardList size={19} />}
                label="Pending Approvals"
                value={summary.pending_approvals}
                helper="Awaiting sign-off"
            />
        </section>
    );
}
