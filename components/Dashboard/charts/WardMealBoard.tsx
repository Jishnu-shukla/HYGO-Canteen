import { useMemo } from "react";

interface WardMealBoardProps {
    orders: (dashboardOrder & {
        status?: string;
        bad_number?: string;
        bed_number?: string;
        is_special?: boolean;
    })[];
}

type MealBoardOrder = {
    order_id: string;
    patient_name: string;
    ward_name: string;
    meal_type: string;
    bed_number: string;
    status: string;
    is_special?: boolean;
};

export function WardMealBoard({ orders: apiOrders }: WardMealBoardProps) {
    // Use ALL meal orders returned by the API.
    // There is no separate pendingOrders/specialOrders source anymore.
    const mealOrders: MealBoardOrder[] = useMemo(() => {
        return apiOrders.map((order) => ({
            order_id: order.order_id,
            patient_name: order.patient_id?.name ?? "Unknown Patient",
            ward_name: order.ward_name.label ?? "Unknown Ward",
            meal_type: order.meal_type?.label ?? "Meal",
            bed_number: order.bed_number ?? order.bad_number ?? "-",
            status: order.status ?? "Ordered",
            is_special: !!order.is_special,
        }));
    }, [apiOrders]);

    // Database statuses
    const columns = [
        {
            key: "Ordered",
            title: "ORDERED",
        },
        {
            key: "Approved",
            title: "APPROVED",
        },
        {
            key: "Ready",
            title: "READY",
        },
        {
            key: "Dispatched",
            title: "DISPATCHED",
        },
        {
            key: "Recieved",
            title: "RECIEVED",
        },
    ];

    const getOrdersForColumn = (status: string) => {
        return mealOrders.filter(
            (order) =>
                order.status?.toLowerCase() === status.toLowerCase()
        );
    };

    const mealBadge = (mealType: string) => {
        const meal = mealType?.toUpperCase();

        if (meal.includes("LIQUID")) {
            return "bg-purple-50 text-purple-700";
        }

        if (meal.includes("SOFT")) {
            return "bg-blue-50 text-blue-700";
        }

        if (meal.includes("DIABET")) {
            return "bg-indigo-50 text-indigo-700";
        }

        if (meal.includes("RENAL")) {
            return "bg-red-50 text-red-700";
        }

        return "bg-slate-100 text-slate-700";
    };

    return (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {/* Header */}
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
                    {mealOrders.length} ORDERS
                </span>
            </div>

            {/* Board */}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
                {columns.map((column) => {
                    const columnOrders = getOrdersForColumn(column.key);

                    return (
                        <div
                            key={column.key}
                            className="min-h-[210px] overflow-hidden rounded-xl border border-blue-100 bg-slate-50"
                        >
                            {/* Column Header */}
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

                            {/* Orders */}
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
                                                        {order.patient_name}
                                                    </p>

                                                    <p className="mt-1 truncate text-[10px] text-slate-500">
                                                        {order.ward_name} •{" "}
                                                        {order.meal_type}
                                                    </p>
                                                </div>

                                                {order.is_special && (
                                                    <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-bold text-orange-600">
                                                        SPECIAL
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-2 flex items-center justify-between">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-[9px] font-bold ${mealBadge(
                                                        order.meal_type
                                                    )}`}
                                                >
                                                    {order.meal_type?.toUpperCase()}
                                                </span>

                                                <span className="text-[9px] text-slate-400">
                                                    Bed {order.bed_number}
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
        </section>
    );
}
