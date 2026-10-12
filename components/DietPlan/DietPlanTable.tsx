import type {
    DietPlanListItem,
    DietPlanPagination,
    DietPlanStatus,
} from "@/data/DietPlan/type";
import { Ban, Pencil, RotateCcw, Trash2 } from "lucide-react";
import {
    CONSISTENCY_LABEL,
    DIET_TYPE_LABEL,
    PHASE_LABEL,
    PLAN_STATUS_BADGE,
    PLAN_STATUS_LABEL,
    TEXTURE_LABEL,
    UNKNOWN_STATUS_BADGE,
    planPhase,
} from "./dietPlanLabels";

const DASH = "—";

const headCell =
    "whitespace-nowrap px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700";
const bodyCell = "px-2 py-2 text-[11px] text-slate-600";

/**
 * Percentage widths for `table-fixed` so the layout never exceeds the
 * container. Plan and Period stay fixed-ish; Patient absorbs the most room
 * because names are the longest value here.
 */
const COL_WIDTHS = [
    "13%", // Plan
    "15%", // Patient
    "12%", // Diet type
    "11%", // Texture
    "13%", // Liquids
    "15%", // Period
    "9%", // Status
    "12%", // Actions
];

const HEADINGS = [
    "Plan",
    "Patient",
    "Diet type",
    "Texture",
    "Liquids",
    "Period",
    "Status",
    "Actions",
];

