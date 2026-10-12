"use client";

import { useState } from "react";
import { InventoryTableItem, UpdateInventoryFields } from "@/data/Inventory/type";

const CATEGORIES = [
    "Dry_Goods",
    "Produce",
    "Dairy",
    "Medical_Nutrition",
    "Beverages",
    "Cleaning",
];

const UNITS = ["g", "kg", "ml", "l", "unit"];

export interface EditItemFormData {
    item_name: string;
    category: string;
    unit_of_measure: string;
    stock_type: "stock_pre_usage" | "stock_post_usage";
    threshold_quantity: string;
    storage_location: string;
}

interface EditItemModalProps {
    item: InventoryTableItem;
    onClose: () => void;
    onSubmit: (data: UpdateInventoryFields) => void | Promise<void>;
}

export default function EditItemModal({
    item,
    onClose,
    onSubmit,
}: EditItemModalProps) {
    const [formData, setFormData] = useState<EditItemFormData>(() => ({
        item_name: item.item_name ?? "",
        category: item.category ?? "",
        unit_of_measure: item.unit_of_measure ?? "",
        stock_type: item.stock_type ?? "stock_pre_usage",
        threshold_quantity: String(item.threshold_quantity ?? ""),
        storage_location: item.storage_location ?? "",
    }));

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateField = (field: keyof EditItemFormData, value: string) => {
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
            !formData.item_name.trim() ||
            !formData.category ||
            !formData.unit_of_measure ||
            !formData.threshold_quantity ||
            !formData.storage_location.trim()
        ) {
            setError("Please fill in all required fields.");
            return;
        }

        if (Number(formData.threshold_quantity) < 0) {
            setError("Threshold quantity cannot be negative.");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload: UpdateInventoryFields = {
                item_name: formData.item_name.trim(),
                category: formData.category,
                unit_of_measure: formData.unit_of_measure,
                threshold_quantity: Number(formData.threshold_quantity),
                storage_location: formData.storage_location.trim(),
            };

            // Only touch the stock-tracking booleans when the user actually
            // changed them, so unrelated edits don't flip schema flags.
            if (formData.stock_type !== item.stock_type) {
                payload.stock_pre_usage =
                    formData.stock_type === "stock_pre_usage";
                payload.stock_post_usage =
                    formData.stock_type === "stock_post_usage";
            }

            await onSubmit(payload);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Failed to update inventory item."
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
                aria-labelledby="edit-item-title"
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 bg-blue-50/60 px-5 py-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Kitchen Inventory
                        </p>

                        <h2
                            id="edit-item-title"
                            className="mt-1 text-lg font-semibold text-slate-800"
                        >
                            Edit Inventory Item
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Update the details for {item.item_name}.
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
                        {/* Item name */}
                        <div>
                            <label
                                htmlFor="edit-item-name"
                                className="mb-1.5 block text-xs font-semibold text-slate-700"
                            >
                                Item Name
                            </label>

                            <input
                                id="edit-item-name"
                                type="text"
                                value={formData.item_name}
                                onChange={(event) =>
                                    updateField("item_name", event.target.value)
                                }
                                placeholder="e.g. Basmati Rice"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                            />
                        </div>

                        {/* Category + Unit */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="edit-item-category"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Category
                                </label>

                                <select
                                    id="edit-item-category"
                                    value={formData.category}
                                    onChange={(event) =>
                                        updateField(
                                            "category",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                >
                                    <option value="">Select category</option>

                                    {CATEGORIES.map((category) => (
                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-item-unit"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Unit of Measure
                                </label>

                                <select
                                    id="edit-item-unit"
                                    value={formData.unit_of_measure}
                                    onChange={(event) =>
                                        updateField(
                                            "unit_of_measure",
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                >
                                    <option value="">Select unit</option>

                                    {UNITS.map((unit) => (
                                        <option key={unit} value={unit}>
                                            {unit}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Stock type */}
                        <div>
                            <p className="mb-2 text-xs font-semibold text-slate-700">
                                Stock Tracking
                            </p>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <label
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition ${
                                        formData.stock_type ===
                                        "stock_pre_usage"
                                            ? "border-amber-500 bg-amber-50"
                                            : "border-slate-200 bg-white hover:bg-slate-50"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="edit-stock-type"
                                        value="stock_pre_usage"
                                        checked={
                                            formData.stock_type ===
                                            "stock_pre_usage"
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                "stock_type",
                                                event.target.value
                                            )
                                        }
                                        className="accent-amber-600"
                                    />

                                    <span className="block text-xs font-semibold text-slate-700">
                                        Stock Pre Usage
                                    </span>
                                </label>

                                <label
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition ${
                                        formData.stock_type ===
                                        "stock_post_usage"
                                            ? "border-amber-500 bg-amber-50"
                                            : "border-slate-200 bg-white hover:bg-slate-50"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="edit-stock-type"
                                        value="stock_post_usage"
                                        checked={
                                            formData.stock_type ===
                                            "stock_post_usage"
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                "stock_type",
                                                event.target.value
                                            )
                                        }
                                        className="accent-amber-600"
                                    />

                                    <span className="block text-xs font-semibold text-slate-700">
                                        Stock Post Usage
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Threshold + Storage */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="edit-threshold-quantity"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Threshold Quantity
                                </label>

                                <input
                                    id="edit-threshold-quantity"
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={formData.threshold_quantity}
                                    onChange={(event) =>
                                        updateField(
                                            "threshold_quantity",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. 25"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-storage-location"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Storage Location
                                </label>

                                <input
                                    id="edit-storage-location"
                                    type="text"
                                    value={formData.storage_location}
                                    onChange={(event) =>
                                        updateField(
                                            "storage_location",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. Dry Store A"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
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
