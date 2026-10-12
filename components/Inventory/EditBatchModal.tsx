"use client";

import { useState } from "react";
import {
    InventoryBatch,
    UpdateInventoryBatchFields,
} from "@/data/Inventory/type";

export interface EditBatchFormData {
    batch_number: string;
    received_date: string;
    expiry_date: string;
    initial_quantity: string;
    current_quantity: string;
    unit_cost: string;
}

interface EditBatchModalProps {
    batch: InventoryBatch;
    itemName?: string;
    unitOfMeasure?: string;
    onClose: () => void;
    onSubmit: (data: UpdateInventoryBatchFields) => void | Promise<void>;
}

/** ISO datetime or date string -> value accepted by <input type="date">. */
const toDateInput = (value?: string | null) => {
    if (!value) return "";

    return value.slice(0, 10);
};

export default function EditBatchModal({
    batch,
    itemName,
    unitOfMeasure,
    onClose,
    onSubmit,
}: EditBatchModalProps) {
    const [formData, setFormData] = useState<EditBatchFormData>(() => ({
        batch_number: batch.batch_number ?? "",
        received_date: toDateInput(batch.received_date),
        expiry_date: toDateInput(batch.expiry_date),
        initial_quantity: String(batch.initial_quantity ?? ""),
        current_quantity: String(batch.current_quantity ?? ""),
        unit_cost: String(batch.unit_cost ?? ""),
    }));

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateField = (field: keyof EditBatchFormData, value: string) => {
        setFormData((previous) => ({
            ...previous,
            [field]: value,
        }));

        if (error) {
            setError("");
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (
            !formData.batch_number.trim() ||
            !formData.received_date ||
            !formData.expiry_date ||
            !formData.initial_quantity ||
            !formData.current_quantity ||
            !formData.unit_cost
        ) {
            setError("Please fill in all required fields.");
            return;
        }

        if (formData.expiry_date < formData.received_date) {
            setError("Expiry date cannot be before the received date.");
            return;
        }

        if (
            Number(formData.initial_quantity) < 0 ||
            Number(formData.current_quantity) < 0 ||
            Number(formData.unit_cost) < 0
        ) {
            setError("Quantity and unit cost cannot be negative.");
            return;
        }

        if (
            Number(formData.current_quantity) >
            Number(formData.initial_quantity)
        ) {
            setError(
                "Current quantity cannot be greater than initial quantity."
            );
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmit({
                batch_id: batch.batch_id,
                batch_number: formData.batch_number.trim(),
                received_date: formData.received_date,
                expiry_date: formData.expiry_date,
                initial_quantity: Number(formData.initial_quantity),
                current_quantity: Number(formData.current_quantity),
                unit_cost: Number(formData.unit_cost),
            });
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Failed to update batch."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-batch-title"
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 bg-blue-50/60 px-5 py-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Kitchen Inventory
                        </p>

                        <h2
                            id="edit-batch-title"
                            className="mt-1 text-lg font-semibold text-slate-800"
                        >
                            Edit Batch
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            {itemName
                                ? `Update batch ${batch.batch_number} for ${itemName}.`
                                : `Update batch ${batch.batch_number}.`}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        ×
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 px-5 py-5">
                        {/* Batch number */}
                        <div>
                            <label
                                htmlFor="edit-batch-number"
                                className="mb-1.5 block text-xs font-semibold text-slate-700"
                            >
                                Batch Number
                            </label>

                            <input
                                id="edit-batch-number"
                                type="text"
                                value={formData.batch_number}
                                onChange={(event) =>
                                    updateField(
                                        "batch_number",
                                        event.target.value
                                    )
                                }
                                placeholder="e.g. BATCH-001"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="edit-received-date"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Received Date
                                </label>

                                <input
                                    id="edit-received-date"
                                    type="date"
                                    value={formData.received_date}
                                    onChange={(event) =>
                                        updateField(
                                            "received_date",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-expiry-date"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Expiry Date
                                </label>

                                <input
                                    id="edit-expiry-date"
                                    type="date"
                                    min={formData.received_date}
                                    value={formData.expiry_date}
                                    onChange={(event) =>
                                        updateField(
                                            "expiry_date",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                />
                            </div>
                        </div>

                        {/* Quantities */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="edit-initial-quantity"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Initial Quantity
                                    {unitOfMeasure && (
                                        <span className="ml-1 font-normal text-slate-400">
                                            ({unitOfMeasure})
                                        </span>
                                    )}
                                </label>

                                <input
                                    id="edit-initial-quantity"
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={formData.initial_quantity}
                                    onChange={(event) =>
                                        updateField(
                                            "initial_quantity",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. 120"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-current-quantity"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Current Quantity
                                    {unitOfMeasure && (
                                        <span className="ml-1 font-normal text-slate-400">
                                            ({unitOfMeasure})
                                        </span>
                                    )}
                                </label>

                                <input
                                    id="edit-current-quantity"
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={formData.current_quantity}
                                    onChange={(event) =>
                                        updateField(
                                            "current_quantity",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. 120"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                />
                            </div>
                        </div>

                        {/* Unit cost */}
                        <div>
                            <label
                                htmlFor="edit-unit-cost"
                                className="mb-1.5 block text-xs font-semibold text-slate-700"
                            >
                                Unit Cost
                            </label>

                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                    ₹
                                </span>

                                <input
                                    id="edit-unit-cost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.unit_cost}
                                    onChange={(event) =>
                                        updateField(
                                            "unit_cost",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. 85.50"
                                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                />
                            </div>
                        </div>

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
                            disabled={isSubmitting}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting && (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            )}

                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
