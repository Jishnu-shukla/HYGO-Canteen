import type { PatientListItem, PatientPagination } from "@/data/Patient/type";
import { TriangleAlert } from "lucide-react";

const DASH = "—";

type StatusFilter = "all" | "active" | "deleted";

const headCell =
    "whitespace-nowrap px-5 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700";
const bodyCell = "px-5 py-2 text-[11px] text-slate-600";

/**
 * Percentage widths for `table-fixed` so the layout never exceeds the
 * container. Name gets the widest share because it is the longest value;
 * age and gender are narrow enough to read at a glance.
 */
const COL_WIDTHS = [
    "20%", // UHID
    "26%", // Name
    "9%", // Age
    "13%", // Gender
    "14%", // Blood group
    "18%", // Status
];

const HEADINGS = [
    "UHID",
    "Name",
    "Age",
    "Gender",
    "Blood group",
    "Status",
];

export function PatientTable({
    patients,
    loading = false,
    pagination,
    statusFilter = "all",
    onStatusFilterChange,
    onPageChange,
    onRowClick,
}: {
    patients: PatientListItem[];
    loading?: boolean;
    pagination?: PatientPagination;
    /** Client-side filter. Scoped to the loaded page — see the notice below. */
    statusFilter?: StatusFilter;
    onStatusFilterChange?: (value: StatusFilter) => void;
    onPageChange?: (page: number) => void;
    /** Opens the patient's history. Makes the whole row clickable when set. */
    onRowClick?: (patient: PatientListItem) => void;
}) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 0;
    const totalPages = pagination?.total_pages ?? 1;
    const total = pagination?.total ?? patients.length;

    const isFirstPage = page <= 1;
    const isLastPage = page >= totalPages;

    // Row range for the "showing X–Y of Z" line.
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = from === 0 ? 0 : from + patients.length - 1;

    // The server takes no filter parameters, so filtering can only ever see the
    // rows already loaded. `isPartial` drives the warning that admits this.
    const visibleRows =
        statusFilter === "all"
            ? patients
            : patients.filter((patient) =>
                  statusFilter === "deleted"
                      ? patient.isDeleted
                      : !patient.isDeleted
              );

    // More than one page means the filter is looking at a slice, not the set.
    const isPartial = statusFilter !== "all" && !loading && totalPages > 1;

    return (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Patient Roster
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        By UHID ascending, including soft-deleted records
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Deleted rows are part of the contract, so the filter
                        exposes them rather than hiding them at the server. */}
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                        <FilterChip
                            active={statusFilter === "all"}
                            onClick={() => onStatusFilterChange?.("all")}
                        >
                            All
                        </FilterChip>

                        <FilterChip
                            active={statusFilter === "active"}
                            onClick={() => onStatusFilterChange?.("active")}
                        >
                            Active
                        </FilterChip>

                        <FilterChip
                            active={statusFilter === "deleted"}
                            onClick={() => onStatusFilterChange?.("deleted")}
                        >
                            Deleted
                        </FilterChip>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {loading ? "-" : total} PATIENTS
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
                                    Loading patients...
                                </td>
                            </tr>
                        ) : patients.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={COL_WIDTHS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No patients on the roster yet.
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
                                    No {statusFilter} patients on this page.
                                </td>
                            </tr>
                        ) : (
                            visibleRows.map((patient) => (
                                <tr
                                    key={patient.uhid}
                                    onClick={
                                        onRowClick
                                            ? () => onRowClick(patient)
                                            : undefined
                                    }
                                    title={
                                        onRowClick
                                            ? `View history for ${
                                                  patient.name || patient.uhid
                                              }`
                                            : undefined
                                    }
                                    className={`border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70 ${
                                        onRowClick ? "cursor-pointer" : ""
                                    }`}
                                >
                                    <td
                                        className={`${bodyCell} truncate font-semibold`}
                                        title={patient.uhid}
                                    >
                                        {/* A real button so the action is
                                            reachable by keyboard; the row
                                            click covers the rest of the
                                            surface for pointer users. */}
                                        {onRowClick ? (
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onRowClick(patient);
                                                }}
                                                aria-label={`View history for ${
                                                    patient.name || patient.uhid
                                                }`}
                                                className="block max-w-full truncate text-left text-amber-700 hover:underline focus:outline-none focus-visible:underline"
                                            >
                                                {patient.uhid || DASH}
                                            </button>
                                        ) : (
                                            <span className="text-slate-700">
                                                {patient.uhid || DASH}
                                            </span>
                                        )}
                                    </td>

                                    <td
                                        className={`${bodyCell} truncate font-semibold ${
                                            patient.isDeleted
                                                ? "text-slate-400"
                                                : "text-slate-800"
                                        }`}
                                        title={patient.name}
                                    >
                                        {patient.name || "Unknown"}
                                    </td>

                                    {/* age is null when dateOfBirth is missing;
                                        that is missing data, not age zero. */}
                                    <td
                                        className={bodyCell}
                                        title={
                                            patient.age === null
                                                ? "Date of birth not recorded"
                                                : `${patient.age} years`
                                        }
                                    >
                                        {patient.age === null ? DASH : patient.age}
                                    </td>

                                    <td
                                        className={`${bodyCell} truncate`}
                                        title={patient.gender}
                                    >
                                        {patient.gender || DASH}
                                    </td>

                                    <td
                                        className={`${bodyCell} truncate`}
                                        title={patient.bloodGroup}
                                    >
                                        {patient.bloodGroup || DASH}
                                    </td>

                                    <td className={bodyCell}>
                                        <span
                                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                                patient.isDeleted
                                                    ? "border-red-100 bg-red-50 text-red-600"
                                                    : "border-emerald-100 bg-emerald-50 text-emerald-700"
                                            }`}
                                        >
                                            {patient.isDeleted
                                                ? "Deleted"
                                                : "Active"}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isPartial && (
                <p className="flex items-center gap-1.5 border-t border-amber-100 bg-amber-50 px-4 py-2 text-[10px] font-medium text-amber-700">
                    <TriangleAlert size={12} />
                    Filtering these {patients.length} rows on page {page} only —
                    the server returns active and deleted patients together.
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

                        <span className="min-w-17.5 text-center text-[11px] font-semibold text-slate-600">
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
