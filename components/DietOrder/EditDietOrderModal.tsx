"use client";

import type {
    DietOrderListItem,
    UpdateDietOrderBody,
    UpdateDietOrderResponse,
} from "@/data/DietOrder/type";
import { MEAL_TYPE } from "@/data/Menu/type";
import type { MealSlot } from "@/data/Menu/type";
import { LoaderCircle, Save, TriangleAlert, X } from "lucide-react";
import { type FormEvent, useState } from "react";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 disabled:opacity-60";

function Field({
    label,
    required = false,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                {label}
                {required && <span className="ml-0.5 text-red-500">*</span>}
            </span>

            {children}

            {hint && (
                <span className="mt-1 block text-[10px] text-slate-400">
                    {hint}
                </span>
            )}
        </label>
    );
}

/** "2026-10-02T00:00:00.000Z" -> "2026-10-02" for an <input type="date">. */
function toDateInput(value: string | null) {
    return value ? value.slice(0, 10) : "";
}

/**
 * Partial update of an order's editable fields.
 *
 * The patient and order id are identity, not content, so they are shown
 * read-only. The derived plan/items and the lifecycle/status fields are
 * deliberately absent: the server owns them, and it re-derives the plan and
 * items itself when the date or meal slot changes.
 *
 * Only fields the dietitian actually changed are sent, so a partial update
 * never rewrites a stored value the form never surfaced.
 */
export default function EditDietOrderModal({
    order,
    onSubmit,
    onClose,
}: {
    order: DietOrderListItem;
    /** Resolves with the updated order; rejects so the modal shows the reason. */
    onSubmit: (payload: UpdateDietOrderBody) => Promise<UpdateDietOrderResponse>;
    onClose: () => void;
}) {
    const [scheduledDate, setScheduledDate] = useState(
        toDateInput(order.scheduled_date)
    );
    const [mealType, setMealType] = useState<MealSlot>(order.meal_type);
    const [wardName, setWardName] = useState(order.ward_name);
    const [bedNumber, setBedNumber] = useState(order.bed_number);
    const [orderSource, setOrderSource] = useState(order.order_source);
    const [specialInstruction, setSpecialInstruction] = useState(
        order.special_instruction
    );
    const [isSpecial, setIsSpecial] = useState(order.is_special);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const isInvalid = scheduledDate.trim() === "";

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isInvalid || saving) return;

        const body: UpdateDietOrderBody = {};

        const date = scheduledDate.trim();
        if (date !== toDateInput(order.scheduled_date)) {
            body.scheduled_date = date;
        }

        if (mealType !== order.meal_type) body.meal_type = mealType;

        // Trimmed comparison, and a cleared field sends "" so the server stores
        // it as unset rather than leaving the old text in place.
        const ward = wardName.trim();
        if (ward !== order.ward_name) body.ward_name = ward;

        const bed = bedNumber.trim();
        if (bed !== order.bed_number) body.bed_number = bed;

        const source = orderSource.trim();
        if (source !== order.order_source) body.order_source = source;

        const instruction = specialInstruction.trim();
        if (instruction !== order.special_instruction) {
            body.special_instruction = instruction;
        }

        if (isSpecial !== order.is_special) body.is_special = isSpecial;

        if (Object.keys(body).length === 0) {
            onClose();
            return;
        }

        try {
            setSaving(true);
            setError("");

            await onSubmit(body);
            onClose();
        } catch (err) {
            console.error("Error updating diet order:", err);
            setError(
                err instanceof Error && err.message
                    ? err.message
                    : "Could not save the diet order. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={() => !saving && onClose()}
        >
            <div
                className="my-8 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-slate-800">
                            Edit Diet Order
                        </h2>

                        <p className="mt-0.5 truncate text-xs text-slate-400">
                            {order.order_id}
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="max-h-[70vh] space-y-4 overflow-y-auto p-5"
                >
                    {/* Identity — shown so the dietitian can confirm the right
                        order, but not editable (an order never moves patient). */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                        <p className="truncate text-sm font-semibold text-slate-800">
                            {order.patient_name || "Unknown patient"}
                        </p>
                        <p className="truncate text-[10px] text-slate-400">
                            {order.uhid || "—"}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Scheduled date" required>
                            <input
                                required
                                type="date"
                                value={scheduledDate}
                                disabled={saving}
                                onChange={(event) =>
                                    setScheduledDate(event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>

                        <Field
                            label="Meal type"
                            required
                            hint="Changing this re-derives the plan and items."
                        >
                            <select
                                required
                                value={mealType}
                                disabled={saving}
                                onChange={(event) =>
                                    setMealType(event.target.value as MealSlot)
                                }
                                className={`${inputClass} appearance-none`}
                            >
                                {MEAL_TYPE.map((slot) => (
                                    <option key={slot} value={slot}>
                                        {slot}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field
                            label="Ward name"
                            hint="Leave blank to clear it."
                        >
                            <input
                                value={wardName}
                                disabled={saving}
                                onChange={(event) =>
                                    setWardName(event.target.value)
                                }
                                placeholder="Cardiology Ward"
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Bed number" hint="Leave blank to clear it.">
                            <input
                                value={bedNumber}
                                disabled={saving}
                                onChange={(event) =>
                                    setBedNumber(event.target.value)
                                }
                                placeholder="e.g. 12-B"
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Order source" hint="Leave blank to clear it.">
                            <input
                                value={orderSource}
                                disabled={saving}
                                onChange={(event) =>
                                    setOrderSource(event.target.value)
                                }
                                placeholder="Dietitian"
                                className={inputClass}
                            />
                        </Field>

                        <Field
                            label="Special instruction"
                            hint="Leave blank to clear it."
                        >
                            <input
                                value={specialInstruction}
                                disabled={saving}
                                onChange={(event) =>
                                    setSpecialInstruction(event.target.value)
                                }
                                placeholder="Thickened liquid"
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    {/* Priority flag spans the row: a standalone statement, not a
                        field paired with another. */}
                    <div>
                        <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                            Priority handling
                        </span>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => setIsSpecial((current) => !current)}
                            aria-pressed={isSpecial}
                            className={`flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                                isSpecial
                                    ? "border-amber-500 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                            }`}
                        >
                            <TriangleAlert size={16} />
                            {isSpecial ? "Special order" : "Standard order"}
                        </button>

                        <span className="mt-1 block text-[10px] text-slate-400">
                            Flags the order for priority kitchen handling.
                        </span>
                    </div>

                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onClose}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isInvalid || saving}
                            className="flex items-center gap-1.5 rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                    Saving
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Save changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
