type DietOrderSummaryCardProps = {
    label: string;
    value: number;
    valueClassName?: string;
    loading?: boolean;
};

export function DietOrderSummaryCard({
    label,
    value,
    valueClassName = "text-slate-800",
    loading = false,
}: DietOrderSummaryCardProps) {
    return (
        <div className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                {label}
            </p>

            <p
                className={`mt-1 text-2xl font-semibold leading-none ${valueClassName}`}
            >
                {loading ? "-" : value}
            </p>
        </div>
    );
}