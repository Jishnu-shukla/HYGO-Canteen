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
 */
export interface CreateCafeteriaTransactionBody {
    customer_type: CafeteriaCustomerType;
    customer_name: string | null;
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
 * $set landed. Same row shape as a POST response.
 */
export type UpdateTableOrderResponse = Record<string, unknown>;
