"use client";

import { createFssaiActionApi } from "@/data/FssaiAction/api";
import { getFssaiInspectionsApi } from "@/data/FssaiInspection/api";
import type { FssaiInspectionRow } from "@/data/FssaiInspection/type";
import { showToast } from "@/utils/toast";
import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

const ACTION_SOURCES = [
  "Internal Inspection",
  "External Inspection",
  "Surprise Visit",
  "Other",
] as const;

const STATUSES = ["open", "in_progress", "close"] as const;

export default function CreateCorrectiveActionModal({
  onCreated,
  onClose,
}: {
  onCreated?: () => void;
  onClose: () => void;
}) {
  const [inspections, setInspections] = useState<FssaiInspectionRow[]>([]);
  const [loadingInspections, setLoadingInspections] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    issue_name: "",
    issue_details: "",
    issue_source: "Internal Inspection",
    inspection_id: "",
    severity: "",
    action_assigned: "",
    target_date: "",
    status: "open",
  });

  useEffect(() => {
    const load = async () => {
      const data = await getFssaiInspectionsApi();
      setInspections(data);
      if (data.length > 0) {
        setForm((prev) => ({ ...prev, inspection_id: data[0].inspection_id }));
      }
      setLoadingInspections(false);
    };
    load();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
        message: "Please fill all required fields.",
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

      if (result?.status) {
        showToast({
          variant: "success",
          message: "Corrective action created successfully.",
        });
        onCreated?.();
        onClose();
      } else {
        showToast({
          variant: "error",
          message: result?.message || "Failed to create corrective action.",
        });
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
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {ACTION_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Inspection ID <span className="text-red-500">*</span>
                </label>
                {loadingInspections ? (
                  <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ) : (
                  <select
                    name="inspection_id"
                    value={form.inspection_id}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {inspections.length > 0 ? (
                      inspections.map((insp) => (
                        <option key={insp.inspection_id} value={insp.inspection_id}>
                          {insp.inspection_id} - {insp.location} ({insp.type})
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No inspections available
                      </option>
                    )}
                  </select>
                )}
              </div>

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

              <div>
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
              </div>

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
              disabled={isSubmitting || inspections.length === 0}
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
