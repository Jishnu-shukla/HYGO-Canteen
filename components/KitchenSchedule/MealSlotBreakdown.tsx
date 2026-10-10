import type { GetKitchenScheduleSummaryResponse } from "@/data/KitchenSchedule/type";
import type { MealSlot } from "@/data/Menu/type";
import { Coffee, Moon, Sunrise, UtensilsCrossed } from "lucide-react";

type SlotStyle = {
    slot: MealSlot;
    icon: React.ComponentType<{ size?: number }>;
    /** Tinted tile — deliberately unlike the white headline cards. */
    tile: string;
};

const SLOT_STYLES: SlotStyle[] = [
    {
        slot: "Breakfast",
        icon: Sunrise,
        tile: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
        slot: "Lunch",
        icon: UtensilsCrossed,
        tile: "border-orange-200 bg-orange-50 text-orange-700",
    },
    {
        slot: "Snack",
        icon: Coffee,
        tile: "border-teal-200 bg-teal-50 text-teal-700",
    },
    {
        slot: "Dinner",
        icon: Moon,
        tile: "border-indigo-200 bg-indigo-50 text-indigo-700",
    },
];

/**
 * The per-meal-slot split from GET /api/kitchenschedule/summary, shown under
 * the headline cards.
 *
 * A separate, tinted tile design on purpose: these four numbers are their own
 * series (orders per slot), not a share of the headline totals, so they should
 * not read as the same cards with an extra row.
 */
export function MealSlotBreakdown({
    mealSlots,
    loading = false,
}: {
    mealSlots: GetKitchenScheduleSummaryResponse["meal_slots"] | undefined;
    loading?: boolean;
}) {
    return (
        <section className="mt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="text-base font-semibold text-slate-800">
                    Orders by Meal Slot
                </h2>

                <p className="text-xs text-slate-500">
                    Orders scheduled for each meal today
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {SLOT_STYLES.map(({ slot, icon: Icon, tile }) => (
                    <div
                        key={slot}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${tile}`}
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70">
                            <Icon size={18} />
                        </span>

                        <div className="min-w-0">
                            <p className="truncate text-[10px] font-bold uppercase tracking-wide opacity-70">
                                {slot}
                            </p>

                            <p className="text-xl font-semibold leading-tight">
                                {loading ? "-" : (mealSlots?.[slot] ?? 0)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
