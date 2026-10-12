"use client";

import type {
    AssessmentListItem,
    RouteOfFeeding,
    UpdateAssessmentBody,
    UpdateAssessmentResponse,
} from "@/data/Assessment/type";
import { AT_RISK_THRESHOLD, ROUTE_OF_FEEDING } from "@/data/Assessment/type";
import { Info, LoaderCircle, Save, X } from "lucide-react";
import { type FormEvent, useState } from "react";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 disabled:opacity-60";

const errorInputClass =
    "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100";

function Field({
    label,
    hint,
    error,
    children,
}: {
    label: string;
    hint?: string | null;
    error?: string | null;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                {label}
            </span>

            {children}

            {/* Errors replace hints rather than stacking, so a field never
                shows two competing messages. */}
            {error ? (
                <span className="mt-1 block text-[10px] font-medium text-red-600">
                    {error}
                </span>
            ) : hint ? (
                <span className="mt-1 block text-[10px] text-slate-400">
                    {hint}
                </span>
            ) : null}
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
function toDateInput(value: string) {
    return value ? value.slice(0, 10) : "";
}

/** null -> "" so a missing measurement reads as a blank box, not "null". */
function toNumberInput(value: number | null) {
    return value === null ? "" : String(value);
}

/** Returns an error message, or null when the entry is acceptable or blank. */
function validateNumber(
    raw: string,
    field: { min: number; max: number | null }
) {
    const trimmed = raw.trim();

    // A numeric field is only ever set, never cleared, so blank is always
    // valid — it means "leave the stored value unchanged".
    if (!trimmed) return null;

    const value = Number(trimmed);

    if (Number.isNaN(value)) return "Enter a number.";
    if (value < field.min) return `Must be ${field.min} or more.`;
    if (field.max !== null && value > field.max) {
        return `Must be ${field.max} or less.`;
    }

    return null;
}

/**
 * Partial update of one assessment's editable fields.
 *
 * The list response carries only a subset of the record, so this modal can
 * prefill and write back exactly those fields: date, BMI, NRS, caloric target,
 * route and notes. weight_kg, height_cm, daily_protein_target_g and
 * fluid_restriction_ml are not in the list, so the body omits them and the
 * server leaves them untouched. A blank numeric box is likewise omitted, since
 * the update body cannot clear a number.
 *
 * The patient is identity, not content, so it is shown read-only.
 */
export default function EditAssessmentModal({
    assessment,
    onSubmit,
    onClose,
}: {
    assessment: AssessmentListItem;
    /** Resolves with the updated record; rejects so the modal shows the reason. */
    onSubmit: (
        payload: UpdateAssessmentBody
    ) => Promise<UpdateAssessmentResponse>;
    onClose: () => void;
}) {
    const [assessmentDate, setAssessmentDate] = useState(
        toDateInput(assessment.assessment_date)
    );
    const [bmi, setBmi] = useState(toNumberInput(assessment.bmi));
    const [nrs, setNrs] = useState(
        toNumberInput(assessment.nutritional_risk_score)
    );
    const [calories, setCalories] = useState(
        toNumberInput(assessment.daily_caloric_target_kcal)
    );
    const [route, setRoute] = useState<RouteOfFeeding>(
        assessment.route_of_feeding
    );
    const [notes, setNotes] = useState(assessment.clinical_notes);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Derived during render so the messages can never disagree with the inputs.
    const bmiError = validateNumber(bmi, { min: 0, max: null });
    const nrsError = validateNumber(nrs, { min: 0, max: 10 });
    const caloriesError = validateNumber(calories, { min: 0, max: null });

    const hasFieldErrors = Boolean(bmiError || nrsError || caloriesError);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (saving || hasFieldErrors) return;

        const body: UpdateAssessmentBody = {};

        const date = assessmentDate.trim();
        if (date) body.assessment_date = `${date}T00:00:00.000Z`;

        const bmiValue = bmi.trim();
        if (bmiValue) body.bmi = Number(bmiValue);

        const nrsValue = nrs.trim();
        if (nrsValue) body.nutritional_risk_score = Number(nrsValue);

        const caloriesValue = calories.trim();
        if (caloriesValue) body.daily_caloric_target_kcal = Number(caloriesValue);

        if (route) body.route_of_feeding = route;

        // Sent even when empty: the contract treats "" as clearing the note, so
        // an erased box must reach the server rather than be omitted.
        body.clinical_notes = notes.trim();

        try {
            setSaving(true);
            setError("");

            await onSubmit(body);
            onClose();
        } catch (err) {
            console.error("Error updating assessment:", err);
            setError(
                err instanceof Error && err.message
                    ? err.message
                    : "Could not save the assessment. Please try again."
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
                            Edit Assessment
                        </h2>

                        <p className="mt-0.5 truncate text-xs text-slate-400">
                            {assessment.assessment_id}
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
                        record, but not editable (a record never moves patient). */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                        <p className="truncate text-sm font-semibold text-slate-800">
                            {assessment.patient_name || "Unknown patient"}
                        </p>
                        <p className="truncate text-[10px] text-slate-400">
                            {assessment.uhid || "—"}
                        </p>
                    </div>

                    <p className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-medium text-slate-500">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        Weight, height, protein and fluid targets are not in the
                        list response, so they are left unchanged. A blank number
                        keeps the stored value.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Assessment date"
                            hint="Stored as the calendar date you pick."
                        >
                            <input
                                type="date"
                                value={assessmentDate}
                                disabled={saving}
                                onChange={(event) =>
                                    setAssessmentDate(event.target.value)
                                }
                                className={inputClass}
                            />
                        </Field>

                        <Field
                            label="Route of feeding"
                            hint="How nutrition is delivered."
                        >
                            <Select
                                value={route}
                                disabled={saving}
                                onChange={(event) =>
                                    setRoute(
                                        event.target.value as RouteOfFeeding
                                    )
                                }
                            >
                                {ROUTE_OF_FEEDING.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field
                            label="BMI"
                            error={bmiError}
                            hint="Must be 0 or more."
                        >
                            <input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={bmi}
                                disabled={saving}
                                aria-invalid={Boolean(bmiError)}
                                onChange={(event) =>
                                    setBmi(event.target.value)
                                }
                                className={`${inputClass} ${
                                    bmiError ? errorInputClass : ""
                                }`}
                            />
                        </Field>

                        <Field
                            label="NRS-2002 score"
                            error={nrsError}
                            hint={`0 to 10. A score of ${AT_RISK_THRESHOLD} or above counts as at risk.`}
                        >
                            <input
                                type="number"
                                inputMode="numeric"
                                step="1"
                                min="0"
                                max="10"
                                value={nrs}
                                disabled={saving}
                                aria-invalid={Boolean(nrsError)}
                                onChange={(event) =>
                                    setNrs(event.target.value)
                                }
                                className={`${inputClass} ${
                                    nrsError ? errorInputClass : ""
                                }`}
                            />
                        </Field>

                        <Field
                            label="Caloric target (kcal/day)"
                            error={caloriesError}
                            hint="Must be 0 or more."
                        >
                            <input
                                type="number"
                                inputMode="numeric"
                                step="1"
                                min="0"
                                value={calories}
                                disabled={saving}
                                aria-invalid={Boolean(caloriesError)}
                                onChange={(event) =>
                                    setCalories(event.target.value)
                                }
                                className={`${inputClass} ${
                                    caloriesError ? errorInputClass : ""
                                }`}
                            />
                        </Field>

                        <Field
                            label="Clinical notes"
                            hint="Clearing the box removes the stored note."
                        >
                            <input
                                type="text"
                                value={notes}
                                disabled={saving}
                                onChange={(event) =>
                                    setNotes(event.target.value)
                                }
                                placeholder="Mild muscle wasting in forearms"
                                className={inputClass}
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
                            disabled={saving || hasFieldErrors}
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
