"use client";

import {
    uploadOnboardingCertificateApi,
    uploadOnboardingDocumentsApi,
} from "@/data/Onboarding/api";
import type {
    AdditionalDocument,
    FireNocDetails,
    FssaiDetails,
    FssaiLicenceType,
    GstDetails,
} from "@/data/Onboarding/type";
import { LoaderCircle, Upload, X } from "lucide-react";
import { useState } from "react";

export type CertificateKind = "fssai" | "gst" | "fire_noc" | "document";

/** What the modal hands back — the kind plus the certificate that was built. */
export type CertificateFormValue =
    | { kind: "fssai"; value: FssaiDetails }
    | { kind: "gst"; value: GstDetails }
    | { kind: "fire_noc"; value: FireNocDetails }
    | { kind: "document"; value: AdditionalDocument };

export const CERTIFICATE_KIND_LABELS: Record<CertificateKind, string> = {
    fssai: "FSSAI licence",
    gst: "GST certificate",
    fire_noc: "Fire NOC",
    document: "Supporting document",
};

const FSSAI_LICENCE_TYPES: FssaiLicenceType[] = [
    "Basic",
    "State Licence",
    "Central Licence",
];

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const labelClass =
    "mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500";

/** ISO/date-time string -> the value an <input type="date"> accepts. */
function toDateInput(value?: string | null): string {
    if (!value) return "";
    return value.slice(0, 10);
}

/** `<input type="date">` value -> ISO date string the API stores. */
function toIsoDate(value: string): string {
    return new Date(`${value}T00:00:00.000Z`).toISOString();
}

interface CertificateFormModalProps {
    /** Which certificate is being edited; the kind cannot change while editing. */
    kind: CertificateKind;
    /** Null for "add", otherwise the certificate being replaced. */
    initial?: FssaiDetails | GstDetails | FireNocDetails | AdditionalDocument | null;
    onClose: () => void;
    onSubmit: (result: CertificateFormValue) => void | Promise<void>;
}

