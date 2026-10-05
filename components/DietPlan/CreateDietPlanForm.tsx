"use client";

import type { Patient } from "@/data/DietOrder/type";
import PatientSearchField from "@/components/DietOrder/PatientSearchField";
import type {
    ConsistencyLiquid,
    CreateDietPlanBody,
    CreateDietPlanResponse,
    TextureModification,
} from "@/data/DietPlan/type";
import {
    CONSISTENCY_LIQUID,
    TEXTURE_MODIFICATION,
} from "@/data/DietPlan/type";
import type { MasterMenuItem } from "@/data/MasterMenu/type";
import type { DietType } from "@/data/Menu/type";
import { DIET_TYPE } from "@/data/Menu/type";
import {
    CheckCircle2,
    LoaderCircle,
    Plus,
    TriangleAlert,
    X,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import DisallowedItemsPicker from "./DisallowedItemsPicker";
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

export default function CreateDietPlanForm({
    menuItems,
    menuLoading = false,
    onSubmit,
}: {
    /** Master menu dishes offered in the withhold picker. */
    menuItems: MasterMenuItem[];
    menuLoading?: boolean;
    /** Resolves with the created plan so the form can confirm its id. */
    onSubmit: (payload: CreateDietPlanBody) => Promise<CreateDietPlanResponse>;
}) {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [dietType, setDietType] = useState<DietType>("Normal");
    const [texture, setTexture] =
        useState<TextureModification>("Regular");
    const [consistency, setConsistency] =
        useState<ConsistencyLiquid>("Thin");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [prescribedBy, setPrescribedBy] = useState("");
    /** Withheld dishes. Empty means the patient gets the full menu. */
    const [disallowedIds, setDisallowedIds] = useState<string[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [created, setCreated] = useState<CreateDietPlanResponse | null>(null);

    // ISO date strings sort lexicographically, so this is a real comparison.
    const hasRangeError =
        startDate.trim() !== "" &&
        endDate.trim() !== "" &&
        endDate.trim() < startDate.trim();

    // UHID comes from the selected patient, never typed by hand.
    const isInvalid =
        patient === null || startDate.trim() === "" || hasRangeError;

    const resetForm = () => {
        setPatient(null);
        setDietType("Normal");
        setTexture("Regular");
        setConsistency("Thin");
        setStartDate("");
        setEndDate("");
        setPrescribedBy("");
        setDisallowedIds([]);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isInvalid || saving || patient === null) return;

        // Optional fields are sent as `undefined` rather than "" so the server
        // stores them as absent instead of blank strings.
        const body: CreateDietPlanBody = {
            uhid: patient.uhid,
            patient_name: patient.name || undefined,
            diet_type: dietType,
            start_date: startDate.trim(),
            end_date: endDate.trim() || undefined,
            texture_modification: texture,
            consistencies_liquids: consistency,
            prescribed_by_user_id: prescribedBy.trim() || undefined,
            // Sent explicitly so "nothing withheld" is stated, not implied.
            disallowed_items_id: disallowedIds,
        };

        try {
            setSaving(true);
            setError("");
            setCreated(null);

            const plan = await onSubmit(body);

            setCreated(plan);
            resetForm();
        } catch (err) {
            console.error("Error creating diet plan:", err);
            setError(
                err instanceof Error && err.message
                    ? err.message
                    : "Could not create the diet plan. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Plus size={20} />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        New Diet Plan
                    </h2>
                    <p className="text-xs text-slate-400">
                        Prescribe a therapeutic diet for a patient.
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
                {/* Patient picker — the only source of the UHID. Shared with
                    diet orders; there is no /api/dietplan/paitent. Rendered
                    directly because it brings its own required-marker label. */}
                <div className="sm:col-span-2 xl:col-span-1">
                    <PatientSearchField
                        selected={patient}
                        onSelect={setPatient}
                        onClear={() => setPatient(null)}
                    />
                </div>

                <Field label="Diet type" required>
                    <Select
                        required
                        value={dietType}
                        disabled={saving}
                        onChange={(event) =>
                            setDietType(event.target.value as DietType)
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
                                event.target.value as TextureModification
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
                        onChange={(event) => setStartDate(event.target.value)}
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
                        // Blocks picking an earlier date, though the handler
                        // re-checks because typing can bypass min.
                        min={startDate.trim() || undefined}
                        aria-invalid={hasRangeError}
                        onChange={(event) => setEndDate(event.target.value)}
                        className={`${inputClass} ${
                            hasRangeError ? "border-red-300 bg-red-50/50" : ""
                        }`}
                    />
                </Field>

                <Field
                    label="Prescribed by"
                    hint="Staff id. Temporary — auth middleware will supply this."
                >
                    <input
                        value={prescribedBy}
                        disabled={saving}
                        onChange={(event) =>
                            setPrescribedBy(event.target.value)
                        }
                        placeholder="e.g. ST-0042"
                        className={inputClass}
                    />
                </Field>

                {/* Withheld dishes span the full row — the roster needs it. */}
                <div className="sm:col-span-2 xl:col-span-3">
                    <DisallowedItemsPicker
                        items={menuItems}
                        loading={menuLoading}
                        selected={disallowedIds}
                        onChange={setDisallowedIds}
                        disabled={saving}
                    />
                </div>

                {created && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 px-3 py-2.5 sm:col-span-2 xl:col-span-3">
                        <CheckCircle2
                            size={16}
                            className="mt-0.5 shrink-0 text-emerald-600"
                        />

                        <p className="text-xs font-medium text-emerald-700">
                            Plan {created.diet_plan_id} created for{" "}
                            {created.patient_name} — {created.diet_type},
                            starting {created.start_date.slice(0, 10)}
                            {created.end_date
                                ? ` until ${created.end_date.slice(0, 10)}`
                                : " with no end date"}
                            .
                        </p>

                        <button
                            type="button"
                            onClick={() => setCreated(null)}
                            aria-label="Dismiss confirmation"
                            className="ml-auto shrink-0 cursor-pointer rounded-md p-1 text-emerald-600 transition hover:bg-emerald-100"
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}

                {error && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 sm:col-span-2 xl:col-span-3">
                        {error}
                    </p>
                )}

                <div className="flex justify-end sm:col-span-2 xl:col-span-3">
                    <button
                        type="submit"
                        disabled={isInvalid || saving}
                        className="flex items-center gap-1.5 rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <LoaderCircle
                                    size={16}
                                    className="animate-spin"
                                />
                                Creating
                            </>
                        ) : (
                            <>
                                <Plus size={16} />
                                Create Plan
                            </>
                        )}
                    </button>
                </div>

                {isInvalid && !saving && (
                    <p className="flex items-center justify-end gap-1.5 text-[10px] text-slate-400 sm:col-span-2 xl:col-span-3">
                        <TriangleAlert size={12} />
                        {patient === null
                            ? "Select a patient to continue."
                            : hasRangeError
                              ? "Fix the date range to continue."
                              : "Pick a start date to continue."}
                    </p>
                )}
            </form>
        </section>
    );
}
