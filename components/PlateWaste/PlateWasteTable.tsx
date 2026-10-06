import {
    LOW_INTAKE_THRESHOLD_PERCENTAGE,
} from "@/data/PlateWaste/type";
import type {
    GetPlateWaste,
    PlateWastePagination,
} from "@/data/PlateWaste/type";
import { TriangleAlert } from "lucide-react";

const DASH = "—";

const headCell =
    "whitespace-nowrap px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700";
const bodyCell = "px-2 py-2 text-[11px] text-slate-600";

/**
 * Column definitions for `table-fixed`, width and heading kept together so the
 * two can never drift apart. Rejection Reason absorbs the unbounded free-text
 * column and truncates rather than wrap; the rest are short values.
 */
const COLUMNS = [
    { heading: "Diet Type", width: "18%" },
    { heading: "Intake", width: "12%" },
    { heading: "Rejection Reason", width: "48%" },
    { heading: "Low Intake Patients", width: "22%" },
];

/** "78.125" -> "78.13%", "85" -> "85%". */
function formatIntake(value: number) {
    return `${Number(value.toFixed(2)).toString()}%`;
}

/**
 * The threshold rule is the one the server uses for low_intake and the
 * summary card, so a row's own intake is flagged with it rather than with a
 * locally-invented cut-off.
 */
function isLowIntake(value: number) {
    return value <= LOW_INTAKE_THRESHOLD_PERCENTAGE;
}

/** "All" plus the three ways a row can read: low, normal, or planless. */
type IntakeFilter = "all" | "low" | "ok";

const INTAKE_FILTERS: { value: IntakeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "low", label: `Low (\u2264${LOW_INTAKE_THRESHOLD_PERCENTAGE}%)` },
    { value: "ok", label: "OK" },
];

export function PlateWasteTable({
    logs,
    loading = false,
    pagination,
    intakeFilter = "all",
    onIntakeFilterChange,
    onPageChange,
}: {
    logs: GetPlateWaste[];
    loading?: boolean;
    pagination?: PlateWastePagination;
    /** Client-side filter. Scoped to the loaded page — see the notice below. */
    intakeFilter?: IntakeFilter;
    onIntakeFilterChange?: (value: IntakeFilter) => void;
    onPageChange?: (page: number) => void;
}) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 0;
    const totalPages = pagination?.total_pages ?? 1;
    const total = pagination?.total ?? logs.length;

    const isFirstPage = page <= 1;
    const isLastPage = page >= totalPages;

    // Row range for the "showing X–Y of Z" line.
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = from === 0 ? 0 : from + logs.length - 1;

    // The server takes no filter parameters, so filtering can only ever see
    // the rows already loaded. `isPartial` drives the warning that admits it.
    const isFiltered = intakeFilter !== "all";
    const visibleRows = isFiltered
        ? logs.filter((row) => {
              const low = isLowIntake(row.intake_percentage);
              return intakeFilter === "low" ? low : !low;
          })
        : logs;

    const isPartial = isFiltered && !loading && totalPages > 1;

    return (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Plate Waste Logs
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        One row per logged plate, newest first
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Low intake is the one question worth narrowing on, so
                        the chips split the set at the same threshold the
                        summary card counts. */}
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                        {INTAKE_FILTERS.map((option) => (
                            <FilterChip
                                key={option.value}
                                active={intakeFilter === option.value}
                                onClick={() =>
                                    onIntakeFilterChange?.(option.value)
                                }
                            >
                                {option.label}
                            </FilterChip>
                        ))}
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {loading ? "-" : total} RECORDS
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                    <colgroup>
                        {COLUMNS.map((column) => (
                            <col key={column.heading} style={{ width: column.width }} />
                        ))}
                    </colgroup>

                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {COLUMNS.map((column) => (
                                <th
                                    key={column.heading}
                                    scope="col"
                                    className={headCell}
                                >
                                    {column.heading}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={COLUMNS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    Loading plate waste logs...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={COLUMNS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No plate-waste logs yet.
                                </td>
                            </tr>
                        ) : visibleRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={COLUMNS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No records on this page match this filter.
                                </td>
                            </tr>
                        ) : (
                            visibleRows.map((row, index) => {
                                const low = isLowIntake(row.intake_percentage);

                                return (
                                    <tr
                                        // The projection carries no log id, so
                                        // the row's position in the page snapshot
                                        // is the only stable handle (same approach
                                        // as MealDispatchTable's keyed columns).
                                        key={index}
                                        className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                                    >
                                        <td className={bodyCell}>
                                            {row.diet_type ? (
                                                <span
                                                    title={`Newest diet plan: ${row.diet_type}`}
                                                    className="block truncate px-1.5 py-0.5 text-[11px] font-bold text-slate-700"
                                                >
                                                    {row.diet_type}
                                                </span>
                                            ) : (
                                                <span
                                                    title="Patient has no diet plan on file"
                                                    className="block truncate text-slate-400"
                                                >
                                                    {DASH}
                                                </span>
                                            )}
                                        </td>

                                        {/* Intake at or below the threshold
                                            is the alarm, so it is the cell
                                            carrying the colour. */}
                                        <td className={bodyCell}>
                                            <span
                                                title={
                                                    low
                                                        ? `At or below the ${LOW_INTAKE_THRESHOLD_PERCENTAGE}% threshold`
                                                        : "Intake across the tray"
                                                }
                                                className={`block truncate px-1.5 py-0.5 text-[11px] font-bold ${
                                                    low
                                                        ? "text-red-700"
                                                        : "text-emerald-700"
                                                }`}
                                            >
                                                {formatIntake(
                                                    row.intake_percentage
                                                )}
                                            </span>
                                        </td>

                                        {/* Free text of unbounded length, so it
                                            truncates and keeps the full value
                                            on hover rather than growing the
                                            row. Empty means the tray was
                                            finished. */}
                                        <td
                                            className={`${bodyCell} truncate italic text-[12px]`}
                                            title={
                                                row.rejection_reason
                                                    ? row.rejection_reason
                                                    : "Tray finished — no rejection recorded"
                                            }
                                        >
                                            {row.rejection_reason || DASH}
                                        </td>

                                        {/* Distinct low-intake patients in this
                                            row's diet type; repeated on every
                                            row of that diet type by contract. */}
                                        <td className={bodyCell}>
                                            <span
                                                title="Distinct patients at or below the threshold whose newest plan is this diet type"
                                                className={`block truncate rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                                                    row.low_intake > 0
                                                        ? "text-red-700"
                                                        : "text-slate-500"
                                                }`}
                                            >
                                                {row.low_intake}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {isPartial && (
                <p className="flex items-center gap-1.5 border-t border-amber-100 bg-amber-50 px-4 py-2 text-[10px] font-medium text-amber-700">
                    <TriangleAlert size={12} />
                    Filtering these {logs.length} rows on page {page} only — the
                    server returns every record together.
                </p>
            )}

            {/* Pager — server-side page change, table only on page-level */}
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

function FilterChip({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                active
                    ? "bg-white text-amber-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
            }`}
        >
            {children}
        </button>
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