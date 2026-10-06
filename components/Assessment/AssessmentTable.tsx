import { AT_RISK_THRESHOLD } from "@/data/Assessment/type";
import type { AssessmentListItem, AssessmentPagination } from "@/data/Assessment/type";
import { TriangleAlert } from "lucide-react";

const DASH = "—";

const headCell =
    "whitespace-nowrap px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700";
const bodyCell = "px-2 py-2 text-[11px] text-slate-600";

/**
 * Percentage widths for `table-fixed`. Assessment, Patient and Date are
 * fixed-ish; Notes absorbs the remainder and truncates rather than wrap, since
 * clinician free text is the only field of unbounded length here.
 */
const COL_WIDTHS = [
    "12%", // Assessment
    "15%", // Patient
    "11%", // Date
    "7%", // BMI
    "9%", // NRS
    "9%", // Calories
    "11%", // Route
    "25%", // Notes
];

const HEADINGS = [
    "Assessment",
    "Patient",
    "Date",
    "BMI",
    "NRS",
    "Calories",
    "Route",
    "Notes",
];

/**
 * Partitions a score into the same three groups the summary card counts: 3+ at
 * risk, 0-2 low risk, and null for a patient who was never scored. The null
 * case is its own group rather than being folded in with low risk, because
 * "not screened" and "screened and fine" are opposite conclusions.
 */
function riskGroup(score: number | null) {
    if (score === null) return "unscored" as const;

    return score >= AT_RISK_THRESHOLD ? ("at-risk" as const) : ("low" as const);
}

type RiskFilter = "all" | ReturnType<typeof riskGroup>;

const RISK_FILTERS: { value: RiskFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "at-risk", label: `At risk (${AT_RISK_THRESHOLD}+)` },
    { value: "low", label: "Low risk (0\u20132)" },
    { value: "unscored", label: "Not scored" },
];

const RISK_BADGE: Record<Exclude<RiskFilter, "all">, string> = {
    "at-risk": "bg-red-100 text-red-700",
    low: "bg-emerald-50 text-emerald-700",
    unscored: "bg-slate-100 text-slate-500",
};

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

/**
 * Null and zero are different claims on every one of these fields — no BMI
 * recorded versus a measured zero — so null always renders as a dash and is
 * never collapsed by a falsy check.
 */
function formatBmi(value: number | null) {
    return value === null ? DASH : value.toFixed(2);
}

function formatScore(value: number | null) {
    return value === null ? DASH : String(value);
}

function formatCalories(value: number | null) {
    return value === null ? DASH : value.toLocaleString();
}

