"use client";

import {
    getCanteenSettingsApi,
    upsertCanteenSettingsApi,
} from "@/data/Settings/api";
import {
    OPERATING_DAYS,
    type OperatingDay,
    type ServiceTiming,
    type UpsertCanteenSettingsBody,
} from "@/data/Settings/type";
import { MEAL_TYPE } from "@/data/Menu/type";
import {
    Clock,
    LoaderCircle,
    Plus,
    Save,
    Trash2,
    TriangleAlert,
    UtensilsCrossed,
} from "lucide-react";
import { useEffect, useState } from "react";

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const labelClass =
    "mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500";

/** The empty form a first-time save starts from. */
function emptyDraft(): UpsertCanteenSettingsBody {
    return {
        service_timings: [{ meal_type: "Breakfast", start_time: "" }],
        operating_days: ["All days"],
        delivery_method: "",
    };
}

/**
 * Settings → Canteen settings.
 *
 * Edits the /api/settings singleton: when each meal starts, which days the
 * canteen operates, and how meals reach diners. The API is a singleton with a
 * full-replace PUT, so the screen keeps the whole document as one draft and
 * sends it back unchanged apart from the fields the admin edited.
 *
 * A 404 is not an error here — it means nothing has been saved yet, so the
 * form simply starts empty.
 */
