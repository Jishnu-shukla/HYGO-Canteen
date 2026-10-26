/* ------------------------------------------------------------------ *
 * GET /api/cafeteria/summary
 * ------------------------------------------------------------------ */

/**
 * Request/response contract for GET /api/cafeteria/summary.
 *
 * The HTTP body reads { statusCode, message, data: CafeteriaSummary,
 * success } — `data` is the object below, the same envelope
 * GET /api/fssaichecklist returns.
 *
 * One flat object describing today's cafeteria POS run and current seating.
 * No query parameters — "today" is always the same Asia/Kolkata local-day
 * window the dashboard uses (dashboard.service.getTodayRange()), so this
 * endpoint and GET /api/dashboard cannot disagree about which day they mean,
 * and there is no way for a client to ask for a different one.
 *
 * Two of the three numbers come from different collections:
 *
 *   - today_revenue  /  transactions  -> the Cafeteria POS ledger, one doc per
 *                                        transaction, filtered to today.
 *   - available_tables                -> the TableOrder collection, which is
 *                                        the only place table occupancy lives.
 *                                        The Cafeteria schema records no table
 *                                        concept: it is purely
 *                                        customer -> items -> amounts -> payment.
 */
export interface CafeteriaSummary {
    /**
     * Sum of total_amount across today's transactions with
     * payment_status: "Paid".
     *
     * Identical query and filter to dashboard.service.getTodayCafeteriaSales(),
     * so this field and GET /api/dashboard's cafeteria_sales are the same
     * number by construction. Refunded transactions are NOT added back in —
     * their amounts were returned, so they contribute 0 revenue while still
     * counting under transactions. 0 when no paid sale has been filed today.
     */
    today_revenue: number;
    /**
     * Count of today's SETTLED transactions: payment_status is "Paid" or
     * "Refunded". Pending is deliberately excluded — the money has not moved
     * yet, so a Pending row is a draft, not a transaction to report.
     *
     * Because Refunded rows count here but not in today_revenue, this is not
     * a "paid transaction count" and must not be used as the denominator for an
     * average ticket: that would understate revenue per ticket on days with
     * refunds. 0 when no settled transaction has been filed today.
     */
    transactions: number;
    /**
     * Tables that are free to seat right now:
     * TableOrder.countDocuments({ current_status: "Available" }).
     *
     * Sourced from the TableOrder collection (current_status is exactly
     * "Occupied" | "Available"), not from Cafeteria — a point-in-time count,
     * so it moves between calls as tables are seated and freed, and carries no
     * sense of a physical table inventory beyond what is registered there.
     */
    available_tables: number;
}

/* ------------------------------------------------------------------ *
 * POST /api/cafeteria/table
 * ------------------------------------------------------------------ */

/**
 * One line of the customer's order. The customer names the quantity and the
 * menu price they saw; the service trusts it for a "basic" transaction rather
 * than re-pricing against GeneralMenuItem.selling_price.
 */
export interface CafeteriaItemPurchased {
    /**
     * The MasterMenuItem's BUSINESS id MSTI-000001 style) — never a raw
     * ObjectId, per API convention. The schema's item_id is an ObjectId ref
     * to "MasterMenuItem", so the service resolves this string to that id
     * before persisting.
     *
     * Note for the picker: the live GET /api/menu rows carry MST-000001-style
     * ids (no "I") — send back whatever master_item_id the menu returns and
     * make no assumption about the prefix.
     */
    item_id: string;
    /** Count bought. The schema enforces min: 1 at write time. */
    quantity: number;
    /** Unit price at sale, as shown to the customer. Schema min: 0. */
    price_at_sale: number;
}