export function AssessmentTable({
    assessments,
    loading = false,
    pagination,
    riskFilter = "all",
    onRiskFilterChange,
    onPageChange,
}: {
    assessments: AssessmentListItem[];
    loading?: boolean;
    pagination?: AssessmentPagination;
    /** Client-side filter. Scoped to the loaded page — see the notice below. */
    riskFilter?: RiskFilter;
    onRiskFilterChange?: (value: RiskFilter) => void;
    onPageChange?: (page: number) => void;
}) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 0;
    const totalPages = pagination?.total_pages ?? 1;
    const total = pagination?.total ?? assessments.length;

    const isFirstPage = page <= 1;
    const isLastPage = page >= totalPages;

    // Row range for the "showing X–Y of Z" line.
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = from === 0 ? 0 : from + assessments.length - 1;

    // The server takes no filter parameters, so filtering can only ever see the
    // rows already loaded. `isPartial` drives the warning that admits this.
    const isFiltered = riskFilter !== "all";
    const visibleRows = isFiltered
        ? assessments.filter((row) => riskGroup(row.nutritional_risk_score) === riskFilter)
        : assessments;

    // More than one page means the filter is looking at a slice, not the set.
    const isPartial = isFiltered && !loading && totalPages > 1;

    return (
        <section className="mt-5 px-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Nutritional Assessments
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Newest assessment first, across all patients
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* At risk is the one question worth narrowing on, so the
                        chips split the set the same three ways the summary
                        card counts it. */}
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                        {RISK_FILTERS.map((option) => (
                            <FilterChip
                                key={option.value}
                                active={riskFilter === option.value}
                                onClick={() => onRiskFilterChange?.(option.value)}
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
                        {COL_WIDTHS.map((width, index) => (
                            <col key={index} style={{ width }} />
                        ))}
                    </colgroup>

                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {HEADINGS.map((heading) => (
                                <th key={heading} scope="col" className={headCell}>
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
                                    Loading assessments...
                                </td>
                            </tr>
                        ) : assessments.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={COL_WIDTHS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No assessments yet.
                                </td>
                            </tr>
                        ) : visibleRows.length === 0 ? (
                            // Reachable only while a filter is active: the
                            // unfiltered branch above catches an empty page.
                            <tr>
                                <td
                                    colSpan={COL_WIDTHS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No records on this page match this filter.
                                </td>
                            </tr>
                        ) : (
                            visibleRows.map((row) => {
                                const group = riskGroup(
                                    row.nutritional_risk_score
                                );

                                return (
                                    <tr
                                        key={row.assessment_id}
                                        className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                                    >
                                        <td
                                            className={`${bodyCell} truncate font-semibold text-slate-700`}
                                            title={row.assessment_id}
                                        >
                                            {row.assessment_id || DASH}
                                        </td>

                                        <td className={bodyCell}>
                                            <p
                                                title={row.patient_name}
                                                className="truncate font-semibold text-slate-800"
                                            >
                                                {row.patient_name || "Unknown"}
                                            </p>

                                            <p
                                                title={row.uhid}
                                                className="truncate text-[10px] text-slate-400"
                                            >
                                                {row.uhid || DASH}
                                            </p>
                                        </td>

                                        <td
                                            className={`${bodyCell} whitespace-nowrap`}
                                        >
                                            {formatDate(row.assessment_date)}
                                        </td>

                                        <td
                                            className={`${bodyCell} truncate`}
                                            title={
                                                row.bmi === null
                                                    ? "Not recorded"
                                                    : String(row.bmi)
                                            }
                                        >
                                            {formatBmi(row.bmi)}
                                        </td>

                                        <td className={bodyCell}>
                                            {/* Score is what decides the
                                                threshold above, so it is the
                                                cell carrying the colour. */}
                                            <span
                                                title={
                                                    row.nutritional_risk_score ===
                                                    null
                                                        ? "Never scored"
                                                        : `NRS-2002 ${row.nutritional_risk_score}`
                                                }
                                                className={`block truncate rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold ${
                                                    RISK_BADGE[group]
                                                }`}
                                            >
                                                {formatScore(
                                                    row.nutritional_risk_score
                                                )}
                                            </span>
                                        </td>

                                        <td
                                            className={`${bodyCell} whitespace-nowrap`}
                                            title={
                                                row.daily_caloric_target_kcal ===
                                                null
                                                    ? "Not recorded"
                                                    : `${row.daily_caloric_target_kcal} kcal`
                                            }
                                        >
                                            {formatCalories(
                                                row.daily_caloric_target_kcal
                                            )}
                                        </td>

                                        <td className={bodyCell}>
                                            <span
                                                title={row.route_of_feeding}
                                                className="block truncate rounded-full bg-slate-100 px-1.5 py-0.5 text-center text-[9px] font-bold text-slate-700"
                                            >
                                                {row.route_of_feeding}
                                            </span>
                                        </td>

                                        {/* Free text of unbounded length, so it
                                            truncates and keeps the full value
                                            on hover rather than growing the
                                            row. */}
                                        <td
                                            className={`${bodyCell} truncate italic`}
                                            title={row.clinical_notes}
                                        >
                                            {row.clinical_notes || DASH}
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
                    Filtering these {assessments.length} rows on page {page} only —
                    the server returns every record together.
                </p>
            )}

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