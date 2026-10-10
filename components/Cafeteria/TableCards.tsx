"use client";

import type { TableDetails } from "@/data/Tables/type";
import { Armchair, Download, Printer, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";

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

function svgMarkup(svg: SVGSVGElement): string {
    const markup = svg.outerHTML;
    return markup.includes("xmlns=")
        ? markup
        : markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
}

export function TableCards({
    tables,
    onOccupiedSelect,
}: {
    tables: TableDetails[];
    onOccupiedSelect?: (table: TableDetails) => void;
}) {
    const [selectedTable, setSelectedTable] = useState<TableDetails | null>(null);
    const qrRef = useRef<SVGSVGElement>(null);
    const statusStyles: Record<string, string> = {
        Available: "border-emerald-200 bg-emerald-50",
        Occupied: "border-amber-200 bg-amber-50",
    };

    const statusText: Record<string, string> = {
        Available: "text-emerald-700",
        Occupied: "text-amber-700",
    };

    return (
        <section className="mt-4">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">
                    Tables
                </h2>
                <p className="text-xs text-slate-500">
                    {tables.length} table{tables.length === 1 ? "" : "s"}
                </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {tables.map((table) => (
                    <button
                        type="button"
                        key={table.table_id}
                        onClick={() => {
                            if (table.current_status === "Occupied") {
                                onOccupiedSelect?.(table);
                                return;
                            }
                            setSelectedTable(table);
                        }}
                        className={`relative w-full rounded-2xl border p-3 text-left shadow-sm transition hover:shadow-md ${
                            statusStyles[table.current_status] || "border-slate-200 bg-white"
                        }`}
                    >
                        <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                            {table.capacity} seats
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-700">
                            <Armchair size={18} />
                        </div>
                        <p className="mt-3 text-lg font-semibold text-slate-800">
                            {table.table_number}
                        </p>
                        <p
                            className={`mt-1 text-xs font-medium ${
                                statusText[table.current_status] || "text-slate-600"
                            }`}
                        >
                            {table.current_status}
                        </p>
                    </button>
                ))}
            </div>

            {selectedTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <button
                            type="button"
                            onClick={() => setSelectedTable(null)}
                            className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                        <div className="p-5">
                            <h3 className="text-lg font-semibold text-slate-800">
                                Table {selectedTable.table_number}
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {selectedTable.table_id} · {selectedTable.capacity} seats · {selectedTable.current_status}
                            </p>
                            <div className="mt-4 flex justify-center">
                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <QRCodeSVG
                                        ref={qrRef}
                                        value={selectedTable.qrcodeurl || selectedTable.table_id}
                                        size={192}
                                        marginSize={2}
                                    />
                                </div>
                            </div>
                            {selectedTable.qrcodeurl && (
                                <p className="mt-3 break-all font-mono text-[11px] text-slate-600 text-center">
                                    {selectedTable.qrcodeurl}
                                </p>
                            )}
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!selectedTable.qrcodeurl) return;
                                        const qr = qrRef.current;
                                        if (!qr) return;
                                        const blob = new Blob([svgMarkup(qr)], {
                                            type: "image/svg+xml;charset=utf-8",
                                        });
                                        const url = URL.createObjectURL(blob);
                                        const anchor = document.createElement("a");
                                        anchor.href = url;
                                        anchor.download = `${selectedTable.table_number || selectedTable.table_id}-qr.svg`;
                                        document.body.appendChild(anchor);
                                        anchor.click();
                                        anchor.remove();
                                        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    <Download size={14} />
                                    Download SVG
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const qr = qrRef.current;
                                        if (!qr) return;
                                        const win = window.open("", "_blank", "width=440,height=620");
                                        if (!win) return;
                                        const number = escapeHtml(selectedTable.table_number);
                                        const id = escapeHtml(selectedTable.table_id);
                                        const url = selectedTable.qrcodeurl ? escapeHtml(selectedTable.qrcodeurl) : id;
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
    <p>${id} · ${selectedTable.capacity} seats</p>
    <div class="qr">${svgMarkup(qr)}</div>
    <p>Scan to open this table</p>
    <p class="url">${url}</p>
</body>
</html>`);
                                        win.document.close();
                                        win.focus();
                                        window.setTimeout(() => win.print(), 250);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    <Printer size={14} />
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