export default function CanteenSettingsPanel({
    readOnly = false,
}: {
    /** True for a role that may read the settings but not change them. */
    readOnly?: boolean;
}) {
    const [draft, setDraft] = useState<UpsertCanteenSettingsBody>(emptyDraft);
    const [saved, setSaved] = useState<UpsertCanteenSettingsBody | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedOnce, setLoadedOnce] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {
        const load = async () => {
            const result = await getCanteenSettingsApi();

            setLoading(false);
            setLoadedOnce(true);

            // 404 → nothing stored yet; keep the empty form and let the admin
            // make the first save.
            if (!result.ok && result.status === 404) return;

            if (!result.ok) {
                setError(result.error);
                return;
            }

            setDraft(result.data);
            setSaved(result.data);
        };

        load();
    }, []);

    const dirty =
        saved === null || JSON.stringify(saved) !== JSON.stringify(draft);

    function updateTiming(index: number, patch: Partial<ServiceTiming>) {
        setDraft((previous) => ({
            ...previous,
            service_timings: previous.service_timings.map((timing, i) =>
                i === index ? { ...timing, ...patch } : timing
            ),
        }));
        setJustSaved(false);
    }

    function addTiming() {
        setDraft((previous) => ({
            ...previous,
            service_timings: [
                ...previous.service_timings,
                { meal_type: "Lunch", start_time: "" },
            ],
        }));
        setJustSaved(false);
    }

    function removeTiming(index: number) {
        setDraft((previous) => ({
            ...previous,
            service_timings:
                previous.service_timings.length > 1
                    ? previous.service_timings.filter((_, i) => i !== index)
                    : previous.service_timings,
        }));
        setJustSaved(false);
    }

    function toggleDay(day: OperatingDay, checked: boolean) {
        setDraft((previous) => {
            // "All days" is a summary value, not an extra day: picking a
            // weekday replaces it, and picking it replaces the weekdays.
            if (day === "All days") {
                return {
                    ...previous,
                    operating_days: checked ? ["All days"] : [],
                };
            }

            const withoutAll = previous.operating_days.filter(
                (value) => value !== "All days"
            );

            return {
                ...previous,
                operating_days: checked
                    ? [...withoutAll, day]
                    : withoutAll.filter((value) => value !== day),
            };
        });
        setJustSaved(false);
    }

    async function handleSave() {
        setError(null);

        const timings = draft.service_timings.map((timing) => ({
            ...timing,
            start_time: timing.start_time.trim(),
        }));

        if (timings.length === 0) {
            setError("Add at least one meal service window.");
            return;
        }

        if (timings.some((timing) => timing.start_time === "")) {
            setError("Every meal window needs a start time, e.g. 07:00.");
            return;
        }

        const duplicateMeal = timings.find(
            (timing, index) =>
                timings.findIndex(
                    (other) => other.meal_type === timing.meal_type
                ) !== index
        );

        if (duplicateMeal) {
            setError(
                `${duplicateMeal.meal_type} appears more than once — keep one window per meal.`
            );
            return;
        }

        if (draft.operating_days.length === 0) {
            setError("Pick at least one operating day.");
            return;
        }

        if (draft.delivery_method.trim() === "") {
            setError("Describe how meals reach diners.");
            return;
        }

        const body: UpsertCanteenSettingsBody = {
            service_timings: timings,
            operating_days: draft.operating_days,
            delivery_method: draft.delivery_method.trim(),
        };

        setSaving(true);
        const result = await upsertCanteenSettingsApi(body);
        setSaving(false);

        if (!result.ok) {
            setError(result.error);
            return;
        }

        // Adopt what the backend stored rather than assuming the draft became
        // the truth — the server may normalise the free-text fields.
        setDraft(result.data);
        setSaved(result.data);
        setJustSaved(true);
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                        <UtensilsCrossed size={17} />
                    </div>

                    <div>
                        <h2 className="text-base font-semibold text-slate-800">
                            Canteen settings
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-500">
                            Meal service windows, operating days, and how meals
                            reach diners.
                        </p>
                    </div>
                </div>

                <span
                    role="status"
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                        loading
                            ? "bg-sky-50 text-sky-700"
                            : error
                              ? "bg-red-50 text-red-600"
                              : saved === null
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                    }`}
                >
                    {loading ? (
                        <>
                            <LoaderCircle size={12} className="animate-spin" />
                            LOADING
                        </>
                    ) : error ? (
                        <>
                            <TriangleAlert size={12} />
                            ERROR
                        </>
                    ) : saved === null ? (
                        <>
                            <Clock size={12} />
                            NOT CONFIGURED
                        </>
                    ) : (
                        <>
                            <Clock size={12} />
                            CONFIGURED
                        </>
                    )}
                </span>
            </div>

            <div className="space-y-5 px-4 py-4">
                {error && (
                    <p
                        role="alert"
                        className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
                    >
                        {error}
                    </p>
                )}

                {readOnly && (
                    <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        You can read these settings, but changing them is an
                        Admin&apos;s job.
                    </p>
                )}

                {/* Service timings */}
                <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className={labelClass}>Meal service windows</span>

                        <button
                            type="button"
                            onClick={addTiming}
                            disabled={readOnly || loading || saving}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus size={13} />
                            Add window
                        </button>
                    </div>

                    <div className="space-y-2">
                        {draft.service_timings.map((timing, index) => (
                            <div
                                key={index}
                                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem]"
                            >
                                <select
                                    aria-label="Meal type"
                                    value={timing.meal_type}
                                    disabled={readOnly || loading || saving}
                                    onChange={(event) =>
                                        updateTiming(index, {
                                            meal_type: event.target
                                                .value as ServiceTiming["meal_type"],
                                        })
                                    }
                                    className={inputClass}
                                >
                                    {MEAL_TYPE.map((meal) => (
                                        <option key={meal} value={meal}>
                                            {meal}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    aria-label="Start time"
                                    placeholder="e.g. 07:00"
                                    value={timing.start_time}
                                    disabled={readOnly || loading || saving}
                                    onChange={(event) =>
                                        updateTiming(index, {
                                            start_time: event.target.value,
                                        })
                                    }
                                    className={inputClass}
                                />

                                <button
                                    type="button"
                                    onClick={() => removeTiming(index)}
                                    disabled={
                                        readOnly ||
                                        loading ||
                                        saving ||
                                        draft.service_timings.length === 1
                                    }
                                    aria-label="Remove this window"
                                    className="flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <p className="mt-1 text-[10px] text-slate-400">
                        Free text — the API stores the time exactly as entered.
                    </p>
                </div>

                {/* Operating days */}
                <div>
                    <span className={labelClass}>Operating days</span>

                    <div className="flex flex-wrap gap-2">
                        {OPERATING_DAYS.map((day) => {
                            const checked =
                                draft.operating_days.includes(day);

                            return (
                                <label
                                    key={day}
                                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                                        checked
                                            ? "border-amber-200 bg-amber-50 text-amber-800"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    } ${
                                        readOnly || loading || saving
                                            ? "cursor-not-allowed opacity-60"
                                            : ""
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={readOnly || loading || saving}
                                        onChange={(event) =>
                                            toggleDay(
                                                day,
                                                event.target.checked
                                            )
                                        }
                                        className="accent-amber-600"
                                    />
                                    {day}
                                </label>
                            );
                        })}
                    </div>

                    <p className="mt-1 text-[10px] text-slate-400">
                        &quot;All days&quot; covers the whole week; picking a
                        weekday replaces it.
                    </p>
                </div>

                {/* Delivery method */}
                <div>
                    <label htmlFor="delivery-method" className={labelClass}>
                        Delivery method
                    </label>

                    <textarea
                        id="delivery-method"
                        rows={3}
                        value={draft.delivery_method}
                        disabled={readOnly || loading || saving}
                        onChange={(event) => {
                            setDraft((previous) => ({
                                ...previous,
                                delivery_method: event.target.value,
                            }));
                            setJustSaved(false);
                        }}
                        placeholder="e.g. Meals are plated in the kitchen and delivered to the ward by the diet cart."
                        className={inputClass}
                    />

                    <p className="mt-1 text-[10px] text-slate-400">
                        Free text — describe how meals reach diners.
                    </p>
                </div>
            </div>

            {!readOnly && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-[11px] text-slate-500">
                        {justSaved
                            ? "Saved — the canteen settings are live."
                            : loadedOnce && saved === null
                              ? "Not configured yet — saving creates the settings."
                              : dirty
                                ? "Unsaved changes"
                                : "No unsaved changes"}
                    </p>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading || saving || !dirty}
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? (
                            <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        {saving
                            ? "Saving…"
                            : saved === null
                              ? "Save settings"
                              : "Save changes"}
                    </button>
                </div>
            )}
        </section>
    );
}
