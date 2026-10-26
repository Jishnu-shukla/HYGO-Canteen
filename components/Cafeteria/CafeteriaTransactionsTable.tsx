import type {
    CafeteriaPagination,
    CafeteriaTransactionListItem,
} from "@/data/Cafeteria/type";
import {
    formatBillDate,
    formatBillTime,
    formatRupees,
    parseTimestamp,
    paymentModeLabel,
} from "@/components/Cafeteria/bill";

const DASH = "—";

const headCell =
    "whitespace-nowrap px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-700";
const bodyCell = "px-2 py-2 text-[11px] text-slate-600";

/**
 * Column definitions for `table-fixed`, width and heading kept together so the
 * two can never drift apart. transaction_id is deliberately not a column: the
 * ledger's rows are identified by when they were filed and who/where they were
 * for, which is what a reader scans for. It is still the row key.
 */
const COLUMNS = [
    { heading: "Date & Time", width: "19%" },
    { heading: "Customer", width: "23%" },
    { heading: "Mobile", width: "15%" },
    { heading: "Table", width: "10%" },
    { heading: "Payment Mode", width: "16%" },
    { heading: "Amount", width: "17%", align: "right" as const },
];

/**
 * The cafeteria transaction ledger (GET /api/cafeteria), newest first.
 *
 * This is the raw ledger, not a revenue report: the contract carries no
 * payment_status, so an open Pending tab and a settled sale sit side by side
 * and can only be told apart by their amounts/columns. The footnote says so,
 * because a reader would otherwise expect this total to reconcile with the
 * cards above — that number is Paid-only from GET /api/cafeteria/summary.
 *
 * Pagination is server-side: `pagination.total` counts the whole collection
 * while `transactions` holds only the requested page.
 *
 * A row opens the bill for that transaction: the whole row is the click target,
 * and it is focusable so the same action is reachable from the keyboard.
 */