/**
 * Body for POST /api/cafeteria/table — a customer at a table places an order.
 *
 * The Cafeteria document is NOT a mirror of this body. The service owns every
 * field this interface omits, so the client can neither forge them nor leave
 * the document invalid:
 *
 *   - transaction_id      minted via generateId (server-side business id)
 *   - customer_type       defaulted to "Visitor" — no auth context exists to
 *                         know Staff/Outpatient/Relative yet
 *   - subtotal_amount     computed: Σ(quantity × price_at_sale)
 *   - discount_applied    0 — no discount flow in this basic version
 *   - total_amount        computed: subtotal − discount
 *   - payment_mode        defaulted to "Cash"
 *   - payment_status      defaulted to "Pending": the order is placed at the
 *                         table and settled later at the counter
 *   - cashier_id          a placeholder ObjectId until auth middleware lands
 *                         (the schema required it, like fssai's inspector_id)
 *
 * table_id is the identifier for those omitted decisions: it is VALIDATED,
 * not persisted — the Cafeteria schema records no table, so the service only
 * checks the id against TableOrder.table_number and rejects unknown tables.
 * customer_name is display-only, never persisted (the schema has
 * customer_id, no name field) — the same rule patient_name follows on
 * /api/dietorder.
 */
export interface AddTableOrderBody {
    /**
     * TableOrder.table_number business id of the table the order is placed
     * from (e.g. the table's "T-001", typically scanned from its QR code).
     * Validate-only: matched against the TableOrder collection, never written
     * into the Cafeteria transaction.
     */
    table_id: string;
    /**
     * Display-only customer name, never persisted — echoed back in the
     * response so the row can render without a join. A real customer identity
     * will arrive later via auth and customer_id.
     */
    customer_name: string;
    /** The order lines; at least one entry. */
    items_purchased: CafeteriaItemPurchased[];
}

/**
 * Success envelope of POST /api/cafeteria/table — the usual
 * { statusCode, message, data, success } body.
 *
 * `data` is the created Cafeteria transaction — server-minted transaction_id,
 * computed subtotal_amount/total_amount, payment_status "Pending" — plus the
 * echoed customer_name so a row can render without a join. Treated as opaque
 * here: the form only needs the success flag and the message, and re-reading
 * fields the server just computed would only risk disagreeing with them.
 */
export interface PlaceTableOrderResponse {
    statusCode: number;
    message: string;
    success: boolean;
    data: Record<string, unknown>;
}

/* ------------------------------------------------------------------ *
 * GET /api/cafeteria/table
 * ------------------------------------------------------------------ */

/**
 * Query for GET /api/cafeteria/table — which table to fetch.
 *
 * The frontend identifies a table by its NUMBER TableOrder.table_number,
 * e.g. "20"), the same spelling POST /api/cafeteria/table accepts as
 * table_id. The response still reports both identities: the number the
 * caller passed and the TBL-… business id from the QR code's qrcodeurl.
 */
export interface GetTableTransactionDetailsQuery {
    /** The table's number TableOrder.table_number); trimmed, must be non-empty. */
    table_number: string;
}

/**
 * One line of the GET response's items_purchased.
 */
export interface GetTableTransactionDetailsItem {
    /** The MasterMenuItem's business id (MSTI-000001 style), resolved back from the stored ObjectId refs. */
    item_id: string;
    /** MasterMenuItem.recipe_name for that item_id — the display name. */
    recipe_name: string;
    /** Count bought. */
    quantity: number;
    /** Unit price at sale, as stored on the line. */
    price_at_sale: number;
}

/**
 * A table's open tab, as returned.
 *
 * This is a READ of the transaction the POST/append flow maintains — it
 * writes nothing. table_id (TBL-…) and table_number both come from the
 * TableOrder row, while items_purchased / subtotal_amount come from the
 * table's newest payment_status: "Pending" Cafeteria transaction: the tab
 * still open at that table.
 *
 * When the table exists but has NO open tab (never ordered from, or its tab
 * was settled), items_purchased is [] and subtotal_amount is 0 —
 * "nothing on the table" rather than an error, so the frontend can render an
 * empty table page. An unknown table is still a 404.
 */
export interface GetTableTransactionDetails {
    /** The TableOrder business id TBL-000001 style) of the table. */
    table_id: string;
    /** The table's number TableOrder.table_number), e.g. "20". */
    table_number: string;
    /**
     * Every line currently on the tab, oldest request first. Each item_id is
     * the MSTI-… business id, resolved back from the stored ObjectId refs, and
     * is paired with that item's recipe_name so the row renders without a
     * join. [] when no tab is open.
     */
    items_purchased: GetTableTransactionDetailsItem[];
    /**
     * Σ(quantity × price_at_sale) over items_purchased — the stored
     * subtotal_amount of the open tab, NOT a re-computation, so it always
     * matches what POST reported. 0 when no tab is open.
     */
    subtotal_amount: number;
}

