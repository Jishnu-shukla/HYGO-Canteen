import type {
    GetKitchenScheduleOrdersResponse,
    KitchenScheduleOrderRow,
    KitchenScheduleWardCounts,
} from "@/data/KitchenSchedule/type";
import { DIET_TYPE } from "@/data/Menu/type";
import type { DietType, MealSlot } from "@/data/Menu/type";
import { Table2 } from "lucide-react";

/** Every slot the backend can return, in wire order. */
const MEAL_SLOT_ORDER: MealSlot[] = [
    "Breakfast",
    "Lunch",
    "Snack",
    "Dinner",
    "N/A",
];

function totalOrders(counts: KitchenScheduleWardCounts): number {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

/**
 * The meal_slot × diet_type pivot from GET /api/kitchenschedule/orders, each
 * cell listing the wards in that cell with their order counts.
 *
 * The rows and columns come from the fixed wire lists rather than the payload,
 * so a slot or diet type with no orders still owns its row/column and simply
 * reads as empty — that is what makes the grid comparable day to day.
 */
export function KitchenScheduleOrdersTable({
    orders,
    loading = false,
}: {
    orders: GetKitchenScheduleOrdersResponse | null;
    loading?: boolean;
}) {
    // Index the sparse pivot so a missing row or cell reads as empty.
    const bySlot = new Map<MealSlot, KitchenScheduleOrderRow>();

    for (const row of orders ?? []) {
        bySlot.set(row.meal_slot, row);
    }

    const cellFor = (slot: MealSlot, diet: DietType): KitchenScheduleWardCounts =>
        bySlot.get(slot)?.diet_types?.[diet] ?? {};

    return (
        <section className="mt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                    <Table2 size={18} className="text-slate-400" />

                    <h2 className="text-base font-semibold text-slate-800">
                        Orders by Meal Slot &amp; Diet Type
                    </h2>
                </div>

                <p className="text-xs text-slate-500">
                    Ward order counts for today&rsquo;s scheduled orders
                </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Meal Slot
                                </th>

                                {DIET_TYPE.map((diet) => (
                                    <th
                                        key={diet}
                                        className="border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                                    >
                                        {diet}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {MEAL_SLOT_ORDER.map((slot) => (
                                <tr
                                    key={slot}
                                    className="odd:bg-white even:bg-slate-50"
                                >
                                    <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-inherit px-3 py-3 text-left align-top">
                                        <span className="text-sm font-semibold text-slate-700">
                                            {slot}
                                        </span>
                                    </th>

                                    {DIET_TYPE.map((diet) => {
                                        const counts = cellFor(slot, diet);
                                        const entries = Object.entries(counts);

                                        return (
                                            <td
                                                key={diet}
                                                className="border-b border-slate-200 px-3 py-3 align-top"
                                            >
                                                {loading ? (
                                                    <span className="block h-4 w-20 animate-pulse rounded bg-slate-200/70" />
                                                ) : entries.length === 0 ? (
                                                    <span className="text-xs text-slate-300">
                                                        &mdash;
                                                    </span>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                                {entries.length}{" "}
                                                                ward
                                                                {entries.length === 1
                                                                    ? ""
                                                                    : "s"}
                                                            </span>

                                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                                                {totalOrders(
                                                                    counts
                                                                )}
                                                            </span>
                                                        </div>

                                                        {entries.map(
                                                            ([ward, count]) => (
                                                                <div
                                                                    key={ward}
                                                                    className="flex items-center justify-between gap-2 rounded-md bg-slate-100 px-2 py-1"
                                                                >
                                                                    <span
                                                                        className="truncate text-xs text-slate-700"
                                                                        title={
                                                                            ward
                                                                        }
                                                                    >
                                                                        {ward}
                                                                    </span>

                                                                    <span className="shrink-0 text-xs font-semibold text-slate-800">
                                                                        {
                                                                            count
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
