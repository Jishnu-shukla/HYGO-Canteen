/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

/**
 * GET /api/bedsidedelivery/summary — global totals, no query parameters.
 *
 * Returned unwrapped from the `data` envelope:
 *   { statusCode, message, success, data: BedSideDeliverySummary }
 *
 * All four fields come back as 0 on a fresh database, so zeroes are a real
 * value rather than a missing-data marker.
 */
export interface BedSideDeliverySummary {
    /** Trays handed over at the bedside so far today. */
    deliveries_today: number;
    /** Orders still waiting to be delivered. */
    pending_orders: number;
    /** Patients whose recorded intake is below target. */
    low_intake: number;
    /**
     * Mean intake across today's deliveries, or null when nothing has been
     * delivered yet — there is no average to report over an empty set, which
     * is distinct from a genuine 0%.
     */
    avg_intake: number | null;
}

/**
 * GET /api/bedsidedelivery/orders — options for the delivery form's picker.
 *
 * Rows sit straight on `data`, unpaginated and unfiltered:
 *   { statusCode, message, success, data: BedSideDeliveryOrder[] }
 *
 * Deliberately minimal — exactly the three fields a <select> needs to render
 * "Name (UHID)" and send an order_id back. It carries no ward or patient_id,
 * so the form cannot populate those on its own; see
 * CreateBedSideDeliveryBody.
 *
 * Note this list is not filtered by status or date, so it includes orders
 * already delivered.
 */
export interface BedSideDeliveryOrder {
    order_id: string;
    uhid: string;
    patient_name: string;
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

/**
 * Body for POST /api/bedsidedelivery — a logged bedside handover.
 *
 * Only what the nurse actually fills in on screen. The picker returns just
 * order_id, uhid and patient_name, so the identity and location fields are
 * deliberately NOT part of this body: the server resolves patient_id, ward_id
 * and ward_name from the order itself. That avoids a client sending a
 * patient_id that disagrees with the order_id.
 *
 * Mirrors the plate_waste_analytics collection:
 * (order_id, patient_id, ward_id, ward_name, intake_percentage,
 *  rejection_reason, notes, logged_by_user_id)
 */
export interface CreateBedSideDeliveryBody {
    /** Must resolve to a real order; chosen in the form's picker. */
    order_id: string;
    /** Share of the tray consumed, 0–100. Feeds avg_intake in the summary. */
    intake_percentage: number;
    /**
     * Why food was left behind. Required by the form whenever intake is below
     * 100, since a partly-eaten tray is the case that needs explaining;
     * null when the tray was finished.
     */
    rejection_reason: string | null;
    /** Free-text note from the nurse or dietician. */
    notes: string | null;
}

/**
 * The stored record as returned after a successful create: the body plus the
 * server-resolved fields and timestamps.
 */
export interface BedSideDeliveryRecord extends CreateBedSideDeliveryBody {
    _id: string;
    /** Raw Mongo id of the patient, resolved from order_id. */
    patient_id: string;
    ward_id: string;
    /** Ward display text, e.g. "Cardiology Ward". */
    ward_name: string;
    /** ISO timestamp. */
    createdAt: string;
    updatedAt: string;
}
