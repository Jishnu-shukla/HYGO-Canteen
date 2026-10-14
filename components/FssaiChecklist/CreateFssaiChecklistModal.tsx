"use client";

import { createFssaiChecklistApi } from "@/data/FssaiChecklist/api";
import type {
    CreateFssaiChecklistBody,
    CreateFssaiChecklistResponse,
} from "@/data/FssaiChecklist/type";
import { LoaderCircle, X } from "lucide-react";
import { FormEvent, useState } from "react";

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

/**
 * Today as an <input type="date"> value (YYYY-MM-DD), built from local date
 * parts. toISOString() would use UTC and can land on the wrong day either side
 * of midnight depending on the user's timezone.
 */
function todayInputValue() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${now.getFullYear()}-${month}-${day}`;
}

function Field({
    label,
    htmlFor,
    required = false,
    hint,
    children,
}: {
    label: string;
    htmlFor?: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
                {label}
                {required && <span className="text-red-500"> *</span>}
            </label>

            {children}

            {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
        </div>
    );
}

/**
 * Files one FSSAI checklist through POST /api/fssaichecklist.
 *
 * The service owns checklist_id, inspector_id and the initial status, so the
 * form sends only what the caller may decide: the audited category, the hygiene
 * score, and optionally the audit date and corrective notes. The page mounts it
 * only while open, so each open starts from a clean form.
 */
export default function CreateFssaiChecklistModal({
    onCreated,
    onClose,
}: {
    onCreated: (created: CreateFssaiChecklistResponse) => void;
    onClose: () => void;
}) {
    const [categories, setCategories] = useState("");
    const [hygieneScore, setHygieneScore] = useState("");
    // Prefilled with today; the user can back-date it to file an earlier audit.
    const [auditDate, setAuditDate] = useState(todayInputValue);
    const [notes, setNotes] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const score = Number(hygieneScore);
    const scoreInvalid =
        hygieneScore.trim() === "" ||
        Number.isNaN(score) ||
        score < 0 ||
        score > 100;

    const isInvalid = categories.trim() === "" || scoreInvalid;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isInvalid || saving) return;

        const body: CreateFssaiChecklistBody = {
            categories: categories.trim(),
            hygiene_score: score,
        };

        // Optional fields are omitted when blank, so the service applies its
        // documented defaults (audit_date -> now, notes -> "").
        if (auditDate) body.audit_date = new Date(auditDate).toISOString();
        if (notes.trim()) body.corrective_actions_notes = notes.trim();

        setSaving(true);
        setError("");

        const created = await createFssaiChecklistApi(body);

        if (!created) {
            setError("Could not file the checklist. Please try again.");
            setSaving(false);
            return;
        }

        onCreated(created);
        onClose();
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={() => !saving && onClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-fssai-title"
                className="my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 bg-amber-50/60 px-5 py-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            FSSAI Compliance
                        </p>

                        <h2
                            id="create-fssai-title"
                            className="mt-1 text-lg font-semibold text-slate-800"
                        >
                            Add Checklist Category
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            File an audit entry — the ID and initial status are
                            set by the server.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 px-5 py-5">
                        <Field
                            label="Category"
                            htmlFor="fssai-category"
                            required
                            hint="Free text — any category name."
                        >
                            <input
                                id="fssai-category"
                                type="text"
                                value={categories}
                                onChange={(event) => {
                                    setCategories(event.target.value);

                                    if (error) setError("");
                                }}
                                placeholder="e.g. Cold storage"
                                className={inputClass}
                            />
                        </Field>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field
                                label="Hygiene Score"
                                htmlFor="fssai-hygiene"
                                required
                                hint="0 to 100."
                            >
                                <input
                                    id="fssai-hygiene"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={hygieneScore}
                                    onChange={(event) => {
                                        setHygieneScore(event.target.value);

                                        if (error) setError("");
                                    }}
                                    placeholder="e.g. 92"
                                    className={inputClass}
                                />
                            </Field>

                            <Field
                                label="Audit Date"
                                htmlFor="fssai-audit-date"
                                hint="Defaults to today — change it for an earlier audit."
                            >
                                <input
                                    id="fssai-audit-date"
                                    type="date"
                                    value={auditDate}
                                    onChange={(event) =>
                                        setAuditDate(event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </Field>
                        </div>

                        <Field
                            label="Corrective Action Notes"
                            htmlFor="fssai-notes"
                            hint="Optional."
                        >
                            <textarea
                                id="fssai-notes"
                                value={notes}
                                onChange={(event) =>
                                    setNotes(event.target.value)
                                }
                                rows={3}
                                placeholder="Record follow-up actions for this audit..."
                                className={inputClass}
                            />
                        </Field>

                        {error && (
                            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                                {error}
                            </p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isInvalid || saving}
                            className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving && (
                                <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                />
                            )}

                            {saving ? "Filing..." : "File Checklist"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
