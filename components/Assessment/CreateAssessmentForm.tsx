"use client";

import PatientSearchField from "@/components/DietOrder/PatientSearchField";
import { createAssessmentApi } from "@/data/Assessment/api";
import type {
    CreateAssessmentBody,
    CreateAssessmentResponse,
    RouteOfFeeding,
} from "@/data/Assessment/type";
import { AT_RISK_THRESHOLD, ROUTE_OF_FEEDING } from "@/data/Assessment/type";
import type { Patient } from "@/data/DietOrder/type";
import {
    CheckCircle2,
    ClipboardList,
    LoaderCircle,
    Plus,
    TriangleAlert,
} from "lucide-react";
import { type FormEvent, useState } from "react";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 disabled:opacity-60";

const errorInputClass =
    "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100";

/**
 * The seven numeric clinical fields, described once so validation, hints and
 * layout cannot drift apart. `min`/`max` mirror the documented ranges; a blank
 * entry is always valid because every field is optional server-side.
 *
 * BMI is absent because it is derived from weight and height rather than
 * typed — see computeBmi.
 */
const NUMERIC_FIELDS = [
    {
        key: "weight_kg",
        label: "Weight (kg)",
        step: "0.1",
        min: 0,
        max: null,
        hint: null,
    },
    {
        key: "height_cm",
        label: "Height (cm)",
        step: "0.1",
        min: 0,
        max: null,
        hint: null,
    },
    {
        key: "nutritional_risk_score",
        label: "NRS-2002 score",
        step: "1",
        min: 0,
        max: 10,
        hint: `0 to 10. A score of ${AT_RISK_THRESHOLD} or above counts as at risk.`,
    },
    {
        key: "daily_caloric_target_kcal",
        label: "Caloric target (kcal/day)",
        step: "1",
        min: 0,
        max: null,
        hint: null,
    },
    {
        key: "daily_protein_target_g",
        label: "Protein target (g/day)",
        step: "1",
        min: 0,
        max: null,
        hint: null,
    },
    {
        key: "fluid_restriction_ml",
        label: "Fluid restriction (ml/day)",
        step: "1",
        min: 0,
        max: null,
        hint: null,
    },
] as const;

type NumericField = (typeof NUMERIC_FIELDS)[number];
type NumericKey = NumericField["key"];

const EMPTY_NUMERIC: Record<NumericKey, string> = Object.fromEntries(
    NUMERIC_FIELDS.map((field) => [field.key, ""])
) as Record<NumericKey, string>;

