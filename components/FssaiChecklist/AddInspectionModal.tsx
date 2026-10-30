"use client";

import { createFssaiInspectionApi } from "@/data/FssaiInspection/api";
import { getCanteenOnboardingApi } from "@/data/Onboarding/api";
import { showApiResultToast, showToast } from "@/utils/toast";
import { LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";

const INSPECTION_TYPES = [
  "Routine Inspection",
  "Spot Inspection",
  "Complaint-based Inspection",
  "Follow-up Inspection",
  "Surprise Inspection",
  "Other / Not specified",
] as const;

export default function AddInspectionModal({
  onCreated,
  onClose,
}: {
  onCreated?: () => void;
  onClose: () => void;
}) {
  const [kitchenNames, setKitchenNames] = useState<string[]>([]);
  const [loadingKitchens, setLoadingKitchens] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    location: "",
    date: "",
    reference_number: "",
    officer_name: "",
    type: "Routine Inspection",
    remarks: "",
  });

  useEffect(() => {
    const load = async () => {
      const data = await getCanteenOnboardingApi();
      const names = data?.kitchen_name || [];
      setKitchenNames(names);
      if (names.length > 0) {
        setForm((prev) => ({ ...prev, location: names[0] }));
      }
      setLoadingKitchens(false);
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

    if (!form.location || !form.date) {
      showToast({
        variant: "error",
        message: "Location and date are required.",
      });
      return;
    }

    if (!file) {
      showToast({
        variant: "error",
        message: "Inspection report PDF is required.",
      });
      return;
    }

    if (file.type !== "application/pdf") {
      showToast({
        variant: "error",
        message: "Only PDF files are allowed.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast({
        variant: "error",
        message: "File size must be less than 10 MB.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("report", file);
      formData.append("location", form.location);
      formData.append("date", form.date);
      if (form.reference_number) formData.append("reference_number", form.reference_number);
      if (form.officer_name) formData.append("officer_name", form.officer_name);
      if (form.type) formData.append("type", form.type);
      if (form.remarks) formData.append("remarks", form.remarks);

      const result = await createFssaiInspectionApi(formData);

      const created = showApiResultToast(result, {
        success: "Inspection added successfully.",
        failure: "Failed to add inspection.",
      });

      if (created) {
        onCreated?.();
        onClose();
      }
    } catch (error) {
      showToast({
        variant: "error",
        message: "Failed to add inspection.",
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
            <h2 className="text-lg font-semibold text-slate-800">Add Inspection</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Upload FSSAI inspection report
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
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Location <span className="text-red-500">*</span>
                </label>
                {loadingKitchens ? (
                  <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ) : (
                  <select
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {kitchenNames.length > 0 ? (
                      kitchenNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No kitchen names configured
                      </option>
                    )}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Inspection Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reference Number
                </label>
                <input
                  type="text"
                  name="reference_number"
                  value={form.reference_number}
                  onChange={handleChange}
                  placeholder="FSSAI/INS/2026/..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Officer Name
                </label>
                <input
                  type="text"
                  name="officer_name"
                  value={form.officer_name}
                  onChange={handleChange}
                  placeholder="Inspecting officer"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Inspection Type
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {INSPECTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Inspection Report (PDF) <span className="text-red-500">*</span>
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 transition hover:border-amber-400 hover:bg-amber-50/50">
                <Upload size={24} className="text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {file ? file.name : "Click to upload PDF"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Max 10 MB</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                rows={3}
                placeholder="Additional notes..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
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
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting && <LoaderCircle size={16} className="animate-spin" />}
              {isSubmitting ? "Uploading..." : "Add Inspection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

        