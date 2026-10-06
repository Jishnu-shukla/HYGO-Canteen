import type { PendingDispatchOrder } from "@/data/MealDispatch/type";
import { Send, TriangleAlert } from "lucide-react";

const DASH = "—";

const headCell =
    "whitespace-nowrap px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-amber-700";
const bodyCell = "px-2 py-2 text-center text-[11px] text-slate-600";

/**
 * Percentage widths for `table-fixed` so the layout never exceeds the
 * container. Ward/Bed/Meal are fixed-ish; patient and instruction absorb the
 * remaining space and truncate.
 */
const COL_WIDTHS = [
    "11%", // Order
    "15%", // Patient
    "12%", // Ward
    "7%", // Bed
    "7%", // Meal
    "18%", // Kitchen Instruction
    "13%", // Action
];

const MEAL_BADGE: Record<string, string> = {
    Breakfast: "bg-amber-50 text-amber-700",
    Lunch: "bg-emerald-50 text-emerald-700",
    Snack: "bg-blue-50 text-blue-700",
    Dinner: "bg-indigo-50 text-indigo-700",
};

/** "2026-10-02T00:00:00.000Z" -> "02 Oct 2026". Falls back to the raw string. */
function formatDate(value: string) {
    if (!value) return DASH;

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

/**
 * Ready trays waiting to leave the kitchen, each with a Dispatch action.
 *
 * The row is only dropped once the server confirms a write actually landed,
 * so a failed dispatch leaves the tray visible and the reason on screen.
 */
export function MealDispatchTable({
    orders,
    loading = false,
    /** `order_id` currently being dispatched, so only that row's button disables. */
    dispatchingId,
    error,
    onDispatch,
}: {
    orders: PendingDispatchOrder[];
    loading?: boolean;
    dispatchingId?: string | null;
    error?: string | null;
    onDispatch: (order: PendingDispatchOrder) => void;
}) {
    return (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Ready to Dispatch
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Trays the kitchen has marked ready for the wards
                    </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {loading ? "-" : orders.length} TRAYS
                </span>
            </div>

            {error && (
                <p
                    role="alert"
                    className="border-b border-red-100 bg-red-50 px-4 py-2 text-[11px] font-medium text-red-700"
                >
                    {error}
                </p>
            )}

            <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                    <colgroup>
                        {COL_WIDTHS.map((width, index) => (
                            <col key={index} style={{ width }} />
                        ))}
                    </colgroup>

                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {[
                                "Order",
                                "Patient",
                                "Ward",
                                "Bed",
                                "Meal",
                                "Kitchen Instruction",
                                "Action",
                            ].map((heading) => (
                                <th key={heading} scope="col" className={headCell}>
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    Loading trays...
                                </td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No trays are ready to dispatch.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => {
                                const isDispatching = dispatchingId === order.order_id;

                                return (
                                    <tr
                                        key={order.order_id}
                                        className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                                    >
                                        <td
                                            className={`${bodyCell} truncate font-semibold text-slate-700`}
                                            title={order.order_id}
                                        >
                                            {order.order_id || DASH}
                                        </td>

                                        <td className={bodyCell}>
                                            <p
                                                className="truncate font-semibold text-slate-800"
                                                title={order.patient_name}
                                            >
                                                {order.patient_name || "Unknown"}
                                            </p>

                                            <p
                                                className="truncate text-[9px] text-slate-400"
                                                title={order.uhid}
                                            >
                                                {order.uhid || DASH}
                                            </p>
                                        </td>

                                        <td
                                            className={`${bodyCell} truncate`}
                                            title={order.ward_name}
                                        >
                                            {order.ward_name || DASH}
                                        </td>

                                        <td className={`${bodyCell} truncate`}>
                                            {order.bed_number || DASH}
                                        </td>

                                        <td className={bodyCell}>
                                            <span
                                                className={`block truncate rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold ${
                                                    MEAL_BADGE[order.meal_type] ??
                                                    "bg-slate-100 text-slate-700"
                                                }`}
                                                title={order.meal_type}
                                            >
                                                {order.meal_type?.toUpperCase() ?? DASH}
                                            </span>
                                        </td>

                                        <td className={bodyCell}>
                                            {order.special_instruction ? (
                                                <p
                                                    className="flex items-center gap-1 truncate text-amber-700"
                                                    title={order.special_instruction}
                                                >
                                                    <TriangleAlert
                                                        size={11}
                                                        className="shrink-0"
                                                    />
                                                    {order.special_instruction}
                                                </p>
                                            ) : (
                                                <span className="text-slate-300">
                                                    {DASH}
                                                </span>
                                            )}
                                        </td>

                                        <td className={bodyCell}>
                                            <button
                                                type="button"
                                                onClick={() => onDispatch(order)}
                                                disabled={isDispatching}
                                                className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-blue-700 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Send size={11} />
                                                {isDispatching
                                                    ? "Sending..."
                                                    : "Dispatch"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
