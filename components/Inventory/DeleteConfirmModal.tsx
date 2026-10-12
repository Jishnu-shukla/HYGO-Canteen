"use client";

import { useState } from "react";

interface DeleteConfirmModalProps {
    title: string;
    message: string;
    /** Label for the destructive action. Defaults to "Delete". */
    confirmLabel?: string;
    onCancel: () => void;
    onConfirm: () => void | Promise<void>;
}

export default function DeleteConfirmModal({
    title,
    message,
    confirmLabel = "Delete",
    onCancel,
    onConfirm,
}: DeleteConfirmModalProps) {
    const [error, setError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        setIsDeleting(true);

        try {
            await onConfirm();
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : "Failed to delete. Please try again."
            );
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isDeleting) {
                    onCancel();
                }
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-confirm-title"
                className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                <div className="px-5 py-5">
                    <h2
                        id="delete-confirm-title"
                        className="text-base font-semibold text-slate-800"
                    >
                        {title}
                    </h2>

                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        {message}
                    </p>

                    {error && (
                        <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDeleting && (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        )}

                        {isDeleting ? "Deleting..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
