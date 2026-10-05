"use client";

import { useEffect, useState } from "react";

export interface AddBatchFormData {
    batch_number: string;
    received_date: string;
    expiry_date: string;
    initial_quantity: string;
    current_quantity: string;
    unit_cost: string;
}

interface AddBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AddBatchFormData) => void;
    itemName?: string;
    unitOfMeasure?: string;
}

const getToday = () => {
    const today = new Date();

    return `${today.getFullYear()}-${String(
        today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export default function AddBatchModal({
    isOpen,
    onClose,
    onSubmit,
    itemName,
    unitOfMeasure,
}: AddBatchModalProps) {
    const [formData, setFormData] = useState<AddBatchFormData>({
        batch_number: "",
        received_date: getToday(),
        expiry_date: "",
        initial_quantity: "",
        current_quantity: "",
        unit_cost: "",
    });

    const [error, setError] = useState("");

    // Reset the form every time the modal is opened.
    useEffect(() => {
        if (isOpen) {
            setFormData({
                batch_number: "",
                received_date: getToday(),
                expiry_date: "",
                initial_quantity: "",
                current_quantity: "",
                unit_cost: "",
            });
            setError("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const updateField = (
        field: keyof AddBatchFormData,
        value: string
    ) => {
        setFormData((previous) => ({
            ...previous,
            [field]: value,
        }));

        if (error) {
            setError("");
        }
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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

        onSubmit(formData);
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
                aria-labelledby="add-batch-title"
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 bg-blue-50/60 px-5 py-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Kitchen Inventory
                        </p>

                        <h2
                            id="add-batch-title"
                            className="mt-1 text-lg font-semibold text-slate-800"
                        >
                            Add Batch
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            {itemName
                                ? `Add a new batch for ${itemName}.`
                                : "Enter the batch details for this inventory item."}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none text-slate-400 transition hover:bg-white hover:text-slate-700"
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
                                htmlFor="batch-number"
                                className="mb-1.5 block text-xs font-semibold text-slate-700"
                            >
                                Batch Number
                            </label>

                            <input
                                id="batch-number"
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
                                    htmlFor="received-date"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Received Date
                                </label>

                                <input
                                    id="received-date"
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

                                <p className="mt-1 text-[9px] text-slate-400">
                                    Defaults to today
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="expiry-date"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Expiry Date
                                </label>

                                <input
                                    id="expiry-date"
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
                                    htmlFor="initial-quantity"
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
                                    id="initial-quantity"
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
                                    htmlFor="current-quantity"
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
                                    id="current-quantity"
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
                                htmlFor="unit-cost"
                                className="mb-1.5 block text-xs font-semibold text-slate-700"
                            >
                                Unit Cost
                            </label>

                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                    ₹
                                </span>

                                <input
                                    id="unit-cost"
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
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
                        >
                            Add Batch
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