/* ------------------------------------------------------------------ *
 * PUT /api/cafeteria/table
 * ------------------------------------------------------------------ */

export type CafeteriaCustomerType =
    | "Staff"
    | "Outpatient"
    | "Visitor"
    | "Relative";

export type CafeteriaPaymentMode =
    | "Cash"
    | "UPI"
    | "Credit_Card"
    | "Hospital_Payroll_Deduction";

export type CafeteriaPaymentStatus =
    | "Pending"
    | "Paid"
    | "Refunded"
    | "Cancelled";

/**
 * Body for PUT /api/cafeteria/table — replace the fields of a table's OPEN
 * transaction.
 *
 * Every field was checked against cafeteriaSchema; all ten are writable
 * schema fields, and the three fields the schema owns are correctly absent:
 *
 *   | schema field          | in body | why                                 |
 *   | --------------------- | ------- | ----------------------------------- |
 *   | transaction_id        | no      | server-minted, immutable business id|
 *   | customer_type         | yes     | enum CAFETERIA_CUSTOMER_TYPES       |
 *   | customer_name         | yes     | string \| null matches default null |
 *   | mobile_number         | yes     | string \| null matches default null |
 *   | items_purchased       | yes     | lines, MSTI-… ids (refs stored)      |
 *   | table_id              | yes     | VERIFICATION ONLY — see below       |
 *   | subtotal_amount       | yes     | writable, min 0                     |
 *   | discount_applied      | yes     | writable, min 0                     |
 *   | total_amount          | yes     | writable, min 0                     |
 *   | payment_mode          | yes     | enum CAFETERIA_PAYMENT_MODES        |
 *   | payment_status        | yes     | enum CAFETERIA_PAYMENT_STATUSES     |
 *   | cashier_id            | no      | placeholder ObjectId until auth lands|
 *   | transaction_timestamp | no      | server-owned                        |
 *
 * table_id is the one field here that is NOT an update: it names the table
 * whose transaction is being verified and located (unknown table -> 404). The
 * service deliberately leaves it out of the $set, so a caller can never
 * re-point a transaction at another table — the value in the response is the
 * one the transaction was created with.
 *
 * table_id identifies the table by its NUMBER TableOrder.table_number,
 * the same spelling POST accepts), and targets that table's OPEN tab — the
 * newest payment_status: "Pending" transaction, i.e. the one GET reads and
 * POST appends to. Once it is settled, the endpoint has nothing to update and
 * answers 404: settled history is not editable through this route.
 *
 * The amounts are taken as sent rather than re-derived from items_purchased
 * — a discount or manual correction is applied exactly as the client
 * computed it, so total_amount is whatever the body says, not
 * subtotal − discount.
 *
 * This endpoint also SETTLES the tab: the service forces payment_status to
 * "Paid" and consumes stock for the lines being written — every unit sold draws
 * its recipe's ingredients from the store room, soonest-expiry-first, the same
 * FEFO draw the kitchen ready flow makes. If stock cannot cover the sale the
 * request fails 409 and nothing moves (the tab stays Pending, the table stays
 * Occupied), so the response contract is unchanged.
 */
export interface CreateCafeteriaTransactionBody {
    customer_type: CafeteriaCustomerType;
    customer_name: string | null;
    mobile_number: string | null;
    items_purchased: CafeteriaItemPurchased[];
    /** Table verification only (TableOrder.table_number) — never written back. */
    table_id: string;
    subtotal_amount: number;
    discount_applied: number;
    total_amount: number;
    payment_mode: CafeteriaPaymentMode;
    payment_status: CafeteriaPaymentStatus;
}

/**
 * PUT /api/cafeteria/table response — the updated transaction after the
 * $set landed. Same row shape as a POST response (hence the alias): the
 * stored table_id is echoed too, proving which transaction was touched.
 *
 * The alias is deliberate even though settling also draws stock: the deduction
 * is a side effect, so a settle carries exactly the same fields as a posted
 * order (no stock counts) and the two contracts cannot drift apart.
 */
