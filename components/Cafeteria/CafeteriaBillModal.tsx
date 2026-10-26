"use client";

import { getCafeteriaTransactionDetailsApi } from "@/data/Cafeteria/api";
import type {
    CafeteriaPaymentStatus,
    GetCafeteriaTransactionDetails,
} from "@/data/Cafeteria/type";
import {
    formatBillDate,
    formatBillTime,
    formatRupees,
    openBillPrint,
    parseTimestamp,
    paymentModeLabel,
} from "@/components/Cafeteria/bill";
import { Download, Printer, X } from "lucide-react";
import { useEffect, useState } from "react";

const DASH = "—";

/** Chip colours for a bill's payment status, matching the ledger's palette. */
const STATUS_CLASSES: Record<CafeteriaPaymentStatus, string> = {
    Paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Pending: "border-amber-200 bg-amber-50 text-amber-700",
    Refunded: "border-sky-200 bg-sky-50 text-sky-700",
    Cancelled: "border-red-200 bg-red-50 text-red-700",
};

/**
 * The bill for one cafeteria transaction (GET /api/cafeteria/:transaction_id),
 * opened from a ledger row.
 *
 * The response is fetched by the TX-… business id, so this modal mounts with
 * nothing but the id and waits: the header names the bill immediately while the
 * body says it is loading, and a 404/network failure stays inside the modal
 * with a retry rather than closing the reader out.
 *
 * Print and Save as PDF both go through the same generated document: the print
 * dialog is where the destination is chosen, which is how the settle form
 * already prints a bill. Nothing here re-computes the totals — they are the
 * stored amounts, so a manually corrected transaction prints as filed.
 */