export function CafeteriaTransactionsTable({
    transactions,
    loading = false,
    pagination,
    onPageChange,
    onSelect,
}: {
    transactions: CafeteriaTransactionListItem[];
    loading?: boolean;
    pagination?: CafeteriaPagination;
    onPageChange?: (page: number) => void;
    /** Opens the bill for the clicked row. Without it rows are not clickable. */
    onSelect?: (transaction: CafeteriaTransactionListItem) => void;
}) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 0;
    const totalPages = pagination?.total_pages ?? 1;
    const total = pagination?.total ?? transactions.length;

    const isFirstPage = page <= 1;
    const isLastPage = page >= totalPages;

    // Row range for the "showing X–Y of Z" line.
    const from = total === 0 ? 0 : (page - 1) * limit + 1;
    const to = from === 0 ? 0 : from + transactions.length - 1;

    return (
        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">
                        Transactions
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Cafeteria POS ledger, newest first
                        {onSelect ? " — click a row for its bill" : ""}
                    </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {loading ? "-" : total} RECORDS
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                    <colgroup>
                        {COLUMNS.map((column) => (
                            <col
                                key={column.heading}
                                style={{ width: column.width }}
                            />
                        ))}
                    </colgroup>

                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                            {COLUMNS.map((column) => (
                                <th
                                    key={column.heading}
                                    scope="col"
                                    className={`${headCell} ${
                                        column.align === "right"
                                            ? "text-right"
                                            : ""
                                    }`}
                                >
                                    {column.heading}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={COLUMNS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    Loading transactions...
                                </td>
                            </tr>
                        ) : transactions.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={COLUMNS.length}
                                    className="px-4 py-10 text-center text-xs text-slate-400"
                                >
                                    No cafeteria transaction yet.
                                </td>
                            </tr>
                        ) : (
                            transactions.map((row) => {
                                const timestamp = parseTimestamp(
                                    row.transaction_timestamp
                                );

                                return (
                                    <tr
                                        // The business id is not a column, but it
                                        // is still the stable row identity.
                                        key={row.transaction_id}
                                        onClick={() => onSelect?.(row)}
                                        onKeyDown={(event) => {
                                            if (!onSelect) return;

                                            if (
                                                event.key === "Enter" ||
                                                event.key === " "
                                            ) {
                                                event.preventDefault();
                                                onSelect(row);
                                            }
                                        }}
                                        tabIndex={onSelect ? 0 : undefined}
                                        title={
                                            onSelect
                                                ? "Open the bill"
                                                : undefined
                                        }
                                        className={`border-b border-slate-50 transition last:border-0 hover:bg-slate-50/70 ${
                                            onSelect
                                                ? "cursor-pointer focus:outline-none focus-visible:bg-amber-50/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
                                                : ""
                                        }`}
                                    >
                                        {/* When the row was filed. Time is its
                                            own line so the column stays narrow
                                            without truncating the date. */}
                                        <td className={bodyCell}>
                                            {timestamp ? (
                                                <>
                                                    <p className="truncate font-semibold text-slate-700">
                                                        {formatBillDate(
                                                            timestamp
                                                        )}
                                                    </p>

                                                    <p className="truncate text-[10px] text-slate-400">
                                                        {formatBillTime(
                                                            timestamp
                                                        )}
                                                    </p>
                                                </>
                                            ) : (
                                                <span
                                                    title={
                                                        row.transaction_timestamp
                                                    }
                                                    className="text-slate-400"
                                                >
                                                    {DASH}
                                                </span>
                                            )}
                                        </td>

                                        {/* Anonymous is the QR self-order
                                            default, so it is labelled rather
                                            than left blank. */}
                                        <td className={bodyCell}>
                                            <p
                                                title={
                                                    row.customer_name ??
                                                    "Placed anonymously"
                                                }
                                                className={`truncate ${
                                                    row.customer_name
                                                        ? "font-semibold text-slate-700"
                                                        : "italic text-slate-400"
                                                }`}
                                            >
                                                {row.customer_name ||
                                                    "Anonymous"}
                                            </p>

                                            <p className="truncate text-[10px] text-slate-400">
                                                {row.customer_type || DASH}
                                            </p>
                                        </td>

                                        <td
                                            className={`${bodyCell} truncate`}
                                            title={
                                                row.mobile_number ?? undefined
                                            }
                                        >
                                            {row.mobile_number || DASH}
                                        </td>

                                        {/* Empty string means the TableOrder row
                                            behind table_id could not be
                                            resolved — not a table numbered "".
                                        */}
                                        <td className={bodyCell}>
                                            {row.table_number ? (
                                                <span className="inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                                                    {row.table_number}
                                                </span>
                                            ) : (
                                                <span
                                                    title="The referenced table could not be resolved"
                                                    className="text-slate-400"
                                                >
                                                    {DASH}
                                                </span>
                                            )}
                                        </td>

                                        <td className={bodyCell}>
                                            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                {paymentModeLabel(
                                                    row.payment_mode
                                                )}
                                            </span>
                                        </td>

                                        {/* Stored total as filed, whatever the
                                            settlement status. */}
                                        <td
                                            className={`${bodyCell} text-right font-bold text-slate-800`}
                                        >
                                            {formatRupees(row.total_amount)}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <p className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[10px] text-slate-400">
                Every transaction is listed, whatever its payment status — an
                open tab and a settled sale look alike here. Paid-only revenue
                is the figure on the cards above.
            </p>

            {onPageChange && total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                    <p className="text-[11px] text-slate-500">
                        {loading
                            ? "Loading..."
                            : `Showing ${from}–${to} of ${total}`}
                    </p>

                    <div className="flex items-center gap-2">
                        <PagerButton
                            label="Previous"
                            disabled={loading || isFirstPage}
                            onClick={() => onPageChange(page - 1)}
                        />

                        <span className="min-w-[70px] text-center text-[11px] font-semibold text-slate-600">
                            Page {page} of {totalPages}
                        </span>

                        <PagerButton
                            label="Next"
                            disabled={loading || isLastPage}
                            onClick={() => onPageChange(page + 1)}
                        />
                    </div>
                </div>
            )}
        </section>
    );
}

function PagerButton({
    label,
    disabled,
    onClick,
}: {
    label: string;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
            {label}
        </button>
    );
}
