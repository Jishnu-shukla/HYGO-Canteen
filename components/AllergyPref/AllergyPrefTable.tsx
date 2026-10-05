import { ALLERGY_SEVERITY } from "@/data/AllergyPref/type";
import type {
    AllergyPrefListItem,
    AllergyPrefPagination,
    AllergySeverity,
} from "@/data/AllergyPref/type";
import { TriangleAlert } from "lucide-react";
import {
    SEVERITY_BADGE,
    SEVERITY_LABEL,
    UNKNOWN_SEVERITY_BADGE,
} from "./allergyPrefLabels";

const DASH = "—";

const headCell =
    "whitespace-nowrap px-5 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700";
const bodyCell = "px-5 py-2 text-[11px] text-slate-600";

/**
 * Percentage widths for `table-fixed`. Severity is sized for the longest badge
 * ("Severe (Anaphylaxis)"); the two clinical text columns take the rest and
 * truncate rather than wrap.
 */
const COL_WIDTHS = [
    "10%", // Preference
    "24%", // Patient
    "14%", // Allergy
    "12%", // Intolerance
    "14%", // Severity
    "13%", // Restriction
];

const HEADINGS = [
    "Preference",
    "Patient",
    "Allergy",
    "Intolerance",
    "Severity",
    "Restriction",
];

export function AllergyPrefTable({
    prefs,
    loading = false,
    pagination,
    severityFilter = "all",
    onSeverityFilterChange,
    onPageChange,
}: {
    prefs: AllergyPrefListItem[];
    loading?: boolean;
    pagination?: AllergyPrefPagination;
    /** Client-side filter. Scoped to the loaded page — see the notice below. */
    severityFilter?: AllergySeverity | "all";
    onSeverityFilterChange?: (value: AllergySeverity | "all") => void;
    onPageChange?: (page: number) => void;
}) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 0;
    const totalPages = pagination?.total_pages ?? 1;
    const total = pagination?.total ?? prefs.length;

    const isFirstPage = page <= 1;
    const isLastPage = page >= totalPages;

    // Row range for the "showing X–Y of Z" line.
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = from === 0 ? 0 : from + prefs.length - 1;

    // The server takes no filter parameters, so filtering can only ever see the
    // rows already loaded. `isPartial` drives the warning that admits this.
    const isFiltered = severityFilter !== "all";
    const visibleRows = isFiltered
        ? prefs.filter((row) => row.severity === severityFilter)
        : prefs;

    // More than one page means the filter is looking at a slice, not the set.
    const isPartial = isFiltered && !loading && totalPages > 1;

    return (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Allergy Preferences
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Newest record first, across every patient
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Severity is the one dimension worth narrowing on: it is
                        how a clinician decides what needs acting on first. */}
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                        <FilterChip
                            active={severityFilter === "all"}
                            onClick={() => onSeverityFilterChange?.("all")}
                        >
                            All
                        </FilterChip>

                        {ALLERGY_SEVERITY.map((option) => (
                            <FilterChip
                                key={option}
                                active={severityFilter === option}
                                onClick={() =>
                                    onSeverityFilterChange?.(option)
                                }
                            >
                                {SEVERITY_LABEL[option]}
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
                        {COL_WIDTHS.map((width) => (
                            <col key={`${width}-${Math.random()}`} style={{ width }} />
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
                                    Loading preferences...
                                </td>
                            </tr>
                        ) : prefs.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={COL_WIDTHS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No allergy preferences yet.
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
                                    No records on this page match this
                                    severity.
                                </td>
                            </tr>
                        ) : (
                            visibleRows.map((pref) => {
                                const severity = pref.severity as AllergySeverity;

                                // Both clinical fields blank is an affirmed
                                // "no known allergies" stub, not missing data —
                                // worth saying in words rather than two dashes.
                                const isAffirmedClear =
                                    pref.allergies === "" &&
                                    pref.intolerances === "";

                                return (
                                    <tr
                                        key={pref.allergy_preference_id}
                                        className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70"
                                    >
                                        <td
                                            className={`${bodyCell} truncate font-semibold text-slate-700`}
                                            title={pref.allergy_preference_id}
                                        >
                                            {pref.allergy_preference_id || DASH}
                                        </td>

                                        <td className={bodyCell}>
                                            <p
                                                title={pref.patient_name}
                                                className="truncate font-semibold text-slate-800"
                                            >
                                                {pref.patient_name || "Unknown"}
                                            </p>

                                            <p
                                                title={pref.uhid}
                                                className="truncate text-[10px] text-slate-400"
                                            >
                                                {pref.uhid || DASH}
                                            </p>
                                        </td>

                                        <td
                                            className={`${bodyCell} truncate`}
                                            title={pref.allergies}
                                        >
                                            {pref.allergies ? (
                                                pref.allergies
                                            ) : isAffirmedClear ? (
                                                <span className="italic text-slate-400">
                                                    None recorded
                                                </span>
                                            ) : (
                                                DASH
                                            )}
                                        </td>

                                        <td
                                            className={`${bodyCell} truncate`}
                                            title={pref.intolerances}
                                        >
                                            {pref.intolerances || DASH}
                                        </td>

                                        <td className={bodyCell}>
                                            {/* The one field that escalates with
                                                urgency, so the badge carries
                                                colour rather than just text. */}
                                            <span
                                                title={pref.severity}
                                                className={`block truncate rounded-3xl px-1.5 py-0.5 text-center text-[11px] font-bold ${
                                                    SEVERITY_BADGE[severity] ??
                                                    UNKNOWN_SEVERITY_BADGE
                                                }`}
                                            >
                                                {SEVERITY_LABEL[severity] ??
                                                    pref.severity}
                                            </span>
                                        </td>

                                        {/* Rendered as the raw string: the live
                                            data contains "Non-Vegetarian",
                                            which is outside the declared
                                            union, so a label lookup would
                                            come back undefined. */}
                                        <td
                                            className={`${bodyCell} truncate`}
                                            title={pref.religious_dietary_restrictions}
                                        >
                                            {pref.religious_dietary_restrictions ||
                                                DASH}
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
                    Filtering these {prefs.length} rows on page {page} only —
                    the server returns all severities together.
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