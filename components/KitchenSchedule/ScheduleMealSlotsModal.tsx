"use client";

import { createKitchenScheduleApi } from "@/data/KitchenSchedule/api";
import type { CreateKitchenScheduleBody } from "@/data/KitchenSchedule/type";
import type { MealSlot } from "@/data/Menu/type";
import { CalendarClock, Check, LoaderCircle, X } from "lucide-react";
import { useState, type FormEvent } from "react";

/**
 * Meal slots a schedule row can be published for, in wire order. "General" is
 * left out: it is the general/staff menu slot, not something the kitchen
 * schedules for wards.
 */
const SCHEDULABLE_SLOTS: MealSlot[] = [
    "Breakfast",
    "Lunch",
    "Snack",
    "Dinner",
];

/**
 * Starting time per slot, used until the scheduler edits it. The schema has one
 * schedule_at Date per row, so each slot carries its own moment — these are just
 * sensible defaults, not a backend contract.
 */
const DEFAULT_SLOT_TIMES: Record<MealSlot, string> = {
    Breakfast: "07:30",
    Lunch: "12:30",
    Snack: "16:30",
    Dinner: "19:30",
    General: "",
};

/** Today as yyyy-mm-dd, the value a date input expects. */
function todayIso(): string {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        "0"
    )}-${String(today.getDate()).padStart(2, "0")}`;
}

/**
 * Combines a date and a time into the ISO moment the API expects, read as local
 * time. Returns null when the pair does not form a real date, so a bad value is
 * caught before it reaches the server as a 400.
 */
function toIsoMoment(date: string, time: string): string | null {
    const parsed = new Date(`${date}T${time}`);

    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * How long one slot's POST may stay unanswered before the modal stops waiting.
 * A dropped response is the one failure the network layer cannot distinguish
 * from a slow server — the row is written, the reply never arrives — so the
 * deadline reports it as unknown rather than leaving "Scheduling…" forever.
 */
const SLOT_REQUEST_TIMEOUT_MS = 15_000;

/** The slot POST did not answer before the deadline; it may still be saved. */
class SlotTimeoutError extends Error {
    constructor() {
        super(
            "No response after 15 seconds. The slot may already be saved; resubmitting the same day and slot will not create a duplicate."
        );
        this.name = "SlotTimeoutError";
    }
}

/**
 * Posts one slot and settles within SLOT_REQUEST_TIMEOUT_MS.
 *
 * The deadline wraps the whole call, not just the inner fetch, so a stalled
 * token refresh in the auth interceptor cannot hold the modal open either. The
 * abort is what frees the browser's connection when the reply is lost.
 */
async function createSlotWithinDeadline(body: CreateKitchenScheduleBody) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(new SlotTimeoutError());
        }, SLOT_REQUEST_TIMEOUT_MS);
    });

    try {
        return await Promise.race([
            createKitchenScheduleApi(body, controller.signal),
            deadline,
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/** One slot's round-trip result, so a partial failure stays visible. */
type SlotOutcome = {
    slot: MealSlot;
    ok: boolean;
    error?: string;
    /** False when the backend updated an existing row instead of creating one. */
    isNew?: boolean;
};

/**
 * Publishes a kitchen schedule for a day: POST /api/kitchenschedule once per
 * selected meal slot, since the contract takes a single meal_slot per row.
 *
 * The client sends `schedule_at` (one moment per row, built from this date and
 * the slot's time) and `meal_slot` — schedule_id, shift and the assignment
 * fields are server-set. Each slot's request is tracked on its own, so one slot
 * failing to publish never hides the ones that went through.
 */
export default function ScheduleMealSlotsModal({
    onClose,
}: {
    onClose: () => void;
}) {
    const [scheduleDate, setScheduleDate] = useState(todayIso);

    // Everything schedulable is pre-selected: the common case is a full day.
    const [selectedSlots, setSelectedSlots] =
        useState<MealSlot[]>(SCHEDULABLE_SLOTS);

    const [slotTimes, setSlotTimes] = useState<Record<MealSlot, string>>(() => ({
        ...DEFAULT_SLOT_TIMES,
    }));

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingSlots, setPendingSlots] = useState<MealSlot[]>([]);
    const [error, setError] = useState("");
    const [outcomes, setOutcomes] = useState<SlotOutcome[] | null>(null);

    const allSucceeded = outcomes?.every((outcome) => outcome.ok) ?? false;

    const toggleSlot = (slot: MealSlot) => {
        setSelectedSlots((previous) =>
            previous.includes(slot)
                ? previous.filter((entry) => entry !== slot)
                : [...previous, slot]
        );

        setError("");
    };

    const updateTime = (slot: MealSlot, value: string) => {
        setSlotTimes((previous) => ({ ...previous, [slot]: value }));
        setError("");
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setOutcomes(null);

        if (!scheduleDate) {
            setError("Pick the day to schedule.");
            return;
        }

        if (selectedSlots.length === 0) {
            setError("Select at least one meal slot to schedule.");
            return;
        }

        // Resolve each selected slot to the ISO moment the row stores. A slot
        // with no time, or an unparseable date, is named before any request is
        // sent rather than surfacing as an opaque 400.
        const targets: Array<{ slot: MealSlot; scheduleAt: string }> = [];

        for (const slot of selectedSlots) {
            const time = slotTimes[slot];

            if (!time) {
                setError(`Pick a time for ${slot}.`);
                return;
            }

            const scheduleAt = toIsoMoment(scheduleDate, time);

            if (scheduleAt === null) {
                setError(`The ${slot} time does not form a valid moment.`);
                return;
            }

            targets.push({ slot, scheduleAt });
        }

        setIsSubmitting(true);
        setPendingSlots(targets.map(({ slot }) => slot));

        // One request per slot, captured individually — a slot that fails is
        // reported rather than aborting the rest of the day. Each request is
        // bounded, so one lost reply cannot keep the whole day's submit
        // pending and leave the button spinning.
        try {
            const results = await Promise.all(
                targets.map(async ({ slot, scheduleAt }): Promise<SlotOutcome> => {
                    try {
                        const saved = await createSlotWithinDeadline({
                            schedule_date: scheduleDate,
                            schedule_at: scheduleAt,
                            meal_slot: slot,
                        });

                        return { slot, ok: true, isNew: saved.is_new };
                    } catch (scheduleError) {
                        return {
                            slot,
                            ok: false,
                            error:
                                scheduleError instanceof Error
                                    ? scheduleError.message
                                    : "Could not schedule this slot.",
                        };
                    } finally {
                        setPendingSlots((previous) =>
                            previous.filter((entry) => entry !== slot)
                        );
                    }
                })
            );

            setOutcomes(results);
        } catch (submitError) {
            // Every slot handles its own failure; this is the safety net for
            // anything outside that per-slot contract, so the button still
            // re-enables instead of staying on "Scheduling…".
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Could not schedule the selected slots."
            );
        } finally {
            setIsSubmitting(false);
            setPendingSlots([]);
        }
    };

    /** Returns the form to its opening state after a fully successful run. */
    const reset = () => {
        setScheduleDate(todayIso());
        setSelectedSlots(SCHEDULABLE_SLOTS);
        setSlotTimes({ ...DEFAULT_SLOT_TIMES });
        setPendingSlots([]);
        setOutcomes(null);
        setError("");
    };

    const failedCount = outcomes?.filter((outcome) => !outcome.ok).length ?? 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isSubmitting) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="schedule-slots-title"
                className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-blue-50/60 px-5 py-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Kitchen Schedule
                        </p>

                        <h2
                            id="schedule-slots-title"
                            className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-800"
                        >
                            <CalendarClock
                                size={18}
                                className="text-amber-600"
                            />
                            Schedule Meal Slots
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Publish a kitchen schedule for a day — one row per
                            selected meal slot.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        disabled={isSubmitting}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {allSucceeded && outcomes ? (
                    <>
                        {/* Success body */}
                        <div className="px-5 py-6">
                            <div className="flex flex-col items-center gap-2 text-center">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                    <Check size={24} />
                                </span>

                                <p className="text-sm font-semibold text-slate-700">
                                    Meal slots scheduled
                                </p>

                                <p className="text-xs text-slate-500">
                                    {outcomes.length} slot
                                    {outcomes.length === 1 ? "" : "s"} published
                                    for {scheduleDate}.
                                </p>
                            </div>

                            <ul className="mt-4 space-y-1.5">
                                {outcomes.map((outcome) => (
                                    <li
                                        key={outcome.slot}
                                        className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2"
                                    >
                                        <span className="text-xs font-semibold text-emerald-800">
                                            {outcome.slot}
                                        </span>

                                        <span className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                                            {slotTimes[outcome.slot]}

                                            {outcome.isNew === false && (
                                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                                                    updated
                                                </span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                            <button
                                type="button"
                                onClick={reset}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                                Schedule another day
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
                            >
                                Done
                            </button>
                        </div>
                    </>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                            {/* Schedule date */}
                            <div>
                                <label
                                    htmlFor="schedule-date"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Schedule date
                                </label>

                                <input
                                    id="schedule-date"
                                    type="date"
                                    value={scheduleDate}
                                    disabled={isSubmitting}
                                    onChange={(event) => {
                                        setScheduleDate(event.target.value);
                                        setError("");
                                    }}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />

                                <p className="mt-1 text-[10px] text-slate-400">
                                    Each row is keyed by this day and the meal
                                    slot. Scheduling the same pair again
                                    updates its time instead of adding a
                                    duplicate.
                                </p>
                            </div>

                            {/* Meal slots and their times */}
                            <div>
                                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Meal slots &amp; time
                                </span>

                                <div className="space-y-2">
                                    {SCHEDULABLE_SLOTS.map((slot) => {
                                        const checked =
                                            selectedSlots.includes(slot);

                                        const outcome = outcomes?.find(
                                            (entry) => entry.slot === slot
                                        );

                                        return (
                                            <div
                                                key={slot}
                                                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition ${
                                                    checked
                                                        ? "border-amber-300 bg-amber-50"
                                                        : "border-slate-200 bg-white"
                                                }`}
                                            >
                                                <label className="flex flex-1 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={isSubmitting}
                                                        onChange={() =>
                                                            toggleSlot(slot)
                                                        }
                                                        className="h-3.5 w-3.5 accent-amber-600"
                                                    />

                                                    {slot}

                                                    {outcome ? (
                                                        outcome.ok ? (
                                                            <Check
                                                                size={14}
                                                                className="text-emerald-600"
                                                            />
                                                        ) : (
                                                            <X
                                                                size={14}
                                                                className="text-red-500"
                                                            />
                                                        )
                                                    ) : pendingSlots.includes(
                                                          slot
                                                      ) ? (
                                                        <LoaderCircle
                                                            size={14}
                                                            className="animate-spin text-amber-600"
                                                        />
                                                    ) : null}
                                                </label>

                                                <input
                                                    type="time"
                                                    aria-label={`${slot} time`}
                                                    value={slotTimes[slot]}
                                                    disabled={!checked || isSubmitting}
                                                    onChange={(event) =>
                                                        updateTime(
                                                            slot,
                                                            event.target.value
                                                        )
                                                    }
                                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Per-slot failures from the last attempt */}
                            {failedCount > 0 && (
                                <div className="space-y-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                                    {outcomes
                                        ?.filter((outcome) => !outcome.ok)
                                        .map((outcome) => (
                                            <p
                                                key={outcome.slot}
                                                className="text-[11px] font-medium text-red-600"
                                            >
                                                <span className="font-bold">
                                                    {outcome.slot}:
                                                </span>{" "}
                                                {outcome.error}
                                            </p>
                                        ))}
                                </div>
                            )}

                            {error && (
                                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                                    {error}
                                </p>
                            )}

                            {isSubmitting && (
                                <p className="text-[10px] text-slate-400">
                                    Waiting for the kitchen API. A slot that
                                    does not answer within 15 seconds is
                                    reported as unknown; resubmitting targets
                                    the same day and slot.
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting && (
                                    <LoaderCircle
                                        size={14}
                                        className="animate-spin"
                                    />
                                )}

                                {isSubmitting
                                    ? "Scheduling…"
                                    : `Schedule ${selectedSlots.length} slot${
                                          selectedSlots.length === 1 ? "" : "s"
                                      }`}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
