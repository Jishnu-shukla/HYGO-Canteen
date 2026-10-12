"use client";

import { LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";

/**
 * Confirmation gate for permanently deleting a plan. Unlike disabling, a
 * delete removes the row outright and cannot be undone, so the copy and the
 * red treatment say "delete", not "retire".
 *
 * `onConfirm` should reject on failure; the reason is surfaced here and the
 * dialog stays open so the action can be retried.
 */
export default function DeletePlanConfirmModal({
    planId,
    patientName,
    onCancel,
    onConfirm,
}: {
    planId: string;
    patientName?: string;
    onCancel: () => void;
    onConfirm: () => void | Promise<void>;
}) {
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
                    : "Failed to delete the plan. Please try again."
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
                aria-labelledby="delete-plan-confirm-title"
                className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                <div className="px-5 py-5">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <TriangleAlert size={18} />
                        </span>

                        <div className="min-w-0">
                            <h2
                                id="delete-plan-confirm-title"
                                className="text-base font-semibold text-slate-800"
                            >
                                Delete diet plan?
                            </h2>

                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                Plan{" "}
                                <span className="font-semibold text-slate-700">
                                    {planId}
                                </span>
                                {patientName ? ` for ${patientName}` : ""} will
                                be permanently removed. This action cannot be
                                undone. To retire it instead, use Disable.
                            </p>
                        </div>
                    </div>

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
                        {isDeleting ? (
                            <>
                                <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 size={14} />
                                Delete Plan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
