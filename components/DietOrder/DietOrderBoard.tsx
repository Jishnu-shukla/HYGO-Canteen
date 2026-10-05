import type { DietOrderListItem } from "@/data/DietOrder/type";
import { BOARD_COLUMNS, mealBadge } from "./orderStatus";

/**
 * Kanban view of today's orders, mirroring the dashboard's Ward Meal Board.
 * Terminal states (Cancelled / Lost) are deliberately not shown here.
 */
export function DietOrderBoard({
    orders,
    loading = false,
}: {
    orders: DietOrderListItem[];
    loading?: boolean;
}) {
    // Match case-insensitively so a stray "ordered" still lands in a column.
    const ordersByStatus = (status: string) =>
        orders.filter((order) => order.status?.toLowerCase() === status.toLowerCase());

    // Off-board orders would otherwise vanish without explanation.
    const offBoardCount = orders.filter(
        (order) =>
            !BOARD_COLUMNS.some(
                (column) =>
                    column.key.toLowerCase() === order.status?.toLowerCase()
            )
    ).length;

    return (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Ward Meal Board
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Live meal order flow across wards
                    </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {loading ? "-" : orders.length} ORDERS
                </span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
                {BOARD_COLUMNS.map((column) => {
                    const columnOrders = ordersByStatus(column.key);

                    return (
                        <div
                            key={column.key}
                            className="min-h-[210px] overflow-hidden rounded-xl border border-blue-100 bg-slate-50"
                        >
                            <div className="border-b border-blue-100 bg-blue-50 px-3 py-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold tracking-wide text-amber-700">
                                        {column.title}
                                    </p>

                                    <span className="text-[10px] font-semibold text-slate-500">
                                        ({columnOrders.length})
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 p-2">
                                {columnOrders.length === 0 ? (
                                    <div className="flex min-h-[150px] items-center justify-center">
                                        <span className="text-xs text-slate-400">
                                            Empty
                                        </span>
                                    </div>
                                ) : (
                                    columnOrders.map((order) => (
                                        <div
                                            key={order.order_id}
                                            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-bold text-slate-800">
                                                        {order.patient_name ||
                                                            "Unknown Patient"}
                                                    </p>

                                                    <p className="mt-1 truncate text-[10px] text-slate-500">
                                                        {order.ward_name || "No ward"}
                                                    </p>
                                                </div>

                                                {order.is_special && (
                                                    <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-bold text-orange-600">
                                                        SPECIAL
                                                    </span>
                                                )}
                                            </div>

                                            {order.diet_type && (
                                                <p className="mt-2 truncate text-[10px] font-medium text-slate-600">
                                                    {order.diet_type}
                                                </p>
                                            )}

                                            <div className="mt-2 flex items-center justify-between">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-[9px] font-bold ${mealBadge(
                                                        order.meal_type
                                                    )}`}
                                                >
                                                    {order.meal_type?.toUpperCase()}
                                                </span>

                                                <span className="text-[9px] text-slate-400">
                                                    Bed {order.bed_number || "-"}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {offBoardCount > 0 && !loading && (
                <p className="mt-3 text-center text-[11px] text-slate-400">
                    {offBoardCount} order{offBoardCount === 1 ? "" : "s"} not on the
                    board (cancelled or lost) — see the list below.
                </p>
            )}
        </section>
    );
}