export function CafeteriaBillModal({
    transactionId,
    onClose,
}: {
    /** TX-… business id of the row that was clicked. */
    transactionId: string;
    /** Dismisses the modal — backdrop, Escape and the close button all call it. */
    onClose: () => void;
}) {
    const [details, setDetails] = useState<GetCafeteriaTransactionDetails | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [printError, setPrintError] = useState<string | null>(null);

    useEffect(() => {
        // Inlined rather than calling a helper: the set-state-in-effect rule
        // cannot see that this awaits before touching state.
        const load = async () => {
            setLoading(true);
            const data = await getCafeteriaTransactionDetailsApi(transactionId);

            setDetails(data);
            setError(
                data
                    ? null
                    : `Bill ${transactionId} could not be loaded. It may no longer exist.`
            );
            setLoading(false);
        };

        load();
    }, [transactionId]);

    // Escape closes the bill, and the page behind it must not scroll while the
    // modal owns the viewport.
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose]);

    async function retry() {
        setLoading(true);
        setError(null);
        const data = await getCafeteriaTransactionDetailsApi(transactionId);

        setDetails(data);
        setError(
            data
                ? null
                : `Bill ${transactionId} could not be loaded. It may no longer exist.`
        );
        setLoading(false);
    }

    function handlePrint() {
        if (!details) return;

        const result = openBillPrint(details);

        setPrintError(result.ok ? null : result.error);
    }

    const timestamp = details
        ? parseTimestamp(details.transaction_timestamp)
        : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={onClose}
            role="presentation"
        >
            <div
                className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="cafeteria-bill-title"
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <h2
                            id="cafeteria-bill-title"
                            className="text-lg font-semibold text-slate-800"
                        >
                            Bill
                        </h2>

                        <p className="mt-0.5 truncate text-xs text-slate-400">
                            {transactionId}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <p className="px-5 py-10 text-center text-xs text-slate-500">
                        Loading the bill…
                    </p>
                ) : !details ? (
                    <div className="px-5 py-10 text-center">
                        <p className="text-xs text-red-600">
                            {error ?? "The bill could not be loaded."}
                        </p>

                        <button
                            type="button"
                            onClick={retry}
                            className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            Try again
                        </button>
                    </div>
                ) : (
                    <div className="max-h-[65vh] overflow-y-auto bg-slate-50 p-4 sm:p-5">
                        {/* Receipt-styled preview of exactly the document that
                            goes to the printer. */}
                        <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3 border-b-2 border-amber-600 pb-3">
                                <div>
                                    <h3 className="text-base font-semibold tracking-tight text-slate-900">
                                        Cafeteria Bill
                                    </h3>

                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Bill No. {details.transaction_id}
                                    </p>

                                    <p className="text-[11px] text-slate-500">
                                        {timestamp
                                            ? `${formatBillDate(
                                                  timestamp
                                              )}, ${formatBillTime(timestamp)}`
                                            : DASH}
                                    </p>
                                </div>

                                <span
                                    className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                        STATUS_CLASSES[
                                            details.payment_status
                                        ] ?? STATUS_CLASSES.Pending
                                    }`}
                                >
                                    {details.payment_status}
                                </span>
                            </div>

                            <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                                <BillMeta
                                    label="Table"
                                    value={details.table_number || DASH}
                                />
                                <BillMeta
                                    label="Customer type"
                                    value={details.customer_type || DASH}
                                />
                                <BillMeta
                                    label="Customer"
                                    value={
                                        details.customer_name || "Anonymous"
                                    }
                                    muted={!details.customer_name}
                                />
                                <BillMeta
                                    label="Mobile"
                                    value={details.mobile_number || DASH}
                                />
                                <BillMeta
                                    label="Payment mode"
                                    value={paymentModeLabel(
                                        details.payment_mode
                                    )}
                                />
                            </dl>

                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="py-1.5 pr-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                Item
                                            </th>
                                            <th className="px-2 py-1.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                Qty
                                            </th>
                                            <th className="px-2 py-1.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                Rate
                                            </th>
                                            <th className="py-1.5 pl-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {(details.items_purchased ?? [])
                                            .length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="py-6 text-center text-[11px] text-slate-400"
                                                >
                                                    This transaction has no line
                                                    items.
                                                </td>
                                            </tr>
                                        ) : (
                                            details.items_purchased.map(
                                                (item, index) => {
                                                    const quantity = Number(
                                                        item.quantity ?? 0
                                                    );
                                                    const price = Number(
                                                        item.price_at_sale ?? 0
                                                    );
                                                    const amount =
                                                        Number.isFinite(
                                                            quantity
                                                        ) &&
                                                        Number.isFinite(price)
                                                            ? quantity * price
                                                            : 0;

                                                    return (
                                                        <tr
                                                            key={`${item.item_id}-${index}`}
                                                            className="border-b border-slate-100 last:border-0"
                                                        >
                                                            <td
                                                                className="py-1.5 pr-2 text-[11px] text-slate-700"
                                                                title={
                                                                    item.item_id
                                                                }
                                                            >
                                                                {item.recipe_name ||
                                                                    item.item_id ||
                                                                    "Item"}
                                                            </td>
                                                            <td className="px-2 py-1.5 text-right text-[11px] text-slate-600">
                                                                {quantity}
                                                            </td>
                                                            <td className="whitespace-nowrap px-2 py-1.5 text-right text-[11px] text-slate-600">
                                                                {formatRupees(
                                                                    price
                                                                )}
                                                            </td>
                                                            <td className="whitespace-nowrap py-1.5 pl-2 text-right text-[11px] font-semibold text-slate-800">
                                                                {formatRupees(
                                                                    amount
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Stored totals, not a re-sum of the lines: a
                                manually corrected transaction must print as
                                filed. */}
                            <div className="mt-3 ml-auto w-56 space-y-1 text-[11px]">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal</span>
                                    <span>
                                        {formatRupees(details.subtotal_amount)}
                                    </span>
                                </div>

                                <div className="flex justify-between text-slate-600">
                                    <span>Discount</span>
                                    <span>
                                        {formatRupees(details.discount_applied)}
                                    </span>
                                </div>

                                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-[13px] font-bold text-slate-900">
                                    <span>Total</span>
                                    <span>
                                        {formatRupees(details.total_amount)}
                                    </span>
                                </div>
                            </div>

                            <p className="mt-4 text-[10px] leading-relaxed text-slate-400">
                                Amounts are the values stored on the transaction,
                                not re-derived from the lines — a manual discount
                                or correction prints exactly as it was filed.
                                Paid transactions are collected revenue; a
                                Pending tab is not settled yet.
                            </p>
                        </div>
                    </div>
                )}

                {printError && (
                    <p
                        role="status"
                        className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                    >
                        {printError}
                    </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
                    <p className="text-[10px] text-slate-400">
                        PDF: choose &ldquo;Save as PDF&rdquo; as the destination
                        in the print dialog.
                    </p>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={!details}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Printer size={14} />
                            Print
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={!details}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Download size={14} />
                            Save as PDF
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** One label/value pair on the bill's meta grid. */
function BillMeta({
    label,
    value,
    muted = false,
}: {
    label: string;
    value: string;
    muted?: boolean;
}) {
    return (
        <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-200 py-1">
            <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                {label}
            </dt>

            <dd
                className={`truncate text-[11px] font-medium ${
                    muted ? "italic text-slate-400" : "text-slate-700"
                }`}
                title={value}
            >
                {value}
            </dd>
        </div>
    );
}
