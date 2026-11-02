"use client";

import {
    getKitchenScheduleSlotOrdersApi,
    updateKitchenScheduleOrdersReadyApi,
} from "@/data/KitchenSchedule/api";
import type { KitchenScheduleOrderItem } from "@/data/KitchenSchedule/type";
import { DIET_TYPE } from "@/data/Menu/type";
import type { DietType, MealSlot } from "@/data/Menu/type";
import {
    CheckCheck,
    LoaderCircle,
    RefreshCw,
    Sparkles,
    TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";

/** Wire order of the slots, so the list reads like the pivot table. */
const MEAL_SLOT_ORDER: MealSlot[] = [
    "Breakfast",
    "Lunch",
    "Snack",
    "Dinner",
    "General",
];

const SLOT_ORDER = new Map<MealSlot, number>(
    MEAL_SLOT_ORDER.map((slot, index) => [slot, index])
);

const DIET_ORDER = new Map<DietType, number>(
    DIET_TYPE.map((diet, index) => [diet, index])
);

/**
 * An order belongs in this section when the kitchen must give it special
 * attention: it is flagged `is_special`, or it carries a written instruction
 * (the instruction alone is enough — that is the note the cook has to read).
 */
function isSpecialOrder(order: KitchenScheduleOrderItem): boolean {
    return (
        order.is_special === true ||
        (order.special_instruction ?? "").trim() !== ""
    );
}

/** Meal slot first (wire order), then diet type, then ward A→Z. */
function sortOrders(
    orders: KitchenScheduleOrderItem[]
): KitchenScheduleOrderItem[] {
    return [...orders].sort((a, b) => {
        const slotDelta =
            (SLOT_ORDER.get(a.meal_type) ?? MEAL_SLOT_ORDER.length) -
            (SLOT_ORDER.get(b.meal_type) ?? MEAL_SLOT_ORDER.length);

        if (slotDelta !== 0) return slotDelta;

        const dietDelta =
            (DIET_ORDER.get(a.diet_type) ?? DIET_TYPE.length) -
            (DIET_ORDER.get(b.diet_type) ?? DIET_TYPE.length);

        if (dietDelta !== 0) return dietDelta;

        return a.ward_name.localeCompare(b.ward_name);
    });
}

/**
 * Fetches the flat order list behind each scheduled slot and keeps only the
 * special ones. One request per slot, the same drill-down endpoint the pivot
 * cells use, so the section cannot drift from the modal.
 *
 * A slot that fails does not hide the others: what loaded is still shown, and
 * the failure is reported as a warning.
 */
async function loadSpecialOrders(
    slots: MealSlot[]
): Promise<{
    orders: KitchenScheduleOrderItem[];
    failedSlots: MealSlot[];
}> {
    const results = await Promise.all(
        slots.map(async (slot) => ({
            slot,
            orders: await getKitchenScheduleSlotOrdersApi(slot),
        }))
    );

    const failedSlots = results
        .filter((result) => result.orders === null)
        .map((result) => result.slot);

    const orders = results.flatMap((result) =>
        (result.orders ?? []).filter(isSpecialOrder)
    );

    return { orders: sortOrders(orders), failedSlots };
}

interface SpecialOrderCardProps {
    order: KitchenScheduleOrderItem;
    busy: boolean;
    onReady: () => void;
}

/** One special order: who it is for, the instruction, and the kitchen flags. */
function SpecialOrderCard({ order, busy, onReady }: SpecialOrderCardProps) {
    const instruction = (order.special_instruction ?? "").trim();

    const hasAllergyNotes =
        (order.allergies?.length ?? 0) > 0 ||
        (order.intolerances?.length ?? 0) > 0 ||
        !!order.religious_dietary_restrictions ||
        !!order.extra_notes;

    return (
        <article className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50/70 px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        <Sparkles size={11} />
                        {order.is_special ? "Special order" : "Special instruction"}
                    </span>

                    <span className="text-sm font-semibold text-slate-800">
                        {order.order_id}
                    </span>

                    <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        {order.meal_type}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {order.diet_type}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={onReady}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {busy ? (
                        <LoaderCircle size={13} className="animate-spin" />
                    ) : (
                        <CheckCheck size={13} />
                    )}
                    Ready
                </button>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-2">
                {/* Who the order is for */}
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Patient / Ward
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                        {order.patient_name || "Unnamed patient"}
                    </p>

                    <div className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
                        <p>
                            <span className="text-slate-400">UHID: </span>
                            {order.uhid || "—"}
                        </p>
                        <p>
                            <span className="text-slate-400">Bed: </span>
                            {order.bed_number || "—"}
                        </p>
                        <p className="sm:col-span-2">
                            <span className="text-slate-400">Ward: </span>
                            {order.ward_name || (
                                <span className="text-slate-300">Unassigned</span>
                            )}
                        </p>
                        {order.order_source && (
                            <p className="sm:col-span-2">
                                <span className="text-slate-400">Order source: </span>
                                {order.order_source}
                            </p>
                        )}
                    </div>
                </div>

                {/* The note the kitchen has to follow */}
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Special instruction
                    </p>

                    {instruction ? (
                        <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                            {instruction}
                        </p>
                    ) : (
                        <p className="mt-1 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                            No instruction recorded for this order.
                        </p>
                    )}

                    {hasAllergyNotes && (
                        <div className="mt-3 space-y-2">
                            {(order.allergies?.length ?? 0) > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        Allergies
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {order.allergies?.map((allergy, index) => (
                                            <span
                                                key={`${allergy.name}-${index}`}
                                                className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                                            >
                                                {allergy.name}
                                                {allergy.severity && (
                                                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold">
                                                        {allergy.severity}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(order.intolerances?.length ?? 0) > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        Intolerances
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {order.intolerances?.map((item, index) => (
                                            <span
                                                key={`${item}-${index}`}
                                                className="rounded-md bg-orange-50 px-2 py-0.5 text-xs text-orange-700"
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {order.religious_dietary_restrictions && (
                                <p className="text-xs text-slate-700">
                                    <span className="text-slate-400">
                                        Religious/Dietary:{" "}
                                    </span>
                                    {order.religious_dietary_restrictions}
                                </p>
                            )}

                            {order.extra_notes && (
                                <p className="text-xs text-slate-700">
                                    <span className="text-slate-400">
                                        Extra notes:{" "}
                                    </span>
                                    {order.extra_notes}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

/**
 * Special orders for today, held apart from the meal_slot × diet_type pivot.
 *
 * The pivot only carries ward counts, so the orders themselves come from the
 * per-slot drill-down endpoint: one GET per scheduled slot, filtered to the
 * orders flagged special or carrying a kitchen instruction. Each card shows
 * the instruction next to the patient and dietary details the cook needs, and
 * moving one to Ready uses the same bulk endpoint the drill-down modal uses.
 */
export function KitchenScheduleSpecialOrders({
    slots,
    loading = false,
    reloadKey = 0,
    onOrdersChanged,
}: {
    /** Meal slots that have orders today (the pivot's rows). */
    slots: MealSlot[];
    /** True while the pivot behind the slot list is still loading. */
    loading?: boolean;
    /** Bump to re-read the orders, e.g. after another view marked some ready. */
    reloadKey?: number;
    /** Called after an order moves to Ready, so the pivot can refresh. */
    onOrdersChanged?: () => void;
}) {
    /** Serialized so a new array with the same slots does not refetch. */
    const slotKey = slots.join(",");

    const [orders, setOrders] = useState<KitchenScheduleOrderItem[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [failedSlots, setFailedSlots] = useState<MealSlot[]>([]);

    const [retryKey, setRetryKey] = useState(0);

    const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        const slotList =
            slotKey === "" ? [] : (slotKey.split(",") as MealSlot[]);

        const load = async () => {
            if (slotList.length === 0) {
                if (!active) return;

                setOrders([]);
                setFailedSlots([]);
                setIsLoading(false);
                return;
            }

            const result = await loadSpecialOrders(slotList);

            if (!active) return;

            setOrders(result.orders);
            setFailedSlots(result.failedSlots);
            setIsLoading(false);
        };

        load();

        return () => {
            active = false;
        };
    }, [slotKey, reloadKey, retryKey]);

    const handleRetry = () => {
        setIsLoading(true);
        setRetryKey((current) => current + 1);
    };

    const handleReady = async (orderId: string) => {
        setBusyOrderId(orderId);
        setError("");

        try {
            const result = await updateKitchenScheduleOrdersReadyApi([orderId]);

            if (result.skipped_order_ids.includes(orderId)) {
                setError(
                    `${orderId} was not moved. Only orders still being prepared can go to Ready.`
                );
                return;
            }

            setOrders((previous) =>
                previous
                    ? previous.filter((order) => order.order_id !== orderId)
                    : previous
            );

            onOrdersChanged?.();
        } catch (readyError) {
            setError(
                readyError instanceof Error
                    ? readyError.message
                    : "Could not mark the order ready. Please try again."
            );
        } finally {
            setBusyOrderId(null);
        }
    };

    const count = orders?.length ?? 0;
    const busy = busyOrderId !== null;
    const isInitialLoad = loading || (isLoading && orders === null);

    return (
        <section className="mt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-600" />

                    <h2 className="text-base font-semibold text-slate-800">
                        Special Orders
                    </h2>

                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                        {isInitialLoad ? "…" : count}
                    </span>
                </div>

                <p className="text-xs text-slate-500">
                    Flagged orders and kitchen instructions, kept apart from the
                    regular count
                </p>
            </div>

            {error && (
                <p
                    role="alert"
                    className="mb-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-600"
                >
                    {error}
                </p>
            )}

            {failedSlots.length > 0 && (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                    <span className="inline-flex items-center gap-1.5">
                        <TriangleAlert size={14} />
                        Could not load the special orders for{" "}
                        {failedSlots.join(", ")}. The rest are shown.
                    </span>

                    <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                        <RefreshCw size={12} />
                        Retry
                    </button>
                </div>
            )}

            {isInitialLoad ? (
                <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-24 animate-pulse rounded-2xl bg-slate-100"
                        />
                    ))}
                </div>
            ) : count === 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Sparkles size={18} />
                    </span>

                    <div>
                        <p className="text-sm font-medium text-slate-600">
                            No special orders today
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                            Orders flagged as special, or carrying a kitchen
                            instruction, appear here.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders?.map((order) => (
                        <SpecialOrderCard
                            key={order.order_id}
                            order={order}
                            busy={busy}
                            onReady={() => handleReady(order.order_id)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
