"use client";

import {
    LOGGED_BY_USER_ID,
    createBedSideDeliveryApi,
} from "@/data/BedSideDelivery/api";
import type {
    BedSideDeliveryOrder,
    BedSideDeliveryRecord,
    CreateBedSideDeliveryBody,
} from "@/data/BedSideDelivery/type";
import {
    BedSingle,
    CheckCircle2,
    LoaderCircle,
    Plus,
    TriangleAlert,
} from "lucide-react";
import { type FormEvent, useState } from "react";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 disabled:opacity-60";

/** Full tray — the point at which no rejection reason is needed. */
const FULL_INTAKE = 100;

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

/**
 * Logs a bedside handover: which tray, how much was eaten, and why food was
 * left if it was.
 *
 * Inline rather than a modal — the meal round is a frequent, repeatable task,
 * so the form stays on screen rather than behind a button.
 */
export default function CreateBedSideDeliveryForm({
    orders,
    loadingOrders = false,
    onSubmit,
}: {
    /** Picker options from GET /api/bedsidedelivery/orders. */
    orders: BedSideDeliveryOrder[];
    loadingOrders?: boolean;
    /** Resolves with the created record so the caller can refresh the cards. */
    onSubmit?: (
        body: CreateBedSideDeliveryBody
    ) => Promise<BedSideDeliveryRecord>;
}) {
    const [orderId, setOrderId] = useState("");
    const [intake, setIntake] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");
    const [notes, setNotes] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [created, setCreated] = useState<BedSideDeliveryRecord | null>(null);

    // Parsed once so the "needs a reason" check and the submitted number
    // cannot disagree about what was typed.
    const parsedIntake = Number(intake);
    const hasValidIntake =
        intake.trim() !== "" &&
        Number.isFinite(parsedIntake) &&
        parsedIntake >= 0 &&
        parsedIntake <= FULL_INTAKE;

    const isPartial = hasValidIntake && parsedIntake < FULL_INTAKE;
    const needsReason = isPartial && rejectionReason.trim() === "";

    const resetForm = () => {
        setOrderId("");
        setIntake("");
        setRejectionReason("");
        setNotes("");
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!orderId) {
            setError("Select an order before saving.");
            return;
        }

        if (!hasValidIntake) {
            setError("Enter how much was eaten, between 0 and 100.");
            return;
        }

        if (needsReason) {
            setError(
                "Record why food was left behind, or set intake to 100."
            );
            return;
        }

        setSaving(true);
        setError("");
        setCreated(null);

        const reason = rejectionReason.trim();
        const note = notes.trim();

        const body: CreateBedSideDeliveryBody = {
            order_id: orderId,
            intake_percentage: parsedIntake,
            // A finished tray has nothing to reject, so the field is dropped
            // entirely rather than sent as an empty string.
            rejection_reason: isPartial && reason ? reason : null,
            notes: note ? note : null,
            // Never collected from the user; see LOGGED_BY_USER_ID.
            logged_by_user_id: LOGGED_BY_USER_ID,
        };

        try {
            const record = onSubmit
                ? await onSubmit(body)
                : await createBedSideDeliveryApi(body);

            setCreated(record);
            resetForm();
        } catch (err) {
            console.error("Error logging bedside delivery:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not log the delivery. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <BedSingle size={20} />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        Log Bedside Delivery
                    </h2>
                    <p className="text-xs text-slate-400">
                        Record the handover and how much of the tray was eaten.
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
                        Delivery logged for{" "}
                        <span className="font-bold">{created.order_id}</span>{" "}
                        at{" "}
                        <span className="font-bold">
                            {created.intake_percentage}%
                        </span>{" "}
                        intake.
                    </p>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
                <Field
                    label="Order"
                    required
                    hint="Patient whose tray is being handed over."
                >
                    <select
                        value={orderId}
                        disabled={saving || loadingOrders}
                        onChange={(event) => setOrderId(event.target.value)}
                        className={`${inputClass} appearance-none`}
                    >
                        <option value="">
                            {loadingOrders
                                ? "Loading orders..."
                                : orders.length === 0
                                  ? "No orders available"
                                  : "Select an order"}
                        </option>

                        {orders.map((order) => (
                            <option key={order.order_id} value={order.order_id}>
                                {order.patient_name} ({order.uhid}) —{" "}
                                {order.order_id}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field
                    label="Intake (%)"
                    required
                    hint="Share of the tray eaten, 0–100."
                >
                    <input
                        type="number"
                        min={0}
                        max={FULL_INTAKE}
                        value={intake}
                        disabled={saving}
                        onChange={(event) => setIntake(event.target.value)}
                        placeholder="100"
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="Rejection reason"
                    required={isPartial}
                    hint={
                        isPartial
                            ? "Needed while intake is below 100."
                            : "Only for a partly eaten tray."
                    }
                >
                    <input
                        type="text"
                        value={rejectionReason}
                        disabled={saving}
                        onChange={(event) =>
                            setRejectionReason(event.target.value)
                        }
                        placeholder="e.g. Too bland, poor appetite"
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="Notes"
                    hint="Free-text observation for the dietician."
                >
                    <input
                        type="text"
                        value={notes}
                        disabled={saving}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Ate half the porridge, refused the fruit"
                        className={inputClass}
                    />
                </Field>

                {needsReason && (
                    <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-700 sm:col-span-2 xl:col-span-3">
                        <TriangleAlert size={12} />
                        Intake is below 100%, so a rejection reason is needed to
                        explain the plate waste.
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
                        disabled={!orderId || saving}
                        className="flex items-center gap-1.5 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                                Log Delivery
                            </>
                        )}
                    </button>
                </div>
            </form>
        </section>
    );
}
