"use client";

import { MasterMenuItem } from "@/data/MasterMenu/type";
import { Check, LoaderCircle, X } from "lucide-react";
import { FormEvent, useState } from "react";

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                {label}
            </span>
            {children}
        </label>
    );
}

export default function EditMenuItemModal({
    item,
    onClose,
    onSave,
}: {
    item: MasterMenuItem;
    onClose: () => void;
    onSave: (item: MasterMenuItem, changes: { price: number; is_approved: boolean }) => Promise<void>;
}) {
    // The parent mounts this with key={master_item_id}, so opening a different
    // card remounts with fresh initial state. No sync-back effect is needed.
    const [price, setPrice] = useState(String(item.price));
    const [isApproved, setIsApproved] = useState(item.is_approved);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const priceNumber = Number(price);

    const isUnchanged =
        priceNumber === Number(item.price) && isApproved === item.is_approved;

    const isInvalid =
        price.trim() === "" || Number.isNaN(priceNumber) || priceNumber < 0;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isInvalid || isUnchanged || saving) return;

        try {
            setSaving(true);
            setError("");
            await onSave(item, { price: priceNumber, is_approved: isApproved });
            onClose();
        } catch (err) {
            console.error("Error updating master menu item:", err);
            setError("Could not save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={() => !saving && onClose()}
        >
            <div
                className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-slate-800">
                            Edit Menu Item
                        </h2>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                            {item.recipe_name}
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

                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    <Field label="Price (₹)">
                        <input
                            required
                            min="0"
                            step="0.01"
                            type="number"
                            value={price}
                            disabled={saving}
                            onChange={(event) => setPrice(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 disabled:opacity-60"
                        />
                    </Field>

                    <div>
                        <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                            Approval status
                        </span>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => setIsApproved(true)}
                                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                                    isApproved
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                Approved
                            </button>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => setIsApproved(false)}
                                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                                    !isApproved
                                        ? "border-amber-500 bg-amber-50 text-amber-700"
                                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                Pending
                            </button>
                        </div>

                        {isApproved !== item.is_approved && (
                            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500">
                                <Check size={13} className="mt-0.5 shrink-0 text-amber-600" />
                                {isApproved
                                    ? "Marks this item as approved for service."
                                    : "Sends this item back to pending approval."}
                            </p>
                        )}
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
                            disabled={isInvalid || isUnchanged || saving}
                            className="flex items-center gap-1.5 rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <LoaderCircle size={16} className="animate-spin" />
                                    Saving
                                </>
                            ) : (
                                "Save changes"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
