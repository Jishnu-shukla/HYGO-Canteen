"use client";

import { getFssaiInspectionsApi } from "@/data/FssaiInspection/api";
import type { FssaiInspectionRow } from "@/data/FssaiInspection/type";
import { Calendar, ExternalLink, FileText, MapPin, User } from "lucide-react";
import { useEffect, useState } from "react";

function formatDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function FssaiInspectionsTab() {
  const [inspections, setInspections] = useState<FssaiInspectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getFssaiInspectionsApi();
      setInspections(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-10 text-center text-sm text-slate-400">
          Loading inspections...
        </div>
      </div>
    );
  }

  if (inspections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
        <FileText className="mx-auto text-slate-300" size={28} />
        <p className="mt-2 text-sm font-medium text-slate-500">
          No inspections added yet
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Click "Add Inspection" to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {inspections.map((inspection) => (
        <div
          key={inspection.inspection_id}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-amber-700" />
              <h3 className="text-sm font-semibold text-slate-800">
                {inspection.inspection_id}
              </h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                {inspection.type || "Other / Not specified"}
              </span>
            </div>
            {inspection.report_link && (
              <a
                href={inspection.report_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
              >
                <ExternalLink size={14} />
                Open in New Tab
              </a>
            )}
          </div>
          <div className="grid gap-0 lg:grid-cols-2 lg:min-h-[500px]">
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {inspection.location || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar size={16} className="mt-0.5 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Inspection Date
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {formatDate(inspection.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User size={16} className="mt-0.5 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Officer Name
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {inspection.officer_name || "—"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reference Number
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {inspection.reference_number || "—"}
                </p>
              </div>
              {inspection.remarks && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Remarks
                  </p>
                  <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                    {inspection.remarks}
                  </p>
                </div>
              )}
            </div>
            {inspection.report_link ? (
              <div className="border-t border-slate-200 lg:border-t-0 lg:border-l lg:border-slate-200">
                <div className="h-full min-h-[500px]">
                  <iframe
                    src={inspection.report_link}
                    className="h-full w-full min-h-[500px]"
                    title={`Report ${inspection.inspection_id}`}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center border-t border-slate-200 p-4 text-sm text-slate-400 lg:border-t-0 lg:border-l lg:border-slate-200">
                No report available
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
