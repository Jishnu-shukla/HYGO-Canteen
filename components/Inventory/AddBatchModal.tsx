"use client";

import { uploadInventoryBatchBillApi } from "@/data/Inventory/api";
import { useEffect, useState } from "react";

export interface AddBatchFormData {
    batch_number: string;
    received_date: string;
    expiry_date: string;
    initial_quantity: string;
    current_quantity: string;
    unit_cost: string;
    gst: string;
    /** Uploaded bill URL, "" when no bill is attached. */
    bill_image: string;
}

interface AddBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: AddBatchFormData) => void | Promise<void>;
    itemName?: string;
    unitOfMeasure?: string;
    /** The selected item's default GST, used to prefill the batch GST. */
    defaultGst?: number;
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
    defaultGst,
}: AddBatchModalProps) {
    const [formData, setFormData] = useState<AddBatchFormData>({
        batch_number: "",
        received_date: getToday(),
        expiry_date: "",
        initial_quantity: "",
        current_quantity: "",
        unit_cost: "",
        gst: String(defaultGst ?? 0),
        bill_image: "",
    });

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

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
                gst: String(defaultGst ?? 0),
                bill_image: "",
            });
            setError("");
            setIsSubmitting(false);
            setIsUploading(false);
        }
    }, [isOpen, defaultGst]);

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

    const handleBillUpload = async (file: File | undefined) => {
        if (!file) return;

        setIsUploading(true);

        try {
            const uploaded = await uploadInventoryBatchBillApi(file);
            updateField("bill_image", uploaded.url);
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : "Failed to upload the bill."
            );
        } finally {
            setIsUploading(false);
        }
    };

    // The bill total the API stores: quantity × unit cost, plus GST. Left blank
    // (and omitted from the payload) until both a quantity and a cost exist,
    // so the server can compute it instead.
    const quantity = Number(formData.initial_quantity);
    const unitCost = Number(formData.unit_cost);
    const gstPercent = Number(formData.gst);
    const grandTotal =
        formData.initial_quantity.trim() !== "" &&
        formData.unit_cost.trim() !== "" &&
        Number.isFinite(quantity) &&
        Number.isFinite(unitCost)
            ? Math.round(
                  quantity *
                      unitCost *
                      (1 + (Number.isFinite(gstPercent) ? gstPercent : 0) / 100) *
                      100
              ) / 100
            : null;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!formData.batch_number.trim() || formData.initial_quantity === "") {
            setError("Batch number and initial quantity are required.");
            return;
        }

        if (
            formData.expiry_date !== "" &&
            formData.received_date !== "" &&
            formData.expiry_date < formData.received_date
        ) {
            setError("Expiry date cannot be before the received date.");
            return;
        }

        if (
            Number(formData.initial_quantity) < 0 ||
            (formData.current_quantity !== "" &&
                Number(formData.current_quantity) < 0) ||
            (formData.unit_cost !== "" && Number(formData.unit_cost) < 0) ||
            (formData.gst !== "" &&
                (Number(formData.gst) < 0 || Number(formData.gst) > 100))
        ) {
            setError(
                "Quantities and unit cost cannot be negative, and GST must be between 0 and 100."
            );
            return;
        }

        if (
            formData.current_quantity !== "" &&
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
            await onSubmit(formData);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Failed to add batch."
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

                        {/* Unit cost + GST */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                            <div>
                                <label
                                    htmlFor="batch-gst"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    GST
                                </label>

                                <div className="relative">
                                    <input
                                        id="batch-gst"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={formData.gst}
                                        onChange={(event) =>
                                            updateField(
                                                "gst",
                                                event.target.value
                                            )
                                        }
                                        placeholder="e.g. 5"
                                        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                    />

                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                        %
                                    </span>
                                </div>

                                <p className="mt-1 text-[9px] text-slate-400">
                                    {defaultGst !== undefined
                                        ? `Prefilled from the item's default GST (${defaultGst}%).`
                                        : "GST percentage applied to this batch."}
                                </p>
                            </div>
                        </div>

                        {/* Grand total + bill */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Grand Total (after GST)
                                </span>

                                <div className="flex min-h-[42px] items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                                    {grandTotal !== null ? (
                                        <span className="font-semibold text-slate-800">
                                            ₹
                                            {grandTotal.toLocaleString(
                                                "en-IN",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                }
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">
                                            Enter quantity and unit cost
                                        </span>
                                    )}
                                </div>

                                <p className="mt-1 text-[9px] text-slate-400">
                                    Quantity × unit cost + GST. Left blank the
                                    server computes it.
                                </p>
                            </div>

                            <div>
                                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Bill
                                </span>

                                {formData.bill_image ? (
                                    <div className="flex min-h-[42px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">
                                        <a
                                            href={formData.bill_image}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="truncate font-medium text-amber-700 underline-offset-2 hover:underline"
                                        >
                                            View uploaded bill
                                        </a>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateField("bill_image", "")
                                            }
                                            className="shrink-0 text-slate-400 transition hover:text-red-500"
                                            aria-label="Remove bill"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 transition hover:border-amber-400 hover:text-amber-700">
                                        {isUploading
                                            ? "Uploading…"
                                            : "Upload bill image"}
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            disabled={isUploading}
                                            onChange={(event) => {
                                                handleBillUpload(
                                                    event.target.files?.[0]
                                                );
                                                event.target.value = "";
                                            }}
                                        />
                                    </label>
                                )}

                                <p className="mt-1 text-[9px] text-slate-400">
                                    Optional — the uploaded URL is saved as the
                                    batch bill.
                                </p>
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

                            {isSubmitting ? "Saving..." : "Add Batch"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