/** "2026-10-02T00:00:00.000Z" -> "02 Oct 2026". Falls back to the raw string. */
function formatDate(value: string) {
    if (!value) return DASH;

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

/** Rounded chip for the short enum columns, so they scan down the row. */
function Chip({
    value,
    className = " text-slate-700",
    title,
}: {
    value: string;
    className?: string;
    title?: string;
}) {
    return (
        <span
            title={title}
            className={`block truncate rounded-full px-1.5 py-0.5 w-fit text-center text-[11px] font-bold ${className}`}
        >
            {value}
        </span>
    );
}

export function DietPlanTable({
    plans,
    loading = false,
    pagination,
    onPageChange,
    onEdit,
    onToggleStatus,
    onDelete,
}: {
    plans: DietPlanListItem[];
    loading?: boolean;
    pagination?: DietPlanPagination;
    onPageChange?: (page: number) => void;
    /** Opens the edit modal for a plan. */
    onEdit?: (plan: DietPlanListItem) => void;
    /** Asks for confirmation before flipping a plan between Active and Disable. */
    onToggleStatus?: (plan: DietPlanListItem) => void;
    /** Asks for confirmation before permanently deleting a plan. */
    onDelete?: (plan: DietPlanListItem) => void;
}) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 0;
    const totalPages = pagination?.total_pages ?? 1;
    const total = pagination?.total ?? plans.length;

    const isFirstPage = page <= 1;
    const isLastPage = page >= totalPages;

    // Row range for the "showing X–Y of Z" line.
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = from === 0 ? 0 : from + plans.length - 1;

    return (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Diet Plans
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Newest plan first, across every status
                    </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {loading ? "-" : total} PLANS
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                    <colgroup>
                        {COL_WIDTHS.map((width, index) => (
                            <col key={index} style={{ width }} />
                        ))}
                    </colgroup>

                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {HEADINGS.map((heading) => (
                                <th
                                    key={heading}
                                    scope="col"
                                    className={`${headCell} ${
                                        heading === "Actions"
                                            ? "text-right"
                                            : ""
                                    }`}
                                >
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={COL_WIDTHS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    Loading plans...
                                </td>
                            </tr>
                        ) : plans.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={COL_WIDTHS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No diet plans yet.
                                </td>
                            </tr>
                        ) : (
                            plans.map((plan) => {
                                const status = plan.status as DietPlanStatus;
                                const isDisabled = status === "Disable";
                                const phase = planPhase(
                                    plan.start_date,
                                    plan.end_date
                                );

                                return (
                                    <tr
                                        key={plan.diet_plan_id}
                                        className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                                    >
                                        <td
                                            className={`${bodyCell} truncate font-semibold text-slate-700`}
                                            title={plan.diet_plan_id}
                                        >
                                            {plan.diet_plan_id || DASH}
                                        </td>

                                        <td className={bodyCell}>
                                            <p
                                                title={plan.patient_name}
                                                className="truncate font-semibold text-slate-800"
                                            >
                                                {plan.patient_name || "Unknown"}
                                            </p>

                                            <p
                                                title={plan.uhid}
                                                className="truncate text-[10px] text-slate-400"
                                            >
                                                {plan.uhid || DASH}
                                            </p>
                                        </td>

                                        <td className={bodyCell}>
                                            <Chip
                                                value={
                                                    DIET_TYPE_LABEL[
                                                        plan.diet_type
                                                    ] ?? plan.diet_type
                                                }
                                                title={plan.diet_type}
                                            />
                                        </td>

                                        <td
                                            className={`${bodyCell} truncate`}
                                            title={plan.texture_modification}
                                        >
                                            {TEXTURE_LABEL[
                                                plan.texture_modification
                                            ] ?? plan.texture_modification}
                                        </td>

                                        <td
                                            className={`${bodyCell} truncate`}
                                            title={plan.consistencies_liquids}
                                        >
                                            {CONSISTENCY_LABEL[
                                                plan.consistencies_liquids
                                            ] ?? plan.consistencies_liquids}
                                        </td>

                                        <td className={bodyCell}>
                                            <p className="whitespace-nowrap">
                                                {formatDate(plan.start_date)}
                                            </p>

                                            <p className="whitespace-nowrap text-[10px] text-slate-400">
                                                {plan.end_date
                                                    ? `to ${formatDate(plan.end_date)}`
                                                    : "open-ended"}
                                            </p>
                                        </td>

                                        <td className={bodyCell}>
                                            <Chip
                                                value={
                                                    PLAN_STATUS_LABEL[status] ??
                                                    plan.status
                                                }
                                                className={
                                                    PLAN_STATUS_BADGE[status] ??
                                                    UNKNOWN_STATUS_BADGE
                                                }
                                                title={plan.status}
                                            />

                                            {/* Status alone does not say
                                                whether the dates are in
                                                range, so the phase is
                                                spelled out beneath it. A
                                                retired plan reads "Retired"
                                                rather than claiming to be in
                                                force. */}
                                            <p
                                                className={`truncate text-[9px] font-semibold ${
                                                    isDisabled ||
                                                    phase === "ended"
                                                        ? "text-slate-400"
                                                        : phase === "upcoming"
                                                          ? "text-amber-600"
                                                          : "text-emerald-600"
                                                }`}
                                            >
                                                {isDisabled
                                                    ? "Retired"
                                                    : PHASE_LABEL[phase]}
                                            </p>
                                        </td>

                                        <td className={bodyCell}>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onEdit?.(plan)
                                                    }
                                                    title={`Edit plan ${plan.diet_plan_id}`}
                                                    aria-label={`Edit plan ${plan.diet_plan_id}`}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50"
                                                >
                                                    <Pencil size={14} />
                                                </button>

                                                {/* One button flips the
                                                    status both ways: a live
                                                    plan is retired, a retired
                                                    one is served again. */}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onToggleStatus?.(plan)
                                                    }
                                                    title={
                                                        isDisabled
                                                            ? `Enable plan ${plan.diet_plan_id}`
                                                            : `Disable plan ${plan.diet_plan_id}`
                                                    }
                                                    aria-label={
                                                        isDisabled
                                                            ? `Enable plan ${plan.diet_plan_id}`
                                                            : `Disable plan ${plan.diet_plan_id}`
                                                    }
                                                    className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border bg-white transition ${
                                                        isDisabled
                                                            ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                            : "border-amber-200 text-amber-700 hover:bg-amber-50"
                                                    }`}
                                                >
                                                    {isDisabled ? (
                                                        <RotateCcw size={14} />
                                                    ) : (
                                                        <Ban size={14} />
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onDelete?.(plan)
                                                    }
                                                    title={`Delete plan ${plan.diet_plan_id}`}
                                                    aria-label={`Delete plan ${plan.diet_plan_id}`}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pager — server-side page change, table only */}
            {onPageChange && total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                    <p className="text-[11px] text-slate-500">
                        {loading
                            ? "Loading..."
                            : `Showing ${from}–${to} of ${total}`}
                    </p>

                    <div className="flex items-center gap-2">
                        <PagerButton
                            label="Previous"
                            disabled={loading || isFirstPage}
                            onClick={() => onPageChange(page - 1)}
                        />

                        <span className="min-w-[70px] text-center text-[11px] font-semibold text-slate-600">
                            Page {page} of {totalPages}
                        </span>

                        <PagerButton
                            label="Next"
                            disabled={loading || isLastPage}
                            onClick={() => onPageChange(page + 1)}
                        />
                    </div>
                </div>
            )}
        </section>
    );
}

function PagerButton({
    label,
    disabled,
    onClick,
}: {
    label: string;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
            {label}
        </button>
    );
}
