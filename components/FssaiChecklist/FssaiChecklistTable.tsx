"use client";

import {
    updateFssaiChecklistStatusApi,
} from "@/data/FssaiChecklist/api";
import type {
    FssaiChecklistStatus,
    GetFssaichecklist,
    UpdateFssaiChecklistStatusResponse,
} from "@/data/FssaiChecklist/type";
import { Fragment, useState } from "react";

const DASH = "—";

const headCell =
    "whitespace-nowrap px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700";
const bodyCell = "px-2 py-2 text-[11px] text-slate-600";

/**
 * Percentage widths for `table-fixed`. The GET payload carries a single
 * free-text category per audit rather than one entry per check, so a row holds
 * the whole audit and Category is just one string.
 */
const COL_WIDTHS = [
    "12%", // Checklist ID
    "12%", // Audit Date
    "16%", // Category
    "13%", // Status
    "27%", // Notes
    "20%", // Actions
];

const HEADINGS = [
    "Checklist ID",
    "Audit Date",
    "Category",
    "Status",
    "Notes",
    "Actions",
];

/**
 * Last-resort render fallback: the schema default when a response ever omits
 * status. Rows arrive through an unchecked cast, and an undefined status
 * would crash the badge, so keep one default around.
 */
const DEFAULT_STATUS: FssaiChecklistStatus = "Passed";

/** Toggle advances the audit through the three review states, wrapping around. */
const NEXT_STATUS: Record<FssaiChecklistStatus, FssaiChecklistStatus> = {
    Passed: "Failed_Needs_Review",
    Failed_Needs_Review: "Resolved",
    Resolved: "Passed",
};

