import type { PendingDispatchOrder } from "@/data/MealDispatch/type";
import { Send, TriangleAlert, UtensilsCrossed } from "lucide-react";
import { useMemo } from "react";

const DASH = "—";

const MEAL_BADGE: Record<string, string> = {
    Breakfast: "bg-amber-50 text-amber-700",
    Lunch: "bg-emerald-50 text-emerald-700",
    Snack: "bg-blue-50 text-blue-700",
    Dinner: "bg-indigo-50 text-indigo-700",
};

/**
 * One trolley load: every ready tray bound for the same ward and meal slot.
 *
 * Grouping is ward + meal because that is how a trolley is actually routed —
 * the cook loads one ward's trays for one slot and pushes it up the corridor.
 * Splitting a ward across slots would produce loads that cannot be sent.
 */
export type Trolley = {
    key: string;
    ward_name: string;
    meal_type: string;
    orders: PendingDispatchOrder[];
};

const TRAY_PREVIEW_LIMIT = 4;

/** Patient name, falling back to the order id when the lookup came back empty. */
function trayPatient(order: PendingDispatchOrder) {
    return order.patient_name || order.order_id || DASH;
}

/**
 * Ready trays grouped into trolleys, each with a single Dispatch action.
 *
 * This is the fast path for the kitchen: one click per trolley instead of one
 * per tray. The table below stays the detailed, row-by-row view.
 */
export function TrolleyCards({
    orders,
    loading = false,
    /** Trolley key currently being dispatched, so only it disables. */
    dispatchingKey,
    onDispatchTrolley,
}: {
    orders: PendingDispatchOrder[];
    loading?: boolean;
    dispatchingKey?: string | null;
    onDispatchTrolley: (trolley: Trolley) => void;
}) {
    // One pass builds the groups. A Map keeps insertion order, so trolleys
    // appear in the order the API returned them rather than being resorted.
    const trolleys = useMemo(() => {
        const groups = new Map<string, Trolley>();

        for (const order of orders) {
            const ward = order.ward_name || "Unassigned Ward";
            const meal = order.meal_type || "N/A";
            const key = `${ward}::${meal}`;

            const existing = groups.get(key);

            if (existing) {
                existing.orders.push(order);
            } else {
                groups.set(key, {
                    key,
                    ward_name: ward,
                    meal_type: meal,
                    orders: [order],
                });
            }
        }

        return Array.from(groups.values());
    }, [orders]);

    if (loading) {
        return (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-400 shadow-sm">
                Loading trolleys...
            </p>
        );
    }

    if (trolleys.length === 0) {
        return (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
                <UtensilsCrossed className="mx-auto text-slate-300" size={28} />
                <p className="mt-2 text-sm font-medium text-slate-500">
                    No trolleys are loaded right now.
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                    Trays appear here once the kitchen marks them ready.
                </p>
            </div>
        );
    }

    return (
        <section className="mt-5">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        Trolleys Ready
                    </h2>
                    <p className="text-xs text-slate-400">
                        {trolleys.length} trolley
                        {trolleys.length === 1 ? "" : "s"} loaded for dispatch
                    </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    QUICK DISPATCH
                </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {trolleys.map((trolley) => {
                    const isDispatching = dispatchingKey === trolley.key;

                    const preview = trolley.orders.slice(0, TRAY_PREVIEW_LIMIT);
                    const overflow = trolley.orders.length - preview.length;

                    return (
                        <article
                            key={trolley.key}
                            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                        <UtensilsCrossed size={18} />
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold text-slate-800">
                                            {trolley.ward_name}
                                        </h3>
                                        <p className="text-[11px] text-slate-400">
                                            {trolley.orders.length} tray
                                            {trolley.orders.length === 1 ? "" : "s"}
                                        </p>
                                    </div>
                                </div>

                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                        MEAL_BADGE[trolley.meal_type] ??
                                        "bg-slate-100 text-slate-700"
                                    }`}
                                >
                                    {trolley.meal_type.toUpperCase()}
                                </span>
                            </div>

                            {/* Patient and bed per tray, so the porter can both
                                call the name and find the tray on the cart. */}
                            <div className="my-4 flex flex-wrap gap-1.5">
                                {preview.map((order) => (
                                    <span
                                        key={order.order_id}
                                        title={`${order.patient_name || "Unknown patient"} (${
                                            order.uhid || DASH
                                        }) — bed ${order.bed_number || DASH}${
                                            order.special_instruction
                                                ? ` — ${order.special_instruction}`
                                                : ""
                                        }`}
                                        className={`w-full flex justify-between rounded-lg px-2 py-1 ${
                                            order.special_instruction
                                                ? "bg-gray-50 text-green-600"
                                                : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        {/* Name is what the porter calls out;
                                            the bed is where the tray goes. */}
                                        <span className="block truncate text-[10px] font-bold leading-tight">
                                            {trayPatient(order)}
                                        </span>

                                        <span className="block truncate text-[10px] font-bold leading-tight opacity-70">
                                            Bed {order.bed_number || DASH}
                                        </span>
                                    </span>
                                ))}

                                {overflow > 0 && (
                                    <span
                                        title={`${overflow} more trays on this trolley`}
                                        className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400"
                                    >
                                        +{overflow} more
                                    </span>
                                )}
                            </div>

                            {/* mt-auto keeps every button on the card's bottom
                                edge regardless of how many beds are listed. */}
                            <button
                                type="button"
                                onClick={() => onDispatchTrolley(trolley)}
                                disabled={isDispatching}
                                className="mt-auto flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Send size={14} />
                                {isDispatching
                                    ? "Dispatching..."
                                    : "Dispatch Trolley"}
                            </button>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
