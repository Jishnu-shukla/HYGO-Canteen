"use client";

import { addTableApi } from "@/data/Tables/api";
import type { AddTableBody, AddTableResponse } from "@/data/Tables/type";
import { Download, Plus, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState, type FormEvent } from "react";

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

const labelClass =
    "mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500";

type Banner = { kind: "success" | "error"; text: string } | null;

/** Escapes text for interpolation into the print window's HTML. */
function escapeHtml(value: string): string {
    const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };

    return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

/**
 * Serialises the rendered QR <svg> into standalone markup. qrcode.react
 * never writes an xmlns attribute, and a downloaded .svg file without one
 * opens as an empty image outside the page — the print window happens to
 * survive without it, but sharing one path keeps the two identical.
 */
function svgMarkup(svg: SVGSVGElement): string {
    const markup = svg.outerHTML;

    return markup.includes("xmlns=")
        ? markup
        : markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
}

/**
 * "Add table" form — POST /api/table registers a table into the TableOrder
 * collection (the same one GET /api/cafeteria/summary counts available
 * tables from).
 *
 * The client sends only what the contract asks for — table_number and
 * capacity; every other schema field is service-owned. On success the
 * response's qrcodeurl renders as a scannable QR with download (standalone
 * .svg) and print (dedicated print window) actions, since the code is the
 * deliverable a freshly registered table actually needs.
 *
 * `onTableAdded` lets the host screen refresh: a new table lands as
 * "Available", so the summary's available_tables moves.
 */
export function AddTableForm({
    onTableAdded,
}: {
    onTableAdded?: (table: AddTableResponse) => void;
}) {
    const [tableNumber, setTableNumber] = useState("");
    const [capacity, setCapacity] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [banner, setBanner] = useState<Banner>(null);

    /** Set once POST /api/table succeeds — swaps the form for the QR panel. */
    const [created, setCreated] = useState<AddTableResponse | null>(null);

    const qrRef = useRef<SVGSVGElement>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBanner(null);

        const table_number = tableNumber.trim();
        const seats = Number(capacity);

        if (table_number === "") {
            setBanner({
                kind: "error",
                text: "Table number is required — e.g. T-001.",
            });
            return;
        }

        if (!Number.isInteger(seats) || seats < 1) {
            setBanner({
                kind: "error",
                text: "Capacity must be a whole number of at least 1.",
            });
            return;
        }

        const body: AddTableBody = { table_number, capacity: seats };

        setSubmitting(true);

        const result = await addTableApi(body);

        setSubmitting(false);

        if (result.ok) {
            setCreated(result.table);
            onTableAdded?.(result.table);
        } else {
            setBanner({ kind: "error", text: result.error });
        }
    }

    function reset() {
        setCreated(null);
        setTableNumber("");
        setCapacity("");
        setBanner(null);
    }

    /** Standalone .svg of the rendered QR, named after the table. */
    function downloadQr() {
        if (!created || !qrRef.current) return;

        const blob = new Blob([svgMarkup(qrRef.current)], {
            type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${created.table_number || created.table_id}-qr.svg`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        // Revoking synchronously can abort the download in some browsers.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * Opens a print window holding just this QR and its label. window.open
     * from a click handler is user-initiated, so blockers generally allow
     * it — when one still blocks it, say so instead of failing silently.
     */
    function printQr() {
        if (!created || !qrRef.current) return;

        const win = window.open("", "_blank", "width=440,height=620");

        if (!win) {
            setBanner({
                kind: "error",
                text: "Pop-up blocked — allow pop-ups for this site to print the QR code.",
            });
            return;
        }

        const number = escapeHtml(created.table_number);
        const id = escapeHtml(created.table_id);
        const url = escapeHtml(created.qrcodeurl);

        win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>QR — ${number}</title>
<style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 32px 16px; color: #0f172a; }
    h1 { font-size: 20px; margin: 0; }
    p { font-size: 12px; color: #475569; margin: 4px 0 0; }
    .qr { margin: 24px auto; width: fit-content; }
    .url { font-family: ui-monospace, monospace; font-size: 10px; color: #64748b; word-break: break-all; max-width: 320px; margin: 16px auto 0; }
    @media print { body { padding: 0; } }
</style>
</head>
<body>
    <h1>Table ${number}</h1>
    <p>${id} · ${created.capacity} seats</p>
    <div class="qr">${svgMarkup(qrRef.current)}</div>
    <p>Scan to open this table</p>
    <p class="url">${url}</p>
</body>
</html>`);

        win.document.close();
        win.focus();
        window.setTimeout(() => win.print(), 250);
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        {created ? "Table registered" : "Add a table"}
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        {created
                            ? `${created.table_number} · ${created.table_id} · ${created.capacity} seats · ${created.current_status}`
                            : "Registers the table in the seat inventory and mints the QR code its sticker carries."}
                    </p>
                </div>

                {created && (
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        <Plus size={14} />
                        Add another table
                    </button>
                )}
            </div>

            <div className="px-4 py-4">
                {banner && (
                    <p
                        className={`mb-4 rounded-lg border px-3 py-2 text-xs font-medium ${
                            banner.kind === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-red-200 bg-red-50 text-red-700"
                        }`}
                        role="status"
                    >
                        {banner.text}
                    </p>
                )}

                {created ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="shrink-0 self-center rounded-xl border border-slate-200 bg-white p-3 sm:self-start">
                            <QRCodeSVG
                                ref={qrRef}
                                value={created.qrcodeurl}
                                size={192}
                                marginSize={2}
                                title={`QR code for table ${created.table_number}`}
                            />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className={labelClass}>Scan link</p>

                            <p className="break-all font-mono text-[11px] text-slate-600">
                                {created.qrcodeurl}
                            </p>

                            <p className="mt-3 text-[10px] text-slate-400">
                                Scanning opens the frontend at this table; the
                                link is also stored on the registry as
                                qr_code_id. Stick the printed code to the
                                table.
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={downloadQr}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    <Download size={14} />
                                    Download SVG
                                </button>

                                <button
                                    type="button"
                                    onClick={printQr}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    <Printer size={14} />
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="table-number"
                                    className={labelClass}
                                >
                                    Table number
                                </label>

                                <input
                                    id="table-number"
                                    type="text"
                                    required
                                    value={tableNumber}
                                    onChange={(event) =>
                                        setTableNumber(event.target.value)
                                    }
                                    placeholder="T-001"
                                    className={inputClass}
                                />

                                <p className="mt-1 text-[10px] text-slate-400">
                                    Unique across the registry — a duplicate is
                                    rejected as a conflict.
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="table-capacity"
                                    className={labelClass}
                                >
                                    Capacity
                                </label>

                                <input
                                    id="table-capacity"
                                    type="number"
                                    min={1}
                                    step={1}
                                    required
                                    value={capacity}
                                    onChange={(event) =>
                                        setCapacity(event.target.value)
                                    }
                                    placeholder="4"
                                    className={inputClass}
                                />

                                <p className="mt-1 text-[10px] text-slate-400">
                                    Seats at the table — at least 1.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {submitting
                                    ? "Registering…"
                                    : "Add table"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
}