export type UpdateTableOrderResponse = PlaceTableOrderResponse;

/* ------------------------------------------------------------------ *
 * GET /api/cafeteria/days
 * ------------------------------------------------------------------ */

/**
 * One point of the monthly cafeteria-sales chart — the same { label, value }
 * shape as GET /api/platewaste/diettype's rows, so a chart can render either
 * payload without a per-endpoint transformation.
 */
export interface CafeteriaDaySales {
    /**
     * The local calendar day this point covers, as YYYY-MM-DD (Asia/Kolkata,
     * the same local-day rule as getLocalDayRange). Deliberately a date, not a
     * timestamp: the chart shows one point per day, and the month is already
     * fixed by the query. The frontend formats it for display.
     */
    label: string;
    /**
     * Cafeteria revenue for that day: Σ total_amount over transactions whose
     * payment_status is "Paid".
     *
     * Same revenue rule as CafeteriaSummary.today_revenue and GET
     * /api/dashboard's cafeteria_sales, so a single day read here agrees with
     * both. Pending rows are ignored (the money has not been collected yet) and
     * Refunded rows contribute 0 (the amount was returned) — a day whose only
     * activity was refunds is 0, never negative. 0 when the day has no paid
     * sale.
     */
    value: number;
}

/**
 * Query for GET /api/cafeteria/days — which month to chart.
 *
 * Optional, mirroring GET /api/cafeteria/summary's no-argument "today" default:
 * omitting it charts the current local month, so the first call needs no query
 * string at all.
 */
export interface GetCafeteriaDaysQuery {
    /**
     * Month to report as YYYY-MM (e.g. "2026-10"). Must be a real calendar
     * month; anything else is a 400. Defaults to the current local month.
     */
    month?: string;
}

/**
 * GET /api/cafeteria/days — chart payload, one point per day of the month.
 *
 * days is in ascending calendar order and zero-filled: every day of the
 * selected month appears, including days with no paid sale (value: 0), so the
 * x-axis stays continuous and the frontend never has to invent the missing
 * days. That is deliberately different from GET /api/platewaste/diettype,
 * which omits empty groups because a diet type with no logs is not a day on a
 * timeline.
 */
export interface GetCafeteriaDaysResponse {
    days: CafeteriaDaySales[];
}

/* ------------------------------------------------------------------ *
 * GET /api/cafeteria
 * ------------------------------------------------------------------ */

/** GET /api/cafeteria?page=1&limit=10 */
export interface GetCafeteriaQuery {
    /** 1-based. Defaults to 1. */
    page?: number;
    /** Page size. Defaults to 10, capped at 100. */
    limit?: number;
}

/** Page metadata, so the UI can render a pager without a second request. */
export interface CafeteriaPagination {
    page: number;
    limit: number;
    /** Total matching rows across all pages. */
    total: number;
    total_pages: number;
}

/**
 * One row of the cafeteria transaction history — the columns the history table
 * renders, and nothing else.
 *
 * table_number is the human-readable number, resolved from the transaction's
 * stored table_id (the TBL-… TableOrder business id) through the table
 * collection. It is never the raw TBL-… id, and it is an empty string only
 * if the referenced TableOrder row cannot be found.
 *
 * payment_status is deliberately absent: this is the raw ledger, so a
 * still-open Pending tab and a settled sale look alike here apart from their
 * totals. Revenue questions belong to GET /api/cafeteria/summary.
 */
export interface CafeteriaTransactionListItem {
    /** Business id of the transaction, e.g. "TX-000001". */
    transaction_id: string;
    /** A CAFETERIA_CUSTOMER_TYPES value; "Visitor" for a QR self-order. */
    customer_type: CafeteriaCustomerType;
    /** Null when the order was placed anonymously (the QR self-order default). */
    customer_name: string | null;
    /** Null when no mobile number was captured. */
    mobile_number: string | null;
    /** Table number (TableOrder.table_number) resolved from the stored table_id. */
    table_number: string;
    /**
     * Stored total_amount (subtotal − discount) for the transaction, taken
     * as-is so a manual discount/correction is reported exactly as it was filed.
     * It is the transaction's amount regardless of settlement status.
     */
    total_amount: number;
    /** A CAFETERIA_PAYMENT_MODES value. */
    payment_mode: CafeteriaPaymentMode;
    /** When the transaction was filed, as an ISO 8601 string. */
    transaction_timestamp: string;
}

