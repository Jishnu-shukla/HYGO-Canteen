export default function RecipeSummaryCard({
    icon,
    label,
    value,
    helper,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    helper: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    {icon}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                    Recipe
                </span>
            </div>
            <p className="mt-4 text-2xl font-semibold text-slate-800">{value}</p>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{helper}</p>
        </div>
    );
}