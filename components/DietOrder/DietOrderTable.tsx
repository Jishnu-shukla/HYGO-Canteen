import type {
    DietOrderListItem,
    DietOrderPagination,
    OrderStatus,
} from "@/data/DietOrder/type";
import { TriangleAlert } from "lucide-react";
import { STATUS_BADGE, STATUS_LABEL, mealBadge } from "./orderStatus";

const DASH = "—";

const headCell =
    "whitespace-nowrap px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700";
const bodyCell = "px-2 py-2 text-[11px] text-slate-600";

/**
 * Percentage widths for `table-fixed` so the layout never exceeds the
 * container. Order/Source/Ward/Bed are fixed-ish; Patient, Doctor
 * Instruction and Status absorb the remaining space and truncate.
 */
const COL_WIDTHS = [
    "9%", // Order
    "5%", // Source
    "8%", // Patient
    "7%", // Ward
    "4%", // Bed
    "6%", // Meal
    "6%", // Diet
    "6%", // Schedule
    "15%", // Doctor Instruction
    "7%", // Status
    "5%", // Special
];

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

export function DietOrderTable({
    orders,
    loading = false,
    pagination,
    onPageChange,
}: {
    orders: DietOrderListItem[];
    loading?: boolean;
    pagination?: DietOrderPagination;
    onPageChange?: (page: number) => void;
}) {
    const page = pagination?.page ?? 1;
    const totalPages = pagination?.total_pages ?? 1;
    const total = pagination?.total ?? orders.length;

    const isFirstPage = page <= 1;
    const isLastPage = page >= totalPages;

    // Row range for the "showing X–Y of Z" line.
    const from = total === 0 ? 0 : (page - 1) * (pagination?.limit ?? 0) + 1;
    const to = from === 0 ? 0 : from + orders.length - 1;

    return (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Today&apos;s Orders
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Orders entered today, newest first
                    </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {loading ? "-" : total} ORDERS
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                    <colgroup>
                        {COL_WIDTHS.map((width) => (
                            <col key={`${width}-${Math.random()}`} style={{ width }} />
                        ))}
                    </colgroup>

                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {[
                                "Order",
                                "Source",
                                "Patient",
                                "Ward",
                                "Bed",
                                "Meal",
                                "Diet",
                                "Schedule",
                                "Doctor Instruction",
                                "Status",
                                "Special",
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
                                    colSpan={11}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    Loading orders...
                                </td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={11}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No orders were created today.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr
                                    key={order.order_id}
                                    className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                                >
                                    <td
                                        className={`${bodyCell} truncate font-semibold text-slate-700`}
                                        title={order.order_id}
                                    >
                                        {order.order_id}
                                    </td>

                                    <td
                                        className={`${bodyCell} truncate`}
                                        title={order.order_source}
                                    >
                                        {order.order_source || DASH}
                                    </td>

                                    <td
                                        className={`${bodyCell} truncate font-semibold text-slate-800`}
                                        title={order.patient_name}
                                    >
                                        {order.patient_name || "Unknown"}
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
                                            className={`block truncate rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold ${mealBadge(
                                                order.meal_type
                                            )}`}
                                            title={order.meal_type}
                                        >
                                            {order.meal_type?.toUpperCase()}
                                        </span>
                                    </td>

                                    <td
                                        className={`${bodyCell} truncate`}
                                        title={order.diet_type ?? ""}
                                    >
                                        {order.diet_type || DASH}
                                    </td>

                                    <td className={`${bodyCell} whitespace-nowrap`}>
                                        {formatDate(order.scheduled_date)}
                                    </td>

                                    <td className={bodyCell}>
                                        {order.special_instruction ? (
                                            <p
                                                title={order.special_instruction}
                                                className="truncate"
                                            >
                                                {order.special_instruction}
                                            </p>
                                        ) : (
                                            <span className="text-slate-300">
                                                {DASH}
                                            </span>
                                        )}
                                    </td>

                                    <td className={bodyCell}>
                                        <span
                                            className={`block truncate rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold ${
                                                STATUS_BADGE[
                                                    order.status as OrderStatus
                                                ] ?? "bg-slate-100 text-slate-700"
                                            }`}
                                            title={
                                                STATUS_LABEL[order.status] ??
                                                order.status
                                            }
                                        >
                                            {STATUS_LABEL[order.status] ??
                                                order.status}
                                        </span>

                                        {order.status === "Cancelled_Order" &&
                                            order.cancellation_reason && (
                                                <p
                                                    title={order.cancellation_reason}
                                                    className="truncate text-[9px] text-red-400"
                                                >
                                                    {order.cancellation_reason}
                                                </p>
                                            )}
                                    </td>

                                    <td className={`${bodyCell} text-center`}>
                                        {order.is_special ? (
                                            <span
                                                title="Special order"
                                                className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold text-orange-600"
                                            >
                                                <TriangleAlert size={10} />
                                                YES
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">
                                                {DASH}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pager — server-side page change, table only */}
            {onPageChange && total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                    <p className="text-[11px] text-slate-500">
                        {loading
                            ? "Loading..."
                            : `Showing ${from}–${to} of ${total}`}
                    </p>

                    <div className="flex items-center gap-2">
                        <PagerButton
                            label="Previous"
                            disabled={loading || isFirstPage}
                            onClick={() => onPageChange(page - 1)}
                        />

                        <span className="min-w-[70px] text-center text-[11px] font-semibold text-slate-600">
                            Page {page} of {totalPages}
                        </span>

                        <PagerButton
                            label="Next"
                            disabled={loading || isLastPage}
                            onClick={() => onPageChange(page + 1)}
                        />
                    </div>
                </div>
            )}
        </section>
    );
}

function PagerButton({
    label,
    disabled,
    onClick,
}: {
    label: string;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
            {label}
        </button>
    );
}