"use client";

import { createFssaiActionApi } from "@/data/FssaiAction/api";
import type { FssaiActionSource } from "@/data/FssaiAction/type";
import { getFssaiChecklistApi } from "@/data/FssaiChecklist/api";
import type { GetFssaichecklist } from "@/data/FssaiChecklist/type";
import { getFssaiInspectionsApi } from "@/data/FssaiInspection/api";
import type { FssaiInspectionRow } from "@/data/FssaiInspection/type";
import { showApiResultToast, showToast } from "@/utils/toast";
import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

const ACTION_SOURCES = [
  "Internal",
  "FSSAI"
] as const satisfies readonly FssaiActionSource[];

/**
 * Internal inspection *is* the FSSAI checklist filed on the Internal
 * inspection tab, so it links a checklist_id. Every other source refers to an
 * inspection filed on the Inspection tab and links an inspection_id.
 */
const INTERNAL_SOURCE: FssaiActionSource = "Internal";

/** "2026-10-02T00:00:00.000Z" -> "02 Oct 2026". Falls back to the raw string. */
function formatDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUSES = ["open", "in_progress", "close"] as const;

export default function CreateCorrectiveActionModal({
  onCreated,
  onClose,
}: {
  onCreated?: () => void;
  onClose: () => void;
}) {
  const [checklists, setChecklists] = useState<GetFssaichecklist[]>([]);
  const [inspections, setInspections] = useState<FssaiInspectionRow[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    issue_name: "",
    issue_details: "",
    issue_source: "" as FssaiActionSource | "",
    inspection_id: "",
    severity: "",
    action_assigned: "",
    target_date: "",
    status: "open",
  });

  useEffect(() => {
    const load = async () => {
      const [checklistData, inspectionData] = await Promise.all([
        getFssaiChecklistApi(),
        getFssaiInspectionsApi(),
      ]);
      setChecklists(checklistData ?? []);
      setInspections(inspectionData);
      setLoadingOptions(false);
    };
    load();
  }, []);

  const isInternal = form.issue_source === INTERNAL_SOURCE;

  /**
   * Whatever the source points at: internal inspections are the FSSAI
   * checklists, the rest are the externally filed inspections.
   */
  const sourceOptions = isInternal
    ? checklists.map((checklist) => ({
        value: checklist.checklist_id,
        label: `${checklist.checklist_id} - ${checklist.categories}${
          checklist.audit_date ? ` (${formatDate(checklist.audit_date)})` : ""
        }`,
      }))
    : inspections.map((inspection) => ({
        value: inspection.inspection_id,
        label: `${inspection.inspection_id} - ${inspection.location}${
          inspection.type ? ` (${inspection.type})` : ""
        }`,
      }));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /**
   * The linked ID belongs to a different collection per source, so changing
   * the source clears the previous pick — an external inspection_id must never
   * survive a switch to Internal Inspection (or the other way round).
   */
  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({
      ...form,
      issue_source: e.target.value as FssaiActionSource,
      inspection_id: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.issue_name ||
      !form.issue_source ||
      !form.inspection_id ||
      !form.severity ||
      !form.action_assigned ||
      !form.target_date
    ) {
      showToast({
        variant: "error",
        message: form.issue_source
          ? "Please fill all required fields."
          : "Please select an issue source.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        issue_name: form.issue_name,
        issue_details: form.issue_details || "",
        issue_source: form.issue_source,
        inspection_id: form.inspection_id,
        severity: form.severity,
        action_assigned: form.action_assigned,
        target_date: form.target_date,
        status: form.status,
      };

      const result = await createFssaiActionApi(payload);

      const created = showApiResultToast(result, {
        success: "Corrective action created successfully.",
        failure: "Failed to create corrective action.",
      });

      if (created) {
        onCreated?.();
        onClose();
      }
    } catch (error) {
      showToast({
        variant: "error",
        message: "Failed to create corrective action.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Create Corrective Action
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Add a corrective action for inspection
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Issue Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="issue_name"
                  value={form.issue_name}
                  onChange={handleChange}
                  required
                  placeholder="Short issue title"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Issue Source <span className="text-red-500">*</span>
                </label>
                <select
                  name="issue_source"
                  value={form.issue_source}
                  onChange={handleSourceChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="" disabled>
                    Select issue source
                  </option>
                  {ACTION_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              {form.issue_source && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {isInternal ? "Checklist ID" : "Inspection ID"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {loadingOptions ? (
                    <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                  ) : (
                    <select
                      name="inspection_id"
                      value={form.inspection_id}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {sourceOptions.length > 0 ? (
                        <>
                          <option value="" disabled>
                            Select {isInternal ? "checklist" : "inspection"} ID
                          </option>
                          {sourceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value="" disabled>
                          No {isInternal ? "checklists" : "inspections"} available
                        </option>
                      )}
                    </select>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {isInternal
                      ? "Internal inspections are the FSSAI checklists filed on this screen."
                      : "Linked to an inspection filed on the Inspection tab."}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Severity <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="severity"
                  value={form.severity}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Major, Minor, Critical"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Action Assigned To <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="action_assigned"
                  value={form.action_assigned}
                  onChange={handleChange}
                  required
                  placeholder="Person responsible"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Target Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="target_date"
                  value={form.target_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div> */}

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Issue Details
                </label>
                <textarea
                  name="issue_details"
                  value={form.issue_details}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Detailed description of the issue"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting || (!!form.issue_source && sourceOptions.length === 0)
              }
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting && <LoaderCircle size={16} className="animate-spin" />}
              {isSubmitting ? "Creating..." : "Create Action"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
