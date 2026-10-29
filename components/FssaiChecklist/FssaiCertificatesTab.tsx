"use client";

import { getCanteenOnboardingApi } from "@/data/Onboarding/api";
import type { FssaiDetails } from "@/data/Onboarding/type";
import { ExternalLink, FileText, ShieldCheck } from "lucide-react";
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

export default function FssaiCertificatesTab() {
  const [certificates, setCertificates] = useState<FssaiDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getCanteenOnboardingApi();
      setCertificates(data?.fssai_details || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-10 text-center text-sm text-slate-400">
          Loading certificates...
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
        <FileText className="mx-auto text-slate-300" size={28} />
        <p className="mt-2 text-sm font-medium text-slate-500">
          No certificates found
        </p>
        <p className="mt-1 text-sm text-slate-400">
          FSSAI certificates from onboarding will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {certificates.map((cert, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-700" />
              <h3 className="text-sm font-semibold text-slate-800">
                FSSAI Certificate {index + 1}
              </h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                {cert.licence_type}
              </span>
            </div>
            {cert.licence_certificate && (
              <a
                href={cert.licence_certificate}
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
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Licence Number
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {cert.fssai_licence_number || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Issue Date
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDate(cert.issue_date)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Valid Until
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDate(cert.valid_until)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Food Business Activity
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {cert.food_business_activity?.map((activity, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                    >
                      {activity}
                    </span>
                  )) || "—"}
                </div>
              </div>
              {cert.additional_documents && cert.additional_documents.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Additional Documents
                  </p>
                  <div className="mt-1 space-y-1">
                    {cert.additional_documents.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800"
                      >
                        <ExternalLink size={14} />
                        Document {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {cert.licence_certificate ? (
              <div className="border-t border-slate-200 lg:border-t-0 lg:border-l lg:border-slate-200">
                <div className="h-full min-h-[500px]">
                  <iframe
                    src={cert.licence_certificate}
                    className="h-full w-full min-h-[500px]"
                    title={`Certificate ${index + 1}`}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center border-t border-slate-200 p-4 text-sm text-slate-400 lg:border-t-0 lg:border-l lg:border-slate-200">
                No certificate available
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
