/* ------------------------------------------------------------------ *
 * POST /api/table
 * ------------------------------------------------------------------ */

/**
 * current_status of a registered table — exactly the two values the
 * TableOrder collection carries, the same collection
 * GET /api/cafeteria/summary counts available_tables from.
 */
export type TableOrderStatus = "Occupied" | "Available";

/**
 * Request/response contract for POST /api/table.
 *
 *   POST /api/table
 *        -> AddTableBody      (body)      routed
 *        -> AddTableResponse
 *
 * A table is registered into the TableOrder collection — the same collection
 * GET /api/cafeteria/summary counts available_tables from — so this endpoint
 * grows the physical table inventory the POS reports on. The body names only
 * what a facility manager knows when adding a table; every other schema field
 * is owned by the service.
 */
export interface AddTableBody {
    /**
     * Human-facing table number (e.g. "T-001"), unique across the registry.
     * The schema enforces the unique index; the service pre-checks it and turns
     * a clash into a 409.
     */
    table_number: string;
    /** Seats at the table. The schema enforces min: 1 at write time. */
    capacity: number;
}

/**
 * The registered table, as returned.
 *
 * Fields the client did not send appear with the exact default the service
 * applied:
 *
 *   - table_id        the freshly minted business id ("TBL-000001" style)
 *   - current_status  "Available" — a newly registered table is free to seat
 *   - qrcodeurl       ${FRONTEND_URL}/${table_id} — the link to print on
 *                     the table's QR code; also persisted as qr_code_id
 *
 * table_number and capacity are echoed verbatim from the request (the
 * number trimmed), so the caller can render the row from the response alone.
 */
export interface TableDetails {
    /** Server-minted business id ("TBL-000001" style) — the QR code's id. */
    table_id: string;
    /** Human-facing table number (e.g. "T-001"), unique across the registry. */
    table_number: string;
    /** Seats at the table; the schema enforces min: 1. */
    capacity: number;
    /**
     * Seating state, straight from TableOrder.current_status:
     * "Available" is free, "Occupied" has a seated order. It moves as
     * POST /api/cafeteria/table creates a transaction and as tabs settle —
     * a point-in-time value, so the same table can answer differently on two
     * calls.
     */
    current_status: TableOrderStatus;
    /**
     * TableOrder.qr_code_id: the ${FRONTEND_URL}/${table_id} link minted
     * when the table was registered, for rendering/scanning its QR code.
     *
     * null for rows that predate POST /api/table (nothing has generated a
     * link for them yet) — hence the union, unlike AddTableResponse's
     * always-present qrcodeurl.
     */
    qrcodeurl: string | null;
    /** ISO timestamp of registration. */
    createdAt: string;
    /** ISO timestamp of the last change (e.g. the flip to "Occupied"). */
    updatedAt: string;
}

export interface AddTableResponse {
    /** Server-minted business id ("TBL-000001" style). */
    table_id: string;
    /** Echoed from the request, trimmed. */
    table_number: string;
    /** Echoed from the request. */
    capacity: number;
    /** "Available" — the default for a freshly registered table. */
    current_status: TableOrderStatus;
    /**
     * ${FRONTEND_URL}/${table_id} — e.g. http://localhost:3000/TBL-000001.
     *
     * The base URL comes from the FRONTEND_URL env var (loaded from .env);
     * a trailing slash is stripped so exactly one / separates it from the id.
     * This is the QR payload: scanning the table's code opens the frontend at
     * that table. Stored verbatim in TableOrder.qr_code_id.
     */
    qrcodeurl: string;
}
