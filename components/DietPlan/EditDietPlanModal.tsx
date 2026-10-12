"use client";

import type {
    ConsistencyLiquid,
    DietPlanListItem,
    TextureModification,
    UpdateDietPlanBody,
    UpdateDietPlanResponse,
} from "@/data/DietPlan/type";
import {
    CONSISTENCY_LIQUID,
    TEXTURE_MODIFICATION,
} from "@/data/DietPlan/type";
import { DIET_TYPE } from "@/data/Menu/type";
import type { DietType } from "@/data/Menu/type";
import { LoaderCircle, Save, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
    CONSISTENCY_LABEL,
    DIET_TYPE_LABEL,
    TEXTURE_LABEL,
} from "./dietPlanLabels";

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

function Select({
    children,
    ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select {...props} className={`${inputClass} appearance-none`}>
            {children}
        </select>
    );
}

/** "2026-10-02T00:00:00.000Z" -> "2026-10-02" for an <input type="date">. */
function toDateInput(value: string | null) {
    return value ? value.slice(0, 10) : "";
}

/**
 * Partial update of a plan's prescribed fields.
 *
 * The patient is identity, not content, so it is shown read-only. Withheld
 * items are deliberately absent: the list response does not carry
 * `disallowed_items_id` and a PUT replaces that list wholesale, so sending an
 * empty one would silently clear it. Omitting the field leaves it unchanged.
 */
export default function EditDietPlanModal({
    plan,
    onSubmit,
    onClose,
}: {
    plan: DietPlanListItem;
    /** Resolves with the updated plan; rejects so the modal shows the reason. */
    onSubmit: (payload: UpdateDietPlanBody) => Promise<UpdateDietPlanResponse>;
    onClose: () => void;
}) {
    const [dietType, setDietType] = useState<DietType>(plan.diet_type);
    const [texture, setTexture] = useState<TextureModification>(
        plan.texture_modification
    );
    const [consistency, setConsistency] = useState<ConsistencyLiquid>(
        plan.consistencies_liquids
    );
    const [startDate, setStartDate] = useState(toDateInput(plan.start_date));
    const [endDate, setEndDate] = useState(toDateInput(plan.end_date));

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // ISO date strings sort lexicographically, so this is a real comparison.
    const hasRangeError =
        startDate.trim() !== "" &&
        endDate.trim() !== "" &&
        endDate.trim() < startDate.trim();

    const isInvalid = startDate.trim() === "" || hasRangeError;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isInvalid || saving) return;

        const body: UpdateDietPlanBody = {
            diet_type: dietType,
            texture_modification: texture,
            consistencies_liquids: consistency,
            start_date: startDate.trim(),
            // null makes the plan open-ended; matches the update contract.
            end_date: endDate.trim() || null,
        };

        try {
            setSaving(true);
            setError("");

            await onSubmit(body);
            onClose();
        } catch (err) {
            console.error("Error updating diet plan:", err);
            setError(
                err instanceof Error && err.message
                    ? err.message
                    : "Could not save the diet plan. Please try again."
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
                            Edit Diet Plan
                        </h2>

                        <p className="mt-0.5 truncate text-xs text-slate-400">
                            {plan.diet_plan_id}
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
                        plan, but not editable (a plan never moves patient). */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                        <p className="truncate text-sm font-semibold text-slate-800">
                            {plan.patient_name || "Unknown patient"}
                        </p>
                        <p className="truncate text-[10px] text-slate-400">
                            {plan.uhid || "—"}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Diet type" required>
                            <Select
                                required
                                value={dietType}
                                disabled={saving}
                                onChange={(event) =>
                                    setDietType(
                                        event.target.value as DietType
                                    )
                                }
                            >
                                {DIET_TYPE.map((type) => (
                                    <option key={type} value={type}>
                                        {DIET_TYPE_LABEL[type]}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field
                            label="Texture modification"
                            hint="Consistency prescribed for solid food."
                        >
                            <Select
                                value={texture}
                                disabled={saving}
                                onChange={(event) =>
                                    setTexture(
                                        event.target
                                            .value as TextureModification
                                    )
                                }
                            >
                                {TEXTURE_MODIFICATION.map((value) => (
                                    <option key={value} value={value}>
                                        {TEXTURE_LABEL[value]}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field
                            label="Liquid consistency"
                            hint="Consistency prescribed for all liquids."
                        >
                            <Select
                                value={consistency}
                                disabled={saving}
                                onChange={(event) =>
                                    setConsistency(
                                        event.target.value as ConsistencyLiquid
                                    )
                                }
                            >
                                {CONSISTENCY_LIQUID.map((value) => (
                                    <option key={value} value={value}>
                                        {CONSISTENCY_LABEL[value]}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label="Start date" required>
                            <input
                                required
                                type="date"
                                value={startDate}
                                disabled={saving}
                                onChange={(event) =>
                                    setStartDate(event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>

                        <Field
                            label="End date"
                            hint={
                                hasRangeError
                                    ? "End date cannot be before the start date."
                                    : "Leave blank for an open-ended plan."
                            }
                        >
                            <input
                                type="date"
                                value={endDate}
                                disabled={saving}
                                min={startDate.trim() || undefined}
                                aria-invalid={hasRangeError}
                                onChange={(event) =>
                                    setEndDate(event.target.value)
                                }
                                className={`${inputClass} ${
                                    hasRangeError
                                        ? "border-red-300 bg-red-50/50"
                                        : ""
                                }`}
                            />
                        </Field>
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
