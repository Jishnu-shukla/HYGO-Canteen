type InventoryCardProps = {
    title: string;
    value: string | number;
    valueClassName?: string;
};

export function InventorySummaryCard({
    title,
    value,
    valueClassName = "text-slate-800",
}: InventoryCardProps) {
    return (
        <div className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
            <p className="text-[11px] font-semibold tracking-wide text-amber-700">
                {title}
            </p>
            <p
                className={`mt-1 text-2xl font-semibold leading-none ${valueClassName}`}
            >
                {value}
            </p>
        </div>
    );
}