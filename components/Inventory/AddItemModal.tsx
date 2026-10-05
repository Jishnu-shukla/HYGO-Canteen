"use client";

import { Dispatch, useState } from "react";

const CATEGORIES = [
    "Dry_Goods",
    "Produce",
    "Dairy",
    "Medical_Nutrition",
    "Beverages",
    "Cleaning",
];

const UNITS = ["g", "kg", "ml", "l", "unit"];

export interface AddItemFormData {
    item_name: string;
    category: string;
    unit_of_measure: string;
    stock_type: "stock_pre_usage" | "stock_post_usage";
    threshold_quantity: string;
    storage_location: string;
}

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNext: (data: AddItemFormData) => void;
}

export default function AddItemModal({
    isOpen,
    onClose,
    onNext,
}: AddItemModalProps) {
    const [formData, setFormData] = useState<AddItemFormData>({
        item_name: "",
        category: "",
        unit_of_measure: "",
        stock_type: "stock_pre_usage",
        threshold_quantity: "",
        storage_location: "",
    });

    const [error, setError] = useState("");

    if (!isOpen) return null;

    const updateField = (
        field: keyof AddItemFormData,
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

        onNext(formData);
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
                aria-labelledby="add-item-title"
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 bg-blue-50/60 px-5 py-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Kitchen Inventory
                        </p>

                        <h2
                            id="add-item-title"
                            className="mt-1 text-lg font-semibold text-slate-800"
                        >
                            Add Inventory Item
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Enter item details before adding its first batch.
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
                        {/* Item name */}
                        <div>
                            <label
                                htmlFor="item-name"
                                className="mb-1.5 block text-xs font-semibold text-slate-700"
                            >
                                Item Name
                            </label>

                            <input
                                id="item-name"
                                type="text"
                                value={formData.item_name}
                                onChange={(event) =>
                                    updateField(
                                        "item_name",
                                        event.target.value
                                    )
                                }
                                placeholder="e.g. Basmati Rice"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                            />
                        </div>

                        {/* Category + Unit */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="item-category"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Category
                                </label>

                                <select
                                    id="item-category"
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
                                    htmlFor="item-unit"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Unit of Measure
                                </label>

                                <select
                                    id="item-unit"
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
                                        name="stock_type"
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

                                    <span>
                                        <span className="block text-xs font-semibold text-slate-700">
                                            Stock Pre Usage
                                        </span>
                                        <span className="block text-[10px] text-slate-400">
                                            Default
                                        </span>
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
                                        name="stock_type"
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

                                    <span>
                                        <span className="block text-xs font-semibold text-slate-700">
                                            Stock Post Usage
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Threshold + Storage */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="threshold-quantity"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Threshold Quantity
                                </label>

                                <input
                                    id="threshold-quantity"
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
                                    htmlFor="storage-location"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Storage Location
                                </label>

                                <input
                                    id="storage-location"
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
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
                        >
                            Next
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}