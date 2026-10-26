import type {
    CafeteriaPaymentMode,
    CafeteriaPaymentStatus,
    GetCafeteriaTransactionDetails,
} from "@/data/Cafeteria/type";

/**
 * Formatting and bill-document helpers shared by the transaction ledger and the
 * bill modal.
 *
 * The printed bill follows the pattern the settle form already uses: a
 * generated HTML document in its own window, then the browser's print dialog —
 * from there the cashier prints a paper copy or picks "Save as PDF" as the
 * destination. One builder serves both buttons so the two can never disagree.
 */

const DASH = "—";

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
});

/** Parses the contract's ISO timestamp; null when it is not a usable date. */
export function parseTimestamp(value: string): Date | null {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

/** "1 Oct 2026" */
export function formatBillDate(date: Date): string {
    return DATE_FORMAT.format(date);
}

/** "3:42 pm" */
export function formatBillTime(date: Date): string {
    return TIME_FORMAT.format(date);
}

/** ₹1,234 or ₹1,234.5 — the stored amount at the precision it carries. */
export function formatRupees(value: number): string {
    return `₹${Number(value ?? 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
    })}`;
}

/**
 * The wire value spelled for display: Credit_Card -> "Credit Card",
 * Hospital_Payroll_Deduction -> "Payroll Deduction". Unknown future enum
 * values still render with their underscores removed rather than disappearing.
 */
export const PAYMENT_MODE_LABELS: Record<CafeteriaPaymentMode, string> = {
    Cash: "Cash",
    UPI: "UPI",
    Credit_Card: "Credit Card",
    Hospital_Payroll_Deduction: "Payroll Deduction",
};

export function paymentModeLabel(mode: CafeteriaPaymentMode | string): string {
    const known = PAYMENT_MODE_LABELS[mode as CafeteriaPaymentMode];

    if (known) return known;

    const cleaned = String(mode ?? "")
        .replaceAll("_", " ")
        .trim();

    return cleaned || DASH;
}

/** Escapes text destined for the generated bill document. */
export function escapeHtml(value: string): string {
    const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    };

    return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

/** Print-document colour per payment status. */
const STATUS_STYLES: Record<CafeteriaPaymentStatus, string> = {
    Paid: "paid",
    Pending: "pending",
    Refunded: "refunded",
    Cancelled: "cancelled",
};

/**
 * The bill as a standalone HTML document.
 *
 * Everything is printed from the response, not re-derived: a line's amount is
 * quantity × price_at_sale for the reader's convenience while the totals block
 * prints the STORED subtotal/discount/total, so a manually corrected
 * transaction prints exactly what was filed. That is also why the footer keeps
 * the "stored amounts" caveat visible.
 */
export function buildCafeteriaBillHtml(
    details: GetCafeteriaTransactionDetails
): string {
    const timestamp = parseTimestamp(details.transaction_timestamp);
    const when = timestamp
        ? `${formatBillDate(timestamp)}, ${formatBillTime(timestamp)}`
        : DASH;

    const rows = (details.items_purchased ?? [])
        .map((item) => {
            const quantity = Number(item.quantity ?? 0);
            const price = Number(item.price_at_sale ?? 0);
            const amount =
                Number.isFinite(quantity) && Number.isFinite(price)
                    ? quantity * price
                    : 0;

            return `<tr>
                <td>${escapeHtml(item.recipe_name || item.item_id || "Item")}</td>
                <td class="num">${escapeHtml(String(quantity))}</td>
                <td class="num">${escapeHtml(formatRupees(price))}</td>
                <td class="num">${escapeHtml(formatRupees(amount))}</td>
            </tr>`;
        })
        .join("");

    const status = details.payment_status;
    const statusClass = STATUS_STYLES[status] ?? "pending";

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Cafeteria Bill — ${escapeHtml(details.transaction_id)}</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a;
           padding: 32px; margin: 0 auto; max-width: 760px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2px solid #d97706; padding-bottom: 12px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; margin: 2px 0; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px;
             font-size: 11px; font-weight: 700; border: 1px solid #e2e8f0; }
    .badge.paid { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
    .badge.pending { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .badge.refunded { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .badge.cancelled { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-top: 16px; }
    .meta div { display: flex; justify-content: space-between; gap: 12px;
                border-bottom: 1px dashed #e2e8f0; padding: 4px 0; font-size: 12px; }
    .meta span:first-child { color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 16px; width: 280px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
    .totals .grand { font-weight: 700; font-size: 15px; border-top: 1px solid #e2e8f0;
                     margin-top: 4px; padding-top: 8px; }
    .foot { margin-top: 28px; font-size: 11px; line-height: 1.5; color: #94a3b8; }
    @media print { body { padding: 0; } }
</style>
</head>
<body>
    <div class="head">
        <div>
            <h1>Cafeteria Bill</h1>
            <p class="muted">Bill No. ${escapeHtml(details.transaction_id)}</p>
            <p class="muted">${escapeHtml(when)}</p>
        </div>
        <span class="badge ${statusClass}">${escapeHtml(status)}</span>
    </div>

    <div class="meta">
        <div><span>Table</span><span>${escapeHtml(details.table_number || DASH)}</span></div>
        <div><span>Customer type</span><span>${escapeHtml(details.customer_type || DASH)}</span></div>
        <div><span>Customer</span><span>${escapeHtml(details.customer_name || "Anonymous")}</span></div>
        <div><span>Mobile</span><span>${escapeHtml(details.mobile_number || DASH)}</span></div>
        <div><span>Payment mode</span><span>${escapeHtml(paymentModeLabel(details.payment_mode))}</span></div>
    </div>

    <table>
        <thead>
            <tr><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>

    <div class="totals">
        <div><span>Subtotal</span><span>${escapeHtml(formatRupees(details.subtotal_amount))}</span></div>
        <div><span>Discount</span><span>${escapeHtml(formatRupees(details.discount_applied))}</span></div>
        <div class="grand"><span>Total</span><span>${escapeHtml(formatRupees(details.total_amount))}</span></div>
    </div>

    <p class="foot">
        Amounts are the values stored on the transaction, not re-derived from the
        lines — a manual discount or correction prints exactly as it was filed.
        Paid transactions are collected revenue; a Pending tab is not settled yet.
    </p>
</body>
</html>`;
}

/**
 * Opens the bill in its own window and triggers the browser's print dialog.
 *
 * Synchronous on purpose: the window must be opened inside the click handler or
 * the browser treats it as a pop-up. When the pop-up is blocked the caller gets
 * an error string instead of a silent no-op.
 */
export function openBillPrint(
    details: GetCafeteriaTransactionDetails
): { ok: true } | { ok: false; error: string } {
    const win = window.open("", "_blank", "width=900,height=700");

    if (!win) {
        return {
            ok: false,
            error: "Pop-up blocked — allow pop-ups for this site to print the bill.",
        };
    }

    win.document.write(buildCafeteriaBillHtml(details));
    win.document.close();
    win.focus();
    window.setTimeout(() => win.print(), 250);

    return { ok: true };
}
