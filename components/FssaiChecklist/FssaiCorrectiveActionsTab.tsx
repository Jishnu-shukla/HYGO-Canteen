"use client";

import { getFssaiActionsApi } from "@/data/FssaiAction/api";
import type {
  FssaiActionRow,
  FssaiActionSource,
  FssaiActionStatus,
} from "@/data/FssaiAction/type";
import { ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";

const DASH = "—";

const headCell =
  "whitespace-nowrap px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700";
const bodyCell = "px-2 py-2 text-[11px] text-slate-600";

/**
 * Percentage widths for `table-fixed`. The table keeps a minimum width so the
 * eight columns stay readable and the wrapper scrolls horizontally instead.
 */
const COL_WIDTHS = [
  "11%", // Action ID
  "23%", // Issue
  "10%", // Source
  "12%", // Linked ID
  "10%", // Severity
  "14%", // Assigned To
  "10%", // Target Date
  "10%", // Status
];

const HEADINGS = [
  "Action ID",
  "Issue",
  "Source",
  "Linked ID",
  "Severity",
  "Assigned To",
  "Target Date",
  "Status",
];

/**
 * The GET payload reports the EFFECTIVE status — a stored "open" whose target
 * date has passed already reads as "overdue" — so the table renders the value
 * as-is rather than re-deriving it.
 */
const STATUS_LABEL: Record<FssaiActionStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  close: "Closed",
  overdue: "Overdue",
};

const STATUS_BADGE: Record<FssaiActionStatus, string> = {
  open: "bg-amber-50 text-amber-700",
  in_progress: "bg-sky-50 text-sky-700",
  close: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
};

const SOURCE_BADGE: Record<FssaiActionSource, string> = {
  Internal: "bg-violet-50 text-violet-700",
  FSSAI: "bg-sky-50 text-sky-700",
};

/** "2026-11-30T00:00:00.000Z" -> "30 Nov 2026". Falls back to the raw string. */
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
 * Corrective-action list backed by GET /api/fssaiaction.
 *
 * `refreshToken` is bumped by the page after a successful create so the table
 * re-reads without a full page reload (which would also discard the toast).
 */
export default function FssaiCorrectiveActionsTab({
  refreshToken = 0,
}: {
  refreshToken?: number;
}) {
  const [actions, setActions] = useState<FssaiActionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const data = await getFssaiActionsApi();

      if (cancelled) return;

      setActions(data);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Corrective Actions
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Soonest target date first — overdue is derived from the target date
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
          {loading ? "-" : actions.length} ACTIONS
        </span>
      </div>

      {loading ? (
        <div className="px-4 py-10 text-center text-xs text-slate-400">
          Loading corrective actions...
        </div>
      ) : actions.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <ClipboardList className="mx-auto text-slate-300" size={28} />
          <p className="mt-2 text-sm font-medium text-slate-500">
            No corrective actions yet
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Click &quot;Create Corrective Action&quot; to add one.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
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
              {actions.map((action) => (
                <tr
                  key={action.action_id}
                  className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70"
                >
                  <td
                    className={`${bodyCell} truncate font-semibold text-slate-700`}
                    title={action.action_id}
                  >
                    {action.action_id}
                  </td>

                  <td className={bodyCell}>
                    <p
                      className="truncate font-medium text-slate-800"
                      title={action.issue_name}
                    >
                      {action.issue_name}
                    </p>
                    {action.issue_details && (
                      <p
                        className="mt-0.5 truncate text-[10px] text-slate-400"
                        title={action.issue_details}
                      >
                        {action.issue_details}
                      </p>
                    )}
                  </td>

                  <td className={bodyCell}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        SOURCE_BADGE[action.issue_source] ??
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {action.issue_source}
                    </span>
                  </td>

                  <td className={bodyCell}>
                    <p
                      className="truncate font-medium text-slate-700"
                      title={action.inspection_id}
                    >
                      {action.inspection_id || DASH}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                      {action.issue_source === "Internal"
                        ? "Checklist"
                        : "Inspection"}
                    </p>
                  </td>

                  <td className={bodyCell}>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {action.severity || DASH}
                    </span>
                  </td>

                  <td
                    className={`${bodyCell} truncate`}
                    title={action.action_assigned}
                  >
                    {action.action_assigned || DASH}
                  </td>

                  <td className={`${bodyCell} whitespace-nowrap`}>
                    {formatDate(action.target_date)}
                  </td>

                  <td className={bodyCell}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        STATUS_BADGE[action.status] ??
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUS_LABEL[action.status] ?? action.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
