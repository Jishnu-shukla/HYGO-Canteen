"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";

export default function MenuDeleteConfirm({
    label,
    onClose,
    onConfirm,
}: {
    label: string;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    const handleConfirm = async () => {
        if (deleting) return;

        try {
            setDeleting(true);
            setError("");
            await onConfirm();
            onClose();
        } catch (err) {
            console.error("Error deleting menu:", err);
            setError("Could not delete the menu. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={() => !deleting && onClose()}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-menu-title"
                className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                        <Trash2 size={19} />
                    </div>

                    <div className="min-w-0">
                        <h2
                            id="delete-menu-title"
                            className="text-base font-semibold text-slate-800"
                        >
                            Delete this menu?
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            This permanently removes the {label} menu. This
                            cannot be undone.
                        </p>
                    </div>
                </div>

                {error && (
                    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                        {error}
                    </p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={onClose}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={deleting}
                        onClick={handleConfirm}
                        className="flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {deleting ? (
                            <>
                                <LoaderCircle size={16} className="animate-spin" />
                                Deleting
                            </>
                        ) : (
                            "Delete menu"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