/**
 * GET /api/cafeteria — the paginated transaction ledger, newest first.
 *
 * No filters: every transaction is listed, whatever its payment status, and
 * the sort is transaction_timestamp desc with _id desc as the tie-break so
 * rows filed in the same second keep a stable order. data is only the
 * requested page while pagination.total describes the whole collection.
 */
export interface GetCafeteriaResponse {
    data: CafeteriaTransactionListItem[];
    pagination: CafeteriaPagination;
}

/* ------------------------------------------------------------------ *
 * GET /api/cafeteria/:transaction_id
 * ------------------------------------------------------------------ */

/**
 * Route param: GET /api/cafeteria/:transaction_id
 *
 * Optional at the type level only — the controller's requireParam guard
 * enforces presence with a 400. The value is the transaction's TX-… business
 * id, never the Mongo _id.
 */
export interface GetCafeteriaTransactionParams {
    /** Business id of the transaction, e.g. "TX-000001". */
    transaction_id?: string;
}

/**
 * One printed invoice line: the master item, its display name, and the
 * quantity/price as sold.
 *
 * item_id and recipe_name are resolved from the stored MasterMenuItem ref.
 * If that catalog row has vanished, both fall back to the ref's raw ObjectId
 * string so the line still renders — a historical invoice is never refused
 * because one item was removed from the catalog.
 */
export interface CafeteriaInvoiceItem {
    /** MasterMenuItem business id, e.g. "MSTI-000001". */
    item_id: string;
    /** MasterMenuItem.recipe_name — the name printed on the line. */
    recipe_name: string;
    /** Count sold. */
    quantity: number;
    /** Unit price at sale, as stored on the line. */
    price_at_sale: number;
}

/**
 * GET /api/cafeteria/:transaction_id — everything the invoice screen prints.
 *
 * The transaction is addressed by its TX-… business id; an unknown id is a
 * 404. table_number is resolved from the stored table_id (the TBL-…
 * TableOrder business id), and is "" only when that table row no longer
 * exists.
 *
 * Amounts are the STORED values, not re-derived from the lines. PUT takes the
 * amounts as sent, so a manual discount/correction is reported exactly as it
 * was filed: a line's amount is quantity × price_at_sale, and those line
 * amounts are not guaranteed to add up to subtotal_amount on a manually
 * corrected transaction.
 *
 * Deliberately absent: the Mongo _id, the raw table_id, cashier_id (a
 * placeholder ObjectId until auth lands) and the internal timestamps. None of
 * them is printed on an invoice, and omitting them keeps the projection from
 * leaking them if the schema grows.
 */
export interface GetCafeteriaTransactionDetails {
    /** Business id of the transaction, e.g. "TX-000001". */
    transaction_id: string;
    /** A CAFETERIA_CUSTOMER_TYPES value; "Visitor" for a QR self-order. */
    customer_type: CafeteriaCustomerType;
    /** Null when the order was placed anonymously (the QR self-order default). */
    customer_name: string | null;
    /** Null when no mobile number was captured. */
    mobile_number: string | null;
    /** Table number (TableOrder.table_number) resolved from the stored table_id. */
    table_number: string;
    /** Stored line order (append order), each with its catalog name resolved. */
    items_purchased: CafeteriaInvoiceItem[];
    /** Stored subtotal — the sum of the lines as filed, before any discount. */
    subtotal_amount: number;
    /** Stored discount; 0 when none was applied. */
    discount_applied: number;
    /** Stored total (subtotal − discount, or a manual correction). */
    total_amount: number;
    /** A CAFETERIA_PAYMENT_MODES value. */
    payment_mode: CafeteriaPaymentMode;
    /** A CAFETERIA_PAYMENT_STATUSES value — a Pending tab can still be printed. */
    payment_status: CafeteriaPaymentStatus;
    /** When the transaction was filed, as an ISO 8601 string. */
    transaction_timestamp: string;
}