const STATUS_BADGE: Record<FssaiChecklistStatus, string> = {
    Passed: "bg-emerald-50 text-emerald-700",
    Failed_Needs_Review: "bg-amber-50 text-amber-700",
    Resolved: "bg-sky-50 text-sky-700",
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
 * Latest-audit list of FSSAI checklists, one row per audit. Two actions per
 * row, both through PUT /api/fssaichecklist/:checklist_id/toggle:
 * - Toggle: writes the next review status (Passed / Failed_Needs_Review /
 *   Resolved); notes are omitted, which leaves stored notes untouched.
 * - Add notes: writes corrective_actions_notes alongside the row's current
 *   status.
 *
 * Both writes answer with the whole updated checklist, so status and notes
 * re-render from the response without a second GET.
 */
export function FssaiChecklistTable({
    checklists,
    loading = false,
}: {
    checklists: GetFssaichecklist[];
    loading?: boolean;
}) {
    // Post-write review status per checklist, layered over row.status: row
    // props do not refresh themselves, so only a successful PUT lands here.
    const [statuses, setStatuses] = useState<
        Record<string, FssaiChecklistStatus>
    >({});

    // True while a Toggle PUT is in flight for that row (blocks double clicks).
    const [toggling, setToggling] = useState<Record<string, boolean>>({});

    // Saved corrective_actions_notes per checklist, layered over the row's
    // copy for the same reason. The draft lives in noteDraft while editing.
    const [notes, setNotes] = useState<Record<string, string>>({});

    // The row currently showing the inline notes editor, and its draft text.
    const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState("");

    const getStatus = (row: GetFssaichecklist) =>
        statuses[row.checklist_id] ?? row.status ?? DEFAULT_STATUS;

    const getNotes = (row: GetFssaichecklist) =>
        notes[row.checklist_id] ?? row.corrective_actions_notes;

    /** Adopt a write response — status and notes straight from the server. */
    function applyUpdatedRow(updated: UpdateFssaiChecklistStatusResponse) {
        setStatuses((previous) => ({
            ...previous,
            [updated.checklist_id]: updated.status,
        }));
        setNotes((previous) => ({
            ...previous,
            [updated.checklist_id]: updated.corrective_actions_notes,
        }));
    }

    async function handleToggle(row: GetFssaichecklist) {
        const next = NEXT_STATUS[getStatus(row)];

        setToggling((previous) => ({
            ...previous,
            [row.checklist_id]: true,
        }));

        // notes omitted on purpose: the service keeps whatever is stored.
        const updated = await updateFssaiChecklistStatusApi(
            row.checklist_id,
            { status: next }
        );

        if (updated) {
            applyUpdatedRow(updated);
        } else {
            console.log(`Toggle failed for ${row.checklist_id}`);
        }

        setToggling((previous) => ({
            ...previous,
            [row.checklist_id]: false,
        }));
    }

    function openNotesEditor(row: GetFssaichecklist) {
        setNoteDraft(getNotes(row));
        setEditingNotesId(row.checklist_id);
    }

    async function saveNotes(row: GetFssaichecklist) {
        // The current status rides along unchanged: the endpoint requires it,
        // and naming it keeps the write an explicit set rather than a flip.
        const updated = await updateFssaiChecklistStatusApi(
            row.checklist_id,
            { status: getStatus(row), notes: noteDraft }
        );

        if (updated) {
            applyUpdatedRow(updated);
            setEditingNotesId(null);
        } else {
            // Keep the editor open so the draft survives a failed write.
            console.log(`Saving notes failed for ${row.checklist_id}`);
        }
    }

    return (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        FSSAI Audits
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Newest audit first — status and notes refresh from
                        every write
                    </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {loading ? "-" : checklists.length} AUDITS
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
                                    className={headCell}
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
                                    Loading audits...
                                </td>
                            </tr>
                        ) : checklists.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={COL_WIDTHS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No audits filed yet.
                                </td>
                            </tr>
                        ) : (
                            checklists.map((row) => {
                                const status = getStatus(row);
                                const notesValue = getNotes(row);

                                return (
                                    <Fragment key={row.checklist_id}>
                                        <tr className="border-b border-slate-100 transition hover:bg-slate-50/70">
                                            <td
                                                className={`${bodyCell} truncate font-semibold text-slate-700`}
                                                title={row.checklist_id}
                                            >
                                                {row.checklist_id || DASH}
                                            </td>

                                            <td
                                                className={`${bodyCell} whitespace-nowrap`}
                                            >
                                                {formatDate(row.audit_date)}
                                            </td>

                                            <td
                                                className={`${bodyCell} truncate`}
                                                title={row.categories}
                                            >
                                                {row.categories || DASH}
                                            </td>

                                            <td className={bodyCell}>
                                                <span
                                                    title={`Review status. Next toggle sets ${NEXT_STATUS[status]}.`}
                                                    className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold ${STATUS_BADGE[status]}`}
                                                >
                                                    {toggling[
                                                        row.checklist_id
                                                    ]
                                                        ? "…"
                                                        : status
                                                              .split("_")
                                                              .join(" ")}
                                                </span>
                                            </td>

                                            <td
                                                className={`${bodyCell} truncate italic`}
                                                title={notesValue}
                                            >
                                                {notesValue || DASH}
                                            </td>

                                            <td className={bodyCell}>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            !!toggling[
                                                                row
                                                                    .checklist_id
                                                            ]
                                                        }
                                                        onClick={() =>
                                                            handleToggle(row)
                                                        }
                                                        title={`Set to ${NEXT_STATUS[status]}`}
                                                        className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        Toggle
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openNotesEditor(row)
                                                        }
                                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                                    >
                                                        Add notes
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Inline notes editor, expanded under
                                            the audit's row. */}
                                        {editingNotesId ===
                                            row.checklist_id && (
                                            <tr
                                                key={`${row.checklist_id}-notes`}
                                                className="border-b border-slate-100 bg-amber-50/40"
                                            >
                                                <td
                                                    colSpan={COL_WIDTHS.length}
                                                    className="px-4 py-3"
                                                >
                                                    <label
                                                        htmlFor={`notes-${row.checklist_id}`}
                                                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500"
                                                    >
                                                        Corrective action notes —
                                                        persisted with the
                                                        row&apos;s status
                                                    </label>

                                                    <textarea
                                                        id={`notes-${row.checklist_id}`}
                                                        value={noteDraft}
                                                        onChange={(event) =>
                                                            setNoteDraft(
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                        rows={2}
                                                        placeholder="Record follow-up actions for this audit..."
                                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                                                    />

                                                    <div className="mt-2 flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setEditingNotesId(
                                                                    null
                                                                )
                                                            }
                                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
                                                        >
                                                            Cancel
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                saveNotes(row)
                                                            }
                                                            className="rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-700"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <p className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[10px] text-slate-400">
                One row per audit — the response carries a single free-text
                category rather than one entry per check. Toggle and Save answer
                with the updated row, so the table re-renders without a second
                GET.
            </p>
        </section>
    );
}
