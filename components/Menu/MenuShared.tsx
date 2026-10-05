import { MenuMasterItem } from "@/data/Menu/type";

export const MENU_CELL = "px-4 py-3 align-top text-sm text-slate-700";

export const MENU_HEAD = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-amber-800";

/** Renders day lists without clipping; wraps instead of truncating. */
export function DayCell({ days }: { days: string[] }) {
    if (!days || days.length === 0) {
        return <span className="text-slate-400">&mdash;</span>;
    }

    if (days.length === 7) {
        return <span className="font-medium text-slate-700">Every day</span>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {days.map((day) => (
                <span
                    key={day}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                >
                    {day}
                </span>
            ))}
        </div>
    );
}

export function Pill({
    children,
    tone,
}: {
    children: React.ReactNode;
    tone: "amber" | "blue" | "emerald" | "slate";
}) {
    const tones = {
        amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
        blue: "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
        emerald: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
        slate: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    };

    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
        >
            {children}
        </span>
    );
}

/**
 * Stacked list rather than truncated chips — recipe names stay fully readable
 * instead of collapsing behind an ellipsis.
 *
 * Generic over the item type so GeneralMenu's
 * `MenuMasterItem & { selling_price }` rows keep their extra field.
 */
export function ItemList<T extends MenuMasterItem>({
    items,
    priceLabel,
}: {
    items: T[];
    priceLabel: (item: T) => string;
}) {
    if (!items || items.length === 0) {
        return <span className="text-sm text-slate-400">No items</span>;
    }

    return (
        <ul className="space-y-1.5">
            {items.map((item) => (
                <li
                    key={item.master_item_id}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
                >
                    <span className="text-sm font-medium text-slate-800">
                        {item.recipe_name}
                    </span>
                    <span className="text-sm tabular-nums text-slate-500">
                        {priceLabel(item)}
                    </span>
                </li>
            ))}
        </ul>
    );
}

export function formatDate(value: string) {
    if (!value) return "—";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString("en-CA");
}
