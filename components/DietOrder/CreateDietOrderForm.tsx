"use client";

import { MEAL_TYPE, type MealSlot } from "@/data/Menu/type";
import type { CreateDietOrderBody, Patient } from "@/data/DietOrder/type";
import PatientSearchField from "./PatientSearchField";
import { LoaderCircle, Plus, TriangleAlert } from "lucide-react";
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

export default function CreateDietOrderForm({
    onSubmit,
}: {
    onSubmit: (payload: CreateDietOrderBody) => Promise<void>;
}) {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [scheduledDate, setScheduledDate] = useState("");
    const [mealType, setMealType] = useState<MealSlot>("Breakfast");
    const [wardName, setWardName] = useState("");
    const [bedNumber, setBedNumber] = useState("");
    const [orderSource, setOrderSource] = useState("Dietitian");
    const [specialInstruction, setSpecialInstruction] = useState("");
    const [isSpecial, setIsSpecial] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // UHID comes from the selected patient, never typed by hand.
    const isInvalid = patient === null || scheduledDate.trim() === "";

    const resetForm = () => {
        setPatient(null);
        setScheduledDate("");
        setMealType("Breakfast");
        setWardName("");
        setBedNumber("");
        setOrderSource("Dietitian");
        setSpecialInstruction("");
        setIsSpecial(false);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isInvalid || saving || patient === null) return;

        // Optional fields are sent as `undefined` rather than "" so the server
        // stores them as absent instead of blank strings.
        const body: CreateDietOrderBody = {
            uhid: patient.uhid,
            scheduled_date: scheduledDate.trim(),
            meal_type: mealType,
            ward_name: wardName.trim() || undefined,
            bed_number: bedNumber.trim() || undefined,
            order_source: orderSource.trim() || undefined,
            special_instruction: specialInstruction.trim() || undefined,
            is_special: isSpecial,
        };

        try {
            setSaving(true);
            setError("");

            await onSubmit(body);

            resetForm();
        } catch (err) {
            console.error("Error creating diet order:", err);
            setError("Could not create the diet order. Please try again.");
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
                        New Diet Order
                    </h2>
                    <p className="text-xs text-slate-400">
                        Raise an order for a patient&apos;s upcoming meal slot.
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
                {/* Patient picker — the only source of the UHID */}
                <div className="sm:col-span-2 xl:col-span-1">
                    <PatientSearchField
                        selected={patient}
                        onSelect={setPatient}
                        onClear={() => setPatient(null)}
                    />
                </div>

                <Field label="Scheduled date" required>
                    <input
                        required
                        type="date"
                        value={scheduledDate}
                        disabled={saving}
                        onChange={(event) => setScheduledDate(event.target.value)}
                        className={inputClass}
                    />
                </Field>

                <Field label="Meal type" required>
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

                {/* Optional fields */}
                <Field label="Ward name" hint='e.g. "Cardiology Ward"'>
                    <input
                        value={wardName}
                        disabled={saving}
                        onChange={(event) => setWardName(event.target.value)}
                        placeholder="Cardiology Ward"
                        className={inputClass}
                    />
                </Field>

                <Field label="Bed number">
                    <input
                        value={bedNumber}
                        disabled={saving}
                        onChange={(event) => setBedNumber(event.target.value)}
                        placeholder="e.g. 12-B"
                        className={inputClass}
                    />
                </Field>

                <Field label="Order source">
                    <input
                        value={orderSource}
                        disabled={saving}
                        onChange={(event) => setOrderSource(event.target.value)}
                        placeholder="Dietitian"
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="Special instruction"
                    hint='e.g. "Thickened liquid"'
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

                {/* Priority flag */}
                <div className="sm:col-span-2 xl:col-span-1">
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
                                Create Order
                            </>
                        )}
                    </button>
                </div>
            </form>
        </section>
    );
}