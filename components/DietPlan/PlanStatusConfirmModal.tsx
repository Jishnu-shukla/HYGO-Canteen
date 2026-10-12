"use client";

import type { DietPlanStatus } from "@/data/DietPlan/type";
import {
    Ban,
    CheckCircle2,
    LoaderCircle,
    RotateCcw,
    TriangleAlert,
} from "lucide-react";
import { useState } from "react";

/**
 * Confirmation gate for flipping a plan between Active and Disable. Neither
 * direction deletes the plan — a disabled one stays on record, it just stops
 * being served — so the caller keeps the row on screen afterwards.
 *
 * The copy and treatment follow `nextStatus`: retiring reads amber and
 * cautionary, re-enabling reads green and restorative.
 *
 * `onConfirm` should reject on failure; the reason is surfaced here and the
 * dialog stays open so the action can be retried.
 */
export default function PlanStatusConfirmModal({
    planId,
    patientName,
    nextStatus,
    onCancel,
    onConfirm,
}: {
    planId: string;
    patientName?: string;
    /** Status the plan moves to when confirmed. */
    nextStatus: DietPlanStatus;
    onCancel: () => void;
    onConfirm: () => void | Promise<void>;
}) {
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const isEnabling = nextStatus === "Active";
    const subject = `Plan ${planId}${patientName ? ` for ${patientName}` : ""}`;

    const handleConfirm = async () => {
        setIsSaving(true);

        try {
            await onConfirm();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : `Failed to ${isEnabling ? "enable" : "disable"} the plan. Please try again.`
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isSaving) {
                    onCancel();
                }
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="plan-status-confirm-title"
                className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                <div className="px-5 py-5">
                    <div className="flex items-start gap-3">
                        <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                isEnabling
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-amber-50 text-amber-600"
                            }`}
                        >
                            {isEnabling ? (
                                <CheckCircle2 size={18} />
                            ) : (
                                <TriangleAlert size={18} />
                            )}
                        </span>

                        <div className="min-w-0">
                            <h2
                                id="plan-status-confirm-title"
                                className="text-base font-semibold text-slate-800"
                            >
                                {isEnabling
                                    ? "Enable diet plan?"
                                    : "Disable diet plan?"}
                            </h2>

                            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                <span className="font-semibold text-slate-700">
                                    {subject}
                                </span>{" "}
                                will{" "}
                                {isEnabling
                                    ? "be reactivated and served again. It stays on record."
                                    : "be retired and will stop being served. It stays on record and is not deleted."}
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
                        disabled={isSaving}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isSaving}
                        className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isEnabling
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-amber-600 hover:bg-amber-700"
                        }`}
                    >
                        {isSaving ? (
                            <>
                                <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                />
                                {isEnabling ? "Enabling..." : "Disabling..."}
                            </>
                        ) : (
                            <>
                                {isEnabling ? (
                                    <RotateCcw size={14} />
                                ) : (
                                    <Ban size={14} />
                                )}
                                {isEnabling ? "Enable Plan" : "Disable Plan"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
