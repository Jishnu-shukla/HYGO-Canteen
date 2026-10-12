"use client";

import type {
    AllergyPrefListItem,
    AllergySeverity,
    ReligiousDietaryRestriction,
    UpdateAllergyPrefBody,
    UpdateAllergyPrefResponse,
} from "@/data/AllergyPref/type";
import {
    ALLERGY_SEVERITY,
    RELIGIOUS_DIETARY_RESTRICTION,
} from "@/data/AllergyPref/type";
import { LoaderCircle, Save, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { SEVERITY_LABEL } from "./allergyPrefLabels";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 disabled:opacity-60";

function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                {label}
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

/**
 * Partial update of one preference's clinical fields.
 *
 * The patient and record id are identity, not content, so they are shown
 * read-only. `extra_notes` and `is_menu_default` are not editable here because
 * the list response does not carry them — the update is partial, so leaving
 * them out preserves the stored values instead of blanking them.
 *
 * Only fields the dietitian actually changed are sent, which keeps a record
 * whose `religious_dietary_restrictions` is an undeclared value (the live data
 * contains "Non-Vegetarian") from being rewritten to something else on an
 * unrelated edit.
 */
export default function EditAllergyPrefModal({
    pref,
    onSubmit,
    onClose,
}: {
    pref: AllergyPrefListItem;
    /** Resolves with the updated record; rejects so the modal shows the reason. */
    onSubmit: (
        payload: UpdateAllergyPrefBody
    ) => Promise<UpdateAllergyPrefResponse>;
    onClose: () => void;
}) {
    const [allergies, setAllergies] = useState(pref.allergies);
    const [intolerances, setIntolerances] = useState(pref.intolerances);
    const [severity, setSeverity] = useState<AllergySeverity>(pref.severity);
    const [restriction, setRestriction] = useState<string>(
        pref.religious_dietary_restrictions
    );

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // The row may hold an empty string or an undeclared restriction; both are
    // offered so the current value round-trips untouched. An undeclared value
    // can still be replaced with a declared one.
    const restrictionOptions: string[] = [...RELIGIOUS_DIETARY_RESTRICTION];

    if (
        restriction !== "" &&
        !restrictionOptions.includes(restriction)
    ) {
        restrictionOptions.unshift(restriction);
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (saving) return;

        const body: UpdateAllergyPrefBody = {};

        const allergy = allergies.trim();
        if (allergy !== pref.allergies) body.allergies = allergy;

        const intolerance = intolerances.trim();
        if (intolerance !== pref.intolerances) {
            body.intolerances = intolerance;
        }

        if (severity !== pref.severity) body.severity = severity;

        // "" is not a legal update value; an unchanged blank stays blank, and a
        // changed one is always a declared option.
        if (restriction !== pref.religious_dietary_restrictions && restriction) {
            body.religious_dietary_restrictions =
                restriction as ReligiousDietaryRestriction;
        }

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
            console.error("Error updating allergy preference:", err);
            setError(
                err instanceof Error && err.message
                    ? err.message
                    : "Could not save the allergy preference. Please try again."
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
                            Edit Allergy Preference
                        </h2>

                        <p className="mt-0.5 truncate text-xs text-slate-400">
                            {pref.allergy_preference_id}
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
                            {pref.patient_name || "Unknown patient"}
                        </p>
                        <p className="truncate text-[10px] text-slate-400">
                            {pref.uhid || "—"}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Allergy"
                            hint="Leave blank to clear it."
                        >
                            <input
                                type="text"
                                value={allergies}
                                disabled={saving}
                                onChange={(event) =>
                                    setAllergies(event.target.value)
                                }
                                placeholder="Peanuts"
                                className={inputClass}
                            />
                        </Field>

                        <Field
                            label="Intolerance"
                            hint="Leave blank to clear it."
                        >
                            <input
                                type="text"
                                value={intolerances}
                                disabled={saving}
                                onChange={(event) =>
                                    setIntolerances(event.target.value)
                                }
                                placeholder="Lactose"
                                className={inputClass}
                            />
                        </Field>

                        <Field
                            label="Severity"
                            hint="How urgently the kitchen must treat this."
                        >
                            <Select
                                value={severity}
                                disabled={saving}
                                onChange={(event) =>
                                    setSeverity(
                                        event.target.value as AllergySeverity
                                    )
                                }
                            >
                                {ALLERGY_SEVERITY.map((option) => (
                                    <option key={option} value={option}>
                                        {SEVERITY_LABEL[option]}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field
                            label="Religious / Dietary restriction"
                            hint="Applied to the patient's menu."
                        >
                            <Select
                                value={restriction}
                                disabled={saving}
                                onChange={(event) =>
                                    setRestriction(event.target.value)
                                }
                            >
                                {/* Present only while the stored value is
                                    blank, so the form does not imply a change
                                    the dietitian never made. */}
                                {pref.religious_dietary_restrictions === "" && (
                                    <option value="">Not set</option>
                                )}

                                {restrictionOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </Select>
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
                            disabled={saving}
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
