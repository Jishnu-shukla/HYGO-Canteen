"use client";

import { getCanteenOnboardingApi, upsertCanteenOnboardingApi } from "@/data/Onboarding/api";
import type { GetCanteenOnboardingResponse } from "@/data/Onboarding/type";
import CertificateFormModal, {
    CERTIFICATE_KIND_LABELS,
    type CertificateFormValue,
    type CertificateKind,
} from "@/components/Settings/CertificateFormModal";
import {
    ExternalLink,
    FileText,
    LoaderCircle,
    Pencil,
    ShieldCheck,
    Trash2,
    TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";

/** ISO date -> "01 Apr 2024"; unknown values pass through untouched. */
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

interface CertificateCardProps {
    title: string;
    badge?: string;
    /** The certificate file (PDF/image) — previewed and offered as a link. */
    fileUrl?: string;
    details: { label: string; value: string }[];
    tagGroups?: { label: string; items: string[] }[];
    links?: { label: string; href: string }[];
    /** Read-only cards (no onboarding document yet) hide the edit actions. */
    editable: boolean;
    busy: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

/** One certificate in the same card shape the FSSAI screen uses. */
function CertificateCard({
    title,
    badge,
    fileUrl,
    details,
    tagGroups = [],
    links = [],
    editable,
    busy,
    onEdit,
    onDelete,
}: CertificateCardProps) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <ShieldCheck size={18} className="text-amber-700" />
                    <h3 className="text-sm font-semibold text-slate-800">
                        {title}
                    </h3>
                    {badge && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                            {badge}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {fileUrl && (
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
                        >
                            <ExternalLink size={14} />
                            Open in New Tab
                        </a>
                    )}

                    {editable && (
                        <>
                            <button
                                type="button"
                                onClick={onEdit}
                                disabled={busy}
                                aria-label={`Edit ${title}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Pencil size={13} />
                                Edit
                            </button>

                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={busy}
                                aria-label={`Delete ${title}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Trash2 size={13} />
                                Delete
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-0 lg:min-h-[420px] lg:grid-cols-2">
                <div className="grid gap-4 p-4 md:grid-cols-2">
                    {details.map((detail) => (
                        <div key={detail.label}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {detail.label}
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                                {detail.value || "—"}
                            </p>
                        </div>
                    ))}

                    {tagGroups.map((group) => (
                        <div key={group.label} className="md:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {group.label}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {group.items.length > 0 ? (
                                    group.items.map((item, index) => (
                                        <span
                                            key={`${item}-${index}`}
                                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                                        >
                                            {item}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-slate-400">
                                        —
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {links.length > 0 && (
                        <div className="md:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Documents
                            </p>
                            <div className="mt-1 space-y-1">
                                {links.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800"
                                    >
                                        <ExternalLink size={14} />
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {fileUrl ? (
                    <div className="border-t border-slate-200 lg:border-l lg:border-t-0 lg:border-slate-200">
                        <div className="h-full min-h-[420px]">
                            <iframe
                                src={fileUrl}
                                className="h-full min-h-[420px] w-full"
                                title={title}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center border-t border-slate-200 p-4 text-sm text-slate-400 lg:border-l lg:border-t-0 lg:border-slate-200">
                        No certificate available
                    </div>
                )}
            </div>
        </div>
    );
}

type EditTarget = { kind: CertificateKind; index: number | null };

/**
 * Settings → Certificate.
 *
 * Shows every certificate captured during onboarding: FSSAI licences, the GST
 * registration, Fire NOCs, and any supporting documents. All of them come from
 * one GET /api/onboarding call — the same fetch the FSSAI screen's certificate
 * tab uses — but the settings screen lists every group and can add, replace or
 * remove them.
 *
 * Files are uploaded first (POST /api/onboarding/certificate or /documents) and
 * the returned URLs are written with the whole onboarding document in one PUT,
 * because PUT is a full replace of the singleton.
 */
export default function CanteenCertificatesTab() {
    const [onboarding, setOnboarding] =
        useState<GetCanteenOnboardingResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const [editing, setEditing] = useState<EditTarget | null>(null);
    const [pendingDelete, setPendingDelete] = useState<EditTarget | null>(null);
    const [saving, setSaving] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const data = await getCanteenOnboardingApi();
            setOnboarding(data);
            setLoading(false);
        };

        load();
    }, []);

    /** The certificate behind an edit/delete target. */
    function certificateAt(target: EditTarget) {
        if (!onboarding) return null;

        if (target.kind === "fssai") {
            return target.index === null
                ? null
                : (onboarding.fssai_details[target.index] ?? null);
        }
        if (target.kind === "gst") return onboarding.gst_details ?? null;
        if (target.kind === "fire_noc") {
            return target.index === null
                ? null
                : (onboarding.fire_noc_details?.[target.index] ?? null);
        }

        return target.index === null
            ? null
            : (onboarding.additional_documents?.[target.index] ?? null);
    }

    /** Applies one certificate change to a copied document. */
    function withCertificate(
        current: GetCanteenOnboardingResponse,
        target: EditTarget,
        result: CertificateFormValue
    ): GetCanteenOnboardingResponse {
        const next = { ...current };

        if (result.kind === "fssai") {
            const list = [...current.fssai_details];
            if (target.index === null) list.push(result.value);
            else list[target.index] = result.value;
            next.fssai_details = list;
        } else if (result.kind === "gst") {
            next.gst_details = result.value;
        } else if (result.kind === "fire_noc") {
            const list = [...(current.fire_noc_details ?? [])];
            if (target.index === null) list.push(result.value);
            else list[target.index] = result.value;
            next.fire_noc_details = list;
        } else {
            const list = [...(current.additional_documents ?? [])];
            if (target.index === null) list.push(result.value);
            else list[target.index] = result.value;
            next.additional_documents = list;
        }

        return next;
    }

    /** Removes one certificate from a copied document. */
    function withoutCertificate(
        current: GetCanteenOnboardingResponse,
        target: EditTarget
    ): GetCanteenOnboardingResponse {
        const next = { ...current };

        if (target.kind === "fssai") {
            next.fssai_details = current.fssai_details.filter(
                (_, index) => index !== target.index
            );
        } else if (target.kind === "gst") {
            next.gst_details = null;
        } else if (target.kind === "fire_noc") {
            next.fire_noc_details = (current.fire_noc_details ?? []).filter(
                (_, index) => index !== target.index
            );
        } else {
            next.additional_documents = (
                current.additional_documents ?? []
            ).filter((_, index) => index !== target.index);
        }

        return next;
    }

    /** PUTs the whole document, since the API replaces the singleton. */
    async function persist(next: GetCanteenOnboardingResponse) {
        setSaving(true);
        setActionError(null);
        setSavedMessage(null);

        try {
            const saved = await upsertCanteenOnboardingApi({
                name: next.name,
                number_of_kitchen: next.number_of_kitchen,
                kitchen_name: next.kitchen_name,
                operated_by: next.operated_by,
                created_by: next.created_by,
                hospital_address: next.hospital_address,
                fssai_details: next.fssai_details,
                gst_details: next.gst_details ?? null,
                fire_noc_details: next.fire_noc_details ?? [],
                additional_documents: next.additional_documents ?? [],
            });

            setOnboarding(saved);
            return true;
        } catch (saveError) {
            setActionError(
                saveError instanceof Error
                    ? saveError.message
                    : "Failed to save the certificates."
            );
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function handleSubmit(result: CertificateFormValue) {
        if (!onboarding || !editing) return;

        const next = withCertificate(onboarding, editing, result);
        const ok = await persist(next);

        if (ok) {
            setSavedMessage(`${CERTIFICATE_KIND_LABELS[result.kind]} saved.`);
            setEditing(null);
        }
    }

    async function handleDelete() {
        if (!onboarding || !pendingDelete) return;

        if (
            pendingDelete.kind === "fssai" &&
            onboarding.fssai_details.length <= 1
        ) {
            setActionError(
                "At least one FSSAI licence is required — add another before deleting this one."
            );
            setPendingDelete(null);
            return;
        }

        const next = withoutCertificate(onboarding, pendingDelete);
        const ok = await persist(next);

        if (ok) {
            setSavedMessage("Certificate deleted.");
            setPendingDelete(null);
        }
    }

    if (loading) {
        return (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                    Loading certificates...
                </div>
            </div>
        );
    }

    const fssai = onboarding?.fssai_details ?? [];
    const gst = onboarding?.gst_details ?? null;
    const fireNoc = onboarding?.fire_noc_details ?? [];
    const documents = onboarding?.additional_documents ?? [];

    const total =
        fssai.length + (gst ? 1 : 0) + fireNoc.length + documents.length;

    const pendingDeleteLabel = pendingDelete
        ? CERTIFICATE_KIND_LABELS[pendingDelete.kind]
        : "";

    return (
        <div className="space-y-4">
            {/* Header + add */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Certificates
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        FSSAI licences, GST registration, Fire NOCs, and
                        supporting documents captured during onboarding.
                    </p>
                </div>

                <select
                    value=""
                    onChange={(event) => {
                        const kind = event.target.value as CertificateKind;
                        if (!kind) return;
                        setActionError(null);
                        setSavedMessage(null);
                        setEditing({ kind, index: null });
                        event.target.value = "";
                    }}
                    disabled={!onboarding || saving}
                    className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <option value="" disabled>
                        Add certificate
                    </option>
                    <option value="fssai">FSSAI licence</option>
                    <option value="gst">GST certificate</option>
                    <option value="fire_noc">Fire NOC</option>
                    <option value="document">Supporting document</option>
                </select>
            </div>

            {!onboarding && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    Onboarding has not been saved yet, so there is nothing to
                    attach certificates to. Complete onboarding first.
                </div>
            )}

            {actionError && (
                <div
                    role="alert"
                    className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700"
                >
                    <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                    {actionError}
                </div>
            )}

            {savedMessage && (
                <div
                    role="status"
                    className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700"
                >
                    {savedMessage}
                </div>
            )}

            {/* Delete confirmation */}
            {pendingDelete && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-xs font-medium text-red-700">
                        Delete this {pendingDeleteLabel.toLowerCase()}? This
                        cannot be undone.
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                />
                            ) : (
                                <Trash2 size={14} />
                            )}
                            {saving ? "Deleting…" : "Confirm delete"}
                        </button>

                        <button
                            type="button"
                            onClick={() => setPendingDelete(null)}
                            disabled={saving}
                            className="rounded-full px-3 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-700 disabled:opacity-60"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {total === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
                    <FileText className="mx-auto text-slate-300" size={28} />
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        No certificates found
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                        Add a certificate, or complete onboarding to capture
                        them there.
                    </p>
                </div>
            ) : (
                <>
                    {fssai.map((cert, index) => (
                        <CertificateCard
                            key={`fssai-${index}`}
                            title={`FSSAI Certificate ${index + 1}`}
                            badge={cert.licence_type}
                            fileUrl={cert.licence_certificate}
                            editable={!!onboarding}
                            busy={saving}
                            onEdit={() =>
                                setEditing({ kind: "fssai", index })
                            }
                            onDelete={() =>
                                setPendingDelete({ kind: "fssai", index })
                            }
                            details={[
                                {
                                    label: "Licence Number",
                                    value: cert.fssai_licence_number,
                                },
                                {
                                    label: "Issue Date",
                                    value: formatDate(cert.issue_date),
                                },
                                {
                                    label: "Valid Until",
                                    value: formatDate(cert.valid_until),
                                },
                            ]}
                            tagGroups={[
                                {
                                    label: "Food Business Activity",
                                    items: cert.food_business_activity ?? [],
                                },
                            ]}
                        />
                    ))}

                    {gst && (
                        <CertificateCard
                            title="GST Certificate"
                            badge="GST"
                            fileUrl={gst.licence_certificate}
                            editable={!!onboarding}
                            busy={saving}
                            onEdit={() => setEditing({ kind: "gst", index: 0 })}
                            onDelete={() =>
                                setPendingDelete({ kind: "gst", index: 0 })
                            }
                            details={[
                                { label: "GST Number", value: gst.gst_number },
                                {
                                    label: "Issue Date",
                                    value: formatDate(gst.issue_date),
                                },
                            ]}
                        />
                    )}

                    {fireNoc.map((cert, index) => (
                        <CertificateCard
                            key={`fire-${index}`}
                            title={`Fire NOC ${index + 1}`}
                            badge="Fire NOC"
                            fileUrl={cert.licence_certificate}
                            editable={!!onboarding}
                            busy={saving}
                            onEdit={() =>
                                setEditing({ kind: "fire_noc", index })
                            }
                            onDelete={() =>
                                setPendingDelete({ kind: "fire_noc", index })
                            }
                            details={[
                                {
                                    label: "NOC Application Number",
                                    value: cert.noc_application_number,
                                },
                                {
                                    label: "Issue Date",
                                    value: formatDate(cert.issue_date),
                                },
                                {
                                    label: "Valid Until",
                                    value: formatDate(cert.valid_until),
                                },
                            ]}
                        />
                    ))}

                    {documents.map((doc, index) => (
                        <CertificateCard
                            key={`document-${index}`}
                            title={doc.name || `Additional Document ${index + 1}`}
                            badge="Document"
                            fileUrl={doc.link}
                            editable={!!onboarding}
                            busy={saving}
                            onEdit={() =>
                                setEditing({ kind: "document", index })
                            }
                            onDelete={() =>
                                setPendingDelete({ kind: "document", index })
                            }
                            details={[
                                { label: "Document Name", value: doc.name },
                                {
                                    label: "Valid Until",
                                    value: formatDate(doc.valid_until),
                                },
                            ]}
                        />
                    ))}
                </>
            )}

            {editing && onboarding && (
                <CertificateFormModal
                    kind={editing.kind}
                    initial={certificateAt(editing)}
                    onClose={() => setEditing(null)}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
}
