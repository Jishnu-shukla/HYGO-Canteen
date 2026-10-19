"use client";

import PatientSearchField from "@/components/DietOrder/PatientSearchField";
import { createAllergyPrefApi } from "@/data/AllergyPref/api";
import type {
    AllergyEntry,
    CreateAllergyPrefBody,
    CreateAllergyPrefResponse,
    ReligiousDietaryRestriction,
} from "@/data/AllergyPref/type";
import { RELIGIOUS_DIETARY_RESTRICTION } from "@/data/AllergyPref/type";
import type { Patient } from "@/data/DietOrder/type";
import {
    CheckCircle2,
    LoaderCircle,
    ShieldAlert,
    TriangleAlert,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { AllergyTagField, IntoleranceTagField } from "./AllergyTagFields";

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

/** Same chrome as the other form selects. */
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

export default function CreateAllergyPrefForm({
    onSubmit,
}: {
    /** Resolves with the created record so the caller can refresh the cards. */
    onSubmit?: (
        body: CreateAllergyPrefBody
    ) => Promise<CreateAllergyPrefResponse>;
}) {
    const [patient, setPatient] = useState<Patient | null>(null);
    // Both collections are capsule editors, so they only ever hold committed
    // values — there is no blank draft row to strip out at submit time.
    const [allergies, setAllergies] = useState<AllergyEntry[]>([]);
    const [intolerances, setIntolerances] = useState<string[]>([]);
    const [restriction, setRestriction] =
        useState<ReligiousDietaryRestriction | "">("");
    const [extraNotes, setExtraNotes] = useState("");
    const [isMenuDefault, setIsMenuDefault] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [created, setCreated] = useState<CreateAllergyPrefResponse | null>(
        null
    );

    const hasNoTriggers = allergies.length === 0 && intolerances.length === 0;

    const resetForm = () => {
        setPatient(null);
        setAllergies([]);
        setIntolerances([]);
        setRestriction("");
        setExtraNotes("");
        setIsMenuDefault(false);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!patient) {
            setError("Select a patient before saving.");
            return;
        }

        setSaving(true);
        setError("");
        setCreated(null);

        // Only non-blank values are sent, so the dietary restriction falls
        // back to the schema default server-side rather than being pinned to
        // whatever the dropdown happened to show. Severity has no separate
        // field any more — it travels on each allergy entry.
        const body: CreateAllergyPrefBody = {
            uhid: patient.uhid,
            patient_name: patient.name,
        };

        if (allergies.length > 0) body.allergies = allergies;
        if (intolerances.length > 0) body.intolerances = intolerances;
        if (restriction) body.religious_dietary_restrictions = restriction;

        const note = extraNotes.trim();
        if (note) body.extra_notes = note;

        // A checkbox always holds a definite value, so this one is always sent
        // — unlike the blank-able text fields above.
        body.is_menu_default = isMenuDefault;

        try {
            const record = onSubmit
                ? await onSubmit(body)
                : await createAllergyPrefApi(body);

            setCreated(record);
            resetForm();
        } catch (err) {
            console.error("Error creating allergy preference:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not save the allergy preference. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <ShieldAlert size={20} />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        New Allergy Preference
                    </h2>
                    <p className="text-xs text-slate-400">
                        Record allergens and dietary restrictions for a patient.
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
                        <span className="font-bold">
                            {created.allergy_preference_id}
                        </span>{" "}
                        for {created.patient_name || created.uhid}.
                    </p>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
                {/* Patient picker owns the first row — the only source of the
                    UHID, shared with diet orders; there is no
                    /api/allergypref/paitent. */}
                <div className="sm:col-span-2 xl:col-span-3">
                    <PatientSearchField
                        selected={patient}
                        onSelect={setPatient}
                        onClear={() => setPatient(null)}
                    />
                </div>

                {/* The two collections sit side by side beneath the patient
                    and stay compact: committed values collapse into capsules
                    rather than each getting a row of inputs. */}
                <Field
                    label="Allergies"
                    hint="Type a name, pick its severity, press Enter. Hover a capsule to remove it."
                >
                    <AllergyTagField
                        value={allergies}
                        onChange={setAllergies}
                        disabled={saving}
                    />
                </Field>

                <Field
                    label="Intolerances"
                    hint="Type a name, press Enter. Hover a capsule to remove it."
                >
                    <IntoleranceTagField
                        value={intolerances}
                        onChange={setIntolerances}
                        disabled={saving}
                    />
                </Field>

                <Field
                    label="Religious / Dietary restriction"
                    hint="Applied automatically if left unset."
                >
                    <Select
                        value={restriction}
                        disabled={saving}
                        onChange={(event) =>
                            setRestriction(
                                event.target
                                    .value as ReligiousDietaryRestriction | ""
                            )
                        }
                    >
                        <option value="">Default — Vegetarian</option>

                        {RELIGIOUS_DIETARY_RESTRICTION.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field
                    label="Extra notes"
                    hint="Free-text guidance for the kitchen."
                >
                    <input
                        type="text"
                        value={extraNotes}
                        disabled={saving}
                        onChange={(event) => setExtraNotes(event.target.value)}
                        placeholder="Avoid cross-contamination in prep"
                        className={inputClass}
                    />
                </Field>

                {/* The checkbox takes the last two columns because it is a
                    standalone statement rather than a field paired with
                    another. */}
                <label className="flex cursor-pointer items-start gap-2.5 sm:col-span-2 xl:col-span-2">
                    <input
                        type="checkbox"
                        checked={isMenuDefault}
                        disabled={saving}
                        onChange={(event) =>
                            setIsMenuDefault(event.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-amber-600"
                    />

                    <span>
                        <span className="block text-xs font-semibold text-slate-600">
                            Apply as the kitchen&rsquo;s standing default
                        </span>

                        <span className="mt-0.5 block text-[10px] text-slate-400">
                            Use this profile automatically for the patient&rsquo;s
                            menu.
                        </span>
                    </span>
                </label>

                {/* Not blocking: a bare record is a legitimate outcome per the
                    contract, but it should never be saved by accident. */}
                {hasNoTriggers && !saving && (
                    <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-700 sm:col-span-2 xl:col-span-3">
                        <TriangleAlert size={12} />
                        With no allergy or intolerance entered, this is saved as
                        an explicit &ldquo;no known allergies&rdquo; record.
                    </p>
                )}

                {error && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 sm:col-span-2 xl:col-span-3">
                        {error}
                    </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 xl:col-span-3">
                    {patient === null && !saving && (
                        <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <TriangleAlert size={12} />
                            Select a patient to continue.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={patient === null || saving}
                        className="ml-auto flex items-center gap-1.5 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                            <>Save Preference</>
                        )}
                    </button>
                </div>
            </form>
        </section>
    );
}