/** Returns an error message, or null when the entry is acceptable or blank. */
function validateNumeric(raw: string, field: NumericField) {
    const trimmed = raw.trim();

    // Optional server-side, so an empty field is never an error.
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
 * BMI = weight_kg / (height_cm / 100)^2, rounded to 2 decimal places.
 *
 * Returns null when there is nothing usable to compute from: either input
 * blank, either unparseable, or a height of 0 — the API permits height_cm
 * >= 0, but BMI is undefined at zero height and must not divide by it.
 *
 * Recomputed on every keystroke rather than on blur, so the figure tracks the
 * measurement while it is being typed instead of appearing only at the end.
 */
function computeBmi(weightKg: string, heightCm: string): number | null {
    const weightRaw = weightKg.trim();
    const heightRaw = heightCm.trim();

    if (!weightRaw || !heightRaw) return null;

    const weight = Number(weightRaw);
    const height = Number(heightRaw);

    if (Number.isNaN(weight) || Number.isNaN(height)) return null;
    if (weight < 0 || height <= 0) return null;

    const metres = height / 100;

    return Math.round((weight / (metres * metres)) * 100) / 100;
}

function Field({
    label,
    hint,
    error,
    children,
}: {
    label: string;
    hint?: string | null;
    error?: string;
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

export default function CreateAssessmentForm({
    onSubmit,
}: {
    /** Resolves with the created record so the caller can refresh the cards. */
    onSubmit?: (body: CreateAssessmentBody) => Promise<CreateAssessmentResponse>;
}) {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [assessmentDate, setAssessmentDate] = useState("");
    const [numeric, setNumeric] = useState<Record<NumericKey, string>>(
        EMPTY_NUMERIC
    );
    const [route, setRoute] = useState<RouteOfFeeding | "">("");
    const [clinicalNotes, setClinicalNotes] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [created, setCreated] = useState<CreateAssessmentResponse | null>(
        null
    );

    // Derived during render so the messages can never disagree with the inputs.
    const fieldErrors: Partial<Record<NumericKey, string>> = {};

    for (const field of NUMERIC_FIELDS) {
        const message = validateNumeric(numeric[field.key], field);

        if (message) fieldErrors[field.key] = message;
    }

    const hasFieldErrors = Object.keys(fieldErrors).length > 0;

    // Derived, not stored: weight and height are the only inputs.
    const bmi = computeBmi(numeric.weight_kg, numeric.height_cm);

    const bmiHint =
        bmi !== null
            ? "Calculated from weight and height."
            : "Enter a weight and a height above zero to calculate.";

    // Nothing but the patient is required. A record with no clinical values is
    // a legitimate partial screening, so this is a note rather than a blocker.
    const hasNoClinicalData =
        NUMERIC_FIELDS.every((field) => numeric[field.key].trim() === "") &&
        route === "" &&
        clinicalNotes.trim() === "";

    const resetForm = () => {
        setPatient(null);
        setAssessmentDate("");
        setNumeric(EMPTY_NUMERIC);
        setRoute("");
        setClinicalNotes("");
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!patient) {
            setError("Select a patient before saving.");
            return;
        }

        if (hasFieldErrors) {
            setError("Fix the highlighted fields before saving.");
            return;
        }

        setSaving(true);
        setError("");
        setCreated(null);

        // Only filled-in values are sent, so everything else falls back to the
        // schema default server-side rather than being pinned to whatever the
        // form happened to show.
        const body: CreateAssessmentBody = {
            uhid: patient.uhid,
            patient_name: patient.name,
        };

        if (assessmentDate) {
            // Pinned to UTC midnight so the calendar date the clinician picked
            // is the date stored, whatever the browser's timezone is. Letting
            // the browser parse the bare date would shift it a day either way.
            body.assessment_date = `${assessmentDate}T00:00:00.000Z`;
        }

        for (const field of NUMERIC_FIELDS) {
            const trimmed = numeric[field.key].trim();

            if (trimmed) body[field.key] = Number(trimmed);
        }

        // Sent like any other field, so the stored record always carries a BMI
        // that agrees with the weight and height stored beside it.
        if (bmi !== null) body.bmi = bmi;

        if (route) body.route_of_feeding = route;

        const note = clinicalNotes.trim();
        if (note) body.clinical_notes = note;

        try {
            const record = onSubmit
                ? await onSubmit(body)
                : await createAssessmentApi(body);

            setCreated(record);
            resetForm();
        } catch (err) {
            console.error("Error creating assessment:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not save the assessment. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <ClipboardList size={20} />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        New Nutritional Assessment
                    </h2>
                    <p className="text-xs text-slate-400">
                        Record screening, anthropometrics and malnutrition
                        scores.
                    </p>
                </div>
            </div>

            {created && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                    <CheckCircle2
                        size={16}
                        className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <p className="text-xs font-medium text-emerald-800">
                        Saved{" "}
                        <span className="font-bold">{created.assessment_id}</span>{" "}
                        for {created.patient_name || created.uhid}.
                    </p>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
                {/* Patient picker — the only source of the UHID. Shared with
                    diet orders, diet plans and allergy preferences; there is no
                    /api/assessments/paitent. Rendered directly because it
                    brings its own required-marker label. */}
                <div className="sm:col-span-2 xl:col-span-1">
                    <PatientSearchField
                        selected={patient}
                        onSelect={setPatient}
                        onClear={() => setPatient(null)}
                    />
                </div>

                <Field
                    label="Assessment date"
                    hint="Defaults to now. Pick a date to backdate a record."
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
                    hint="Applied automatically if left unset."
                >
                    <Select
                        value={route}
                        disabled={saving}
                        onChange={(event) =>
                            setRoute(event.target.value as RouteOfFeeding | "")
                        }
                    >
                        <option value="">Default — ORAL</option>

                        {ROUTE_OF_FEEDING.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="BMI" hint={bmiHint}>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.1"
                            value={bmi ?? ""}
                            readOnly
                            disabled={saving}
                            aria-label="Body mass index, calculated from weight and height"
                            className={`${inputClass} pr-24 ${
                                bmi === null
                                    ? "bg-slate-100 text-slate-400"
                                    : "cursor-default bg-slate-100 font-semibold text-slate-700"
                            }`}
                        />

                        {/* Spells out that this field is not hand-entered, so
                            its value is never mistaken for a measurement. */}
                        {bmi !== null && (
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700">
                                Calculated
                            </span>
                        )}
                    </div>
                </Field>

                {NUMERIC_FIELDS.map((field) => {
                    const fieldError = fieldErrors[field.key];

                    return (
                        <Field
                            key={field.key}
                            label={field.label}
                            hint={field.hint}
                            error={fieldError}
                        >
                            <input
                                type="number"
                                inputMode="decimal"
                                step={field.step}
                                min={field.min}
                                max={field.max ?? undefined}
                                value={numeric[field.key]}
                                disabled={saving}
                                onChange={(event) =>
                                    setNumeric((current) => ({
                                        ...current,
                                        [field.key]: event.target.value,
                                    }))
                                }
                                aria-invalid={Boolean(fieldError)}
                                className={`${inputClass} ${
                                    fieldError ? errorInputClass : ""
                                }`}
                            />
                        </Field>
                    );
                })}

                <Field
                    label="Clinical notes"
                    hint="Free-text observations for the dietitian."
                >
                    <input
                        type="text"
                        value={clinicalNotes}
                        disabled={saving}
                        onChange={(event) => setClinicalNotes(event.target.value)}
                        placeholder="Mild muscle wasting in forearms"
                        className={inputClass}
                    />
                </Field>

                {/* Not blocking: a partial screening is explicitly allowed, but
                    it should never be filed by accident. */}
                {hasNoClinicalData && !saving && (
                    <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-700 sm:col-span-2 xl:col-span-3">
                        <TriangleAlert size={12} />
                        With no clinical values entered, this is filed as a
                        partial record with no score.
                    </p>
                )}

                {error && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 sm:col-span-2 xl:col-span-3">
                        {error}
                    </p>
                )}

                <div className="flex justify-end sm:col-span-2 xl:col-span-3">
                    <button
                        type="submit"
                        disabled={
                            patient === null || hasFieldErrors || saving
                        }
                        className="flex items-center gap-1.5 rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                                <Plus size={16} />
                                Save Assessment
                            </>
                        )}
                    </button>
                </div>

                {patient === null && !saving && (
                    <p className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400 sm:col-span-2 xl:col-span-3">
                        <TriangleAlert size={12} />
                        Select a patient to continue.
                    </p>
                )}
            </form>
        </section>
    );
}