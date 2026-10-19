"use client";

import { getTableTransactionDetailsApi } from "@/data/Cafeteria/api";
import type {
    GetTableTransactionDetailsItem,
} from "@/data/Cafeteria/type";
import type { TableDetails } from "@/data/Tables/type";
import {
    clearKotSnapshot,
    diffKotItems,
    loadKotSnapshot,
    saveKotSnapshot,
} from "@/components/Cafeteria/kotSnapshot";
import { showErrorToast } from "@/utils/toast";
import { Armchair, ChefHat, Download, LoaderCircle, Printer, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useRef, useState } from "react";

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

/**
 * Print-ready Kitchen Order Ticket for a table's open tab: table number, time
 * and the item lines with quantities. Deliberately no prices — this is the
 * kitchen's copy, while the bill is the customer's settled copy.
 *
 * `items` is what THIS ticket covers: the whole tab on the first KOT, only
 * the not-yet-sent lines on later ones. The footer says which it was, so the
 * kitchen can tell a fresh table from a top-up at a glance.
 */
function buildKotDocument(
    table: TableDetails,
    items: GetTableTransactionDetailsItem[],
    kotNumber: number,
    isFirstKot: boolean
): string {
    const rows = items
        .map((item) => {
            const name = escapeHtml(item.recipe_name || item.item_id || "Item");

            return `<tr><td class="qty">${escapeHtml(
                String(item.quantity)
            )}×</td><td>${name}</td></tr>`;
        })
        .join("");

    const number = escapeHtml(table.table_number);
    const placedAt = escapeHtml(new Date().toLocaleString("en-IN"));
    const note = isFirstKot
        ? "First order"
        : "New items only — earlier lines already in the kitchen";

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>KOT #${kotNumber} — Table ${number}</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; color: #0f172a; margin: 0; padding: 24px; }
    h1 { font-size: 18px; margin: 0; letter-spacing: 0.08em; }
    .sub { font-size: 11px; color: #475569; margin-top: 4px; }
    .meta { display: flex; justify-content: space-between; margin: 16px 0 8px; font-size: 12px; font-weight: 700; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1; padding: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { font-size: 13px; padding: 6px 0; vertical-align: top; border-bottom: 1px dashed #cbd5e1; }
    td.qty { width: 48px; font-weight: 700; white-space: nowrap; }
    .total { margin-top: 14px; font-size: 12px; font-weight: 700; }
    .note { margin-top: 4px; font-size: 11px; color: #475569; }
    @media print { body { padding: 8px; } }
</style>
</head>
<body>
    <h1>KITCHEN ORDER TICKET</h1>
    <p class="sub">Cafeteria · ${escapeHtml(table.table_id)}</p>
    <div class="meta"><span>Table ${number} · KOT #${kotNumber}</span><span>${placedAt}</span></div>
    <table><tbody>${rows}</tbody></table>
    <p class="total">${items.length} line${items.length === 1 ? "" : "s"}</p>
    <p class="note">${note}</p>
</body>
</html>`;
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

    // Table whose KOT is being fetched, so only that card's icon spins.
    const [kotBusyTableId, setKotBusyTableId] = useState<string | null>(null);

    /**
     * Opens the occupied table's open tab as a print-ready Kitchen Order
     * Ticket, from which the browser can print or "Save as PDF".
     *
     * The window is opened synchronously inside the click so the pop-up is not
     * blocked, then filled in once the tab arrives; a fetch failure closes the
     * placeholder and the API layer has already raised its own toast.
     */
    async function handleViewKot(table: TableDetails) {
        if (kotBusyTableId) return;

        const win = window.open("", "_blank", "width=460,height=640");

        if (!win) {
            showErrorToast(
                "Pop-up blocked — allow pop-ups for this site to view the KOT."
            );
            return;
        }

        win.document.write(
            '<!doctype html><title>KOT</title><body style="font-family:system-ui,sans-serif;padding:24px;color:#475569">Loading KOT…</body>'
        );

        setKotBusyTableId(table.table_id);

        try {
            const tab = await getTableTransactionDetailsApi({
                table_number: table.table_number,
            });

            if (!tab) {
                win.close();
                return;
            }

            if (tab.items_purchased.length === 0) {
                // Tab is gone (settled or never opened): forget any printed
                // history so the next order starts a fresh KOT series.
                clearKotSnapshot(table.table_id);
                win.close();
                showErrorToast(`No open order on table ${table.table_number}.`);
                return;
            }

            // First KOT of this tab prints everything; every later KOT prints
            // only the lines (and excess quantities) not yet sent to the
            // kitchen, by diffing the full API response against the snapshot.
            const snapshot = loadKotSnapshot(table.table_id);
            const newItems = diffKotItems(snapshot, tab.items_purchased);

            if (newItems.length === 0) {
                win.close();
                showErrorToast(
                    `No new items on table ${table.table_number} since the last KOT.`
                );
                return;
            }

            const kotNumber = (snapshot?.kotNumber ?? 0) + 1;

            win.document.open();
            win.document.write(
                buildKotDocument(table, newItems, kotNumber, !snapshot)
            );
            win.document.close();
            win.focus();
            window.setTimeout(() => win.print(), 300);

            // Remember the full tab (not just the new lines) so the next KOT
            // compares against everything the kitchen has already seen.
            saveKotSnapshot(table.table_id, kotNumber, tab.items_purchased);
        } catch (error) {
            console.log(error);
            win.close();
            showErrorToast("Could not load the KOT for this table.");
        } finally {
            setKotBusyTableId(null);
        }
    }

    // Always render in table-number order, regardless of the order the API
    // returns. Numeric collation keeps "T-2" ahead of "T-10" instead of
    // sorting them as raw strings.
    const sortedTables = useMemo(
        () =>
            [...tables].sort((a, b) =>
                a.table_number.localeCompare(b.table_number, undefined, {
                    numeric: true,
                    sensitivity: "base",
                })
            ),
        [tables]
    );

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
                {sortedTables.map((table) => (
                    <div
                        key={table.table_id}
                        className="relative"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                if (table.current_status === "Occupied") {
                                    onOccupiedSelect?.(table);
                                    return;
                                }
                                setSelectedTable(table);
                            }}
                            className={`w-full rounded-2xl border p-3 text-left shadow-sm transition hover:shadow-md ${
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

                        {table.current_status === "Occupied" && (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleViewKot(table);
                                }}
                                disabled={kotBusyTableId === table.table_id}
                                title={`View KOT for table ${table.table_number}`}
                                aria-label={`View kitchen order ticket for table ${table.table_number}`}
                                className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300 bg-white text-amber-700 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {kotBusyTableId === table.table_id ? (
                                    <LoaderCircle size={14} className="animate-spin" />
                                ) : (
                                    <ChefHat size={14} />
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {selectedTable && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onMouseDown={() => setSelectedTable(null)}
                >
                    <div
                        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
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