export default function CertificateFormModal({
    kind,
    initial,
    onClose,
    onSubmit,
}: CertificateFormModalProps) {
    const fssai = kind === "fssai" ? (initial as FssaiDetails | null) : null;
    const gst = kind === "gst" ? (initial as GstDetails | null) : null;
    const fireNoc =
        kind === "fire_noc" ? (initial as FireNocDetails | null) : null;
    const document =
        kind === "document" ? (initial as AdditionalDocument | null) : null;

    const [licenceNumber, setLicenceNumber] = useState(
        fssai?.fssai_licence_number ?? ""
    );
    const [licenceType, setLicenceType] = useState<FssaiLicenceType>(
        fssai?.licence_type ?? "Basic"
    );
    const [issueDate, setIssueDate] = useState(
        toDateInput(fssai?.issue_date ?? gst?.issue_date ?? fireNoc?.issue_date)
    );
    const [validUntil, setValidUntil] = useState(
        toDateInput(fssai?.valid_until ?? fireNoc?.valid_until ?? document?.valid_until)
    );
    const [activities, setActivities] = useState(
        (fssai?.food_business_activity ?? []).join(", ")
    );
    const [gstNumber, setGstNumber] = useState(gst?.gst_number ?? "");
    const [nocNumber, setNocNumber] = useState(
        fireNoc?.noc_application_number ?? ""
    );
    const [documentName, setDocumentName] = useState(document?.name ?? "");

    const [fileUrl, setFileUrl] = useState(
        fssai?.licence_certificate ??
            gst?.licence_certificate ??
            fireNoc?.licence_certificate ??
            document?.link ??
            ""
    );

    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const title = `${initial ? "Edit" : "Add"} ${CERTIFICATE_KIND_LABELS[kind]}`;

    const handleUpload = async (file: File | undefined) => {
        if (!file) return;

        setError("");
        setUploading(true);

        try {
            if (kind === "document") {
                const uploaded = await uploadOnboardingDocumentsApi([file]);
                setFileUrl(uploaded.urls[0] ?? "");
            } else {
                const uploaded = await uploadOnboardingCertificateApi(file);
                setFileUrl(uploaded.url);
            }
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : "Failed to upload the file."
            );
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (fileUrl.trim() === "") {
            setError("Upload the certificate file before saving.");
            return;
        }

        if (kind === "fssai" || kind === "gst" || kind === "fire_noc") {
            if (!issueDate) {
                setError("Enter the issue date.");
                return;
            }
        }

        if (kind === "fssai" || kind === "fire_noc") {
            if (!validUntil) {
                setError("Enter the expiry date.");
                return;
            }
            if (validUntil < issueDate) {
                setError("Expiry date cannot be before the issue date.");
                return;
            }
        }

        if (kind === "document" && !validUntil) {
            setError("Enter the document's expiry date.");
            return;
        }

        let result: CertificateFormValue;

        if (kind === "fssai") {
            const items = activities
                .split(",")
                .map((activity) => activity.trim())
                .filter((activity) => activity !== "");

            if (licenceNumber.trim() === "") {
                setError("Enter the FSSAI licence number.");
                return;
            }
            if (items.length === 0) {
                setError("List at least one food business activity.");
                return;
            }

            result = {
                kind: "fssai",
                value: {
                    fssai_licence_number: licenceNumber.trim(),
                    licence_type: licenceType,
                    issue_date: toIsoDate(issueDate),
                    valid_until: toIsoDate(validUntil),
                    food_business_activity: items,
                    licence_certificate: fileUrl.trim(),
                },
            };
        } else if (kind === "gst") {
            if (gstNumber.trim() === "") {
                setError("Enter the GST number.");
                return;
            }

            result = {
                kind: "gst",
                value: {
                    gst_number: gstNumber.trim(),
                    issue_date: toIsoDate(issueDate),
                    licence_certificate: fileUrl.trim(),
                },
            };
        } else if (kind === "fire_noc") {
            if (nocNumber.trim() === "") {
                setError("Enter the NOC application number.");
                return;
            }

            result = {
                kind: "fire_noc",
                value: {
                    noc_application_number: nocNumber.trim(),
                    issue_date: toIsoDate(issueDate),
                    valid_until: toIsoDate(validUntil),
                    licence_certificate: fileUrl.trim(),
                },
            };
        } else {
            if (documentName.trim() === "") {
                setError("Give the document a name.");
                return;
            }

            result = {
                kind: "document",
                value: {
                    name: documentName.trim(),
                    valid_until: toIsoDate(validUntil),
                    link: fileUrl.trim(),
                },
            };
        }

        setSubmitting(true);

        try {
            await onSubmit(result);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Failed to save the certificate."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="certificate-form-title"
                className="my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                <div className="flex items-start justify-between border-b border-slate-100 bg-blue-50/60 px-5 py-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Certificates
                        </p>
                        <h2
                            id="certificate-form-title"
                            className="mt-1 text-lg font-semibold text-slate-800"
                        >
                            {title}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 px-5 py-5">
                        {kind === "fssai" && (
                            <>
                                <div>
                                    <label
                                        htmlFor="fssai-number"
                                        className={labelClass}
                                    >
                                        Licence number
                                    </label>
                                    <input
                                        id="fssai-number"
                                        type="text"
                                        value={licenceNumber}
                                        onChange={(event) =>
                                            setLicenceNumber(event.target.value)
                                        }
                                        placeholder="e.g. 12345678901234"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="fssai-type"
                                        className={labelClass}
                                    >
                                        Licence type
                                    </label>
                                    <select
                                        id="fssai-type"
                                        value={licenceType}
                                        onChange={(event) =>
                                            setLicenceType(
                                                event.target
                                                    .value as FssaiLicenceType
                                            )
                                        }
                                        className={inputClass}
                                    >
                                        {FSSAI_LICENCE_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {kind === "gst" && (
                            <div>
                                <label htmlFor="gst-number" className={labelClass}>
                                    GST number
                                </label>
                                <input
                                    id="gst-number"
                                    type="text"
                                    value={gstNumber}
                                    onChange={(event) =>
                                        setGstNumber(event.target.value)
                                    }
                                    placeholder="e.g. 02AA2345K9U9"
                                    className={inputClass}
                                />
                            </div>
                        )}

                        {kind === "fire_noc" && (
                            <div>
                                <label htmlFor="noc-number" className={labelClass}>
                                    NOC application number
                                </label>
                                <input
                                    id="noc-number"
                                    type="text"
                                    value={nocNumber}
                                    onChange={(event) =>
                                        setNocNumber(event.target.value)
                                    }
                                    placeholder="e.g. 234567645468"
                                    className={inputClass}
                                />
                            </div>
                        )}

                        {kind === "document" && (
                            <div>
                                <label
                                    htmlFor="document-name"
                                    className={labelClass}
                                >
                                    Document name
                                </label>
                                <input
                                    id="document-name"
                                    type="text"
                                    value={documentName}
                                    onChange={(event) =>
                                        setDocumentName(event.target.value)
                                    }
                                    placeholder="e.g. Water Testing Report"
                                    className={inputClass}
                                />
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            {kind !== "document" && (
                                <div>
                                    <label
                                        htmlFor="certificate-issue-date"
                                        className={labelClass}
                                    >
                                        Issue date
                                    </label>
                                    <input
                                        id="certificate-issue-date"
                                        type="date"
                                        value={issueDate}
                                        onChange={(event) =>
                                            setIssueDate(event.target.value)
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="certificate-valid-until"
                                    className={labelClass}
                                >
                                    {kind === "document"
                                        ? "Expires on"
                                        : "Valid until"}
                                </label>
                                <input
                                    id="certificate-valid-until"
                                    type="date"
                                    value={validUntil}
                                    min={issueDate || undefined}
                                    onChange={(event) =>
                                        setValidUntil(event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {kind === "fssai" && (
                            <div>
                                <label
                                    htmlFor="fssai-activities"
                                    className={labelClass}
                                >
                                    Food business activity
                                </label>
                                <input
                                    id="fssai-activities"
                                    type="text"
                                    value={activities}
                                    onChange={(event) =>
                                        setActivities(event.target.value)
                                    }
                                    placeholder="Comma separated, e.g. Catering, Storage"
                                    className={inputClass}
                                />
                                <p className="mt-1 text-[10px] text-slate-400">
                                    Separate several activities with commas.
                                </p>
                            </div>
                        )}

                        <div>
                            <span className={labelClass}>
                                Certificate file
                            </span>

                            {fileUrl ? (
                                <div className="flex min-h-[42px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs">
                                    <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="truncate font-medium text-amber-700 underline-offset-2 hover:underline"
                                    >
                                        View uploaded file
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() => setFileUrl("")}
                                        disabled={uploading || submitting}
                                        className="shrink-0 text-slate-400 transition hover:text-red-500 disabled:opacity-50"
                                        aria-label="Remove file"
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <label className="flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 transition hover:border-amber-400 hover:text-amber-700">
                                    {uploading ? (
                                        <>
                                            <LoaderCircle
                                                size={14}
                                                className="animate-spin"
                                            />
                                            Uploading…
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={14} />
                                            Upload certificate
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        className="hidden"
                                        disabled={uploading || submitting}
                                        onChange={(event) => {
                                            handleUpload(event.target.files?.[0]);
                                            event.target.value = "";
                                        }}
                                    />
                                </label>
                            )}
                        </div>

                        {error && (
                            <p
                                role="alert"
                                className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
                            >
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={submitting || uploading}
                            className="flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting && (
                                <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                />
                            )}
                            {submitting ? "Saving…" : "Save certificate"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
