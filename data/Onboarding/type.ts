/**
 * Contracts for /api/onboarding — the canteen's identity, licensing and
 * supporting-document record.
 *
 * One singleton, like /api/settings: no id in the URL and no list. GET answers
 * 404 until the first PUT; PUT is a full replace that creates the record when
 * it does not exist yet.
 *
 * Certificate files are uploaded separately:
 *   POST /api/onboarding/certificate  -> { url }     (FSSAI / GST / Fire NOC)
 *   POST /api/onboarding/documents    -> { urls }    (supporting documents)
 * and the returned URLs are saved as licence_certificate / link in the next PUT.
 */

/* ------------------------------------------------------------------ *
 * Wire vocabularies
 * ------------------------------------------------------------------ */

/** A FSSAI licence type, as printed on the certificate. */
export type FssaiLicenceType = "Basic" | "State Licence" | "Central Licence";

/** How many kitchens the canteen runs. */
export const KITCHEN_COUNTS = [
    "1 kitchen",
    "2 kitchens",
    "3 kitchens",
    "4 kitchens",
] as const;

export type KitchenCount = (typeof KITCHEN_COUNTS)[number];

/** Who operates the canteen. Free text on the wire, so unknown values pass. */
export type OperatedBy = string;

/* ------------------------------------------------------------------ *
 * Embedded values
 * ------------------------------------------------------------------ */

/**
 * One FSSAI licence held by the canteen. licence_certificate is a URL:
 * upload the file to POST /api/onboarding/certificate first, then save the
 * returned URL here; the onboarding PUT itself stays plain JSON.
 */
export interface FssaiDetails {
    /** Licence number as printed on the certificate. Required, non-blank. */
    fssai_licence_number: string;
    /** A FSSAI_LICENCE_TYPES value: Basic / State Licence / Central Licence. */
    licence_type: FssaiLicenceType;
    /** ISO 8601 date the licence was issued. */
    issue_date: string;
    /** ISO 8601 date the licence expires. Cannot be before issue_date. */
    valid_until: string;
    /**
     * The activities the licence covers, e.g. ["Catering", "Storage"]. Required
     * and non-empty — free text, so any activity the client names is accepted.
     */
    food_business_activity: string[];
    /** URL of the licence certificate. Required, non-blank. Upload via POST /api/onboarding/certificate. */
    licence_certificate: string;
}

/**
 * The canteen's single GST registration certificate. Optional (null on the
 * body) because not every canteen is GST-registered; when present it is one
 * object, never an array.
 */
export interface GstDetails {
    /** GSTIN as printed on the certificate. Required, non-blank. */
    gst_number: string;
    /** ISO 8601 date the registration was issued. */
    issue_date: string;
    /** URL of the GST certificate. Required, non-blank. Upload via POST /api/onboarding/certificate. */
    licence_certificate: string;
}

/**
 * One Fire NOC certificate. The canteen can hold several (for example one per
 * building or renewal), so the onboarding field is an array.
 */
export interface FireNocDetails {
    /** NOC application number as printed on the certificate. Required, non-blank. */
    noc_application_number: string;
    /** ISO 8601 date the NOC was issued. */
    issue_date: string;
    /** ISO 8601 date the NOC expires. Cannot be before issue_date. */
    valid_until: string;
    /** URL of the NOC certificate. Required, non-blank. Upload via POST /api/onboarding/certificate. */
    licence_certificate: string;
}

/**
 * One extra supporting document at the top level. Unlike the licences, these
 * carry a display name and only an expiry date.
 */
export interface AdditionalDocument {
    /** Label shown in the onboarding UI, e.g. "Water Testing Report". */
    name: string;
    /** ISO 8601 date the document expires. */
    valid_until: string;
    /** URL of the uploaded document. Required, non-blank. Upload via POST /api/onboarding/documents. */
    link: string;
}

/* ------------------------------------------------------------------ *
 * GET /api/onboarding
 * ------------------------------------------------------------------ */

/**
 * The stored onboarding configuration, exactly as it was last written plus the
 * server-minted onboarding_id.
 *
 * The body shape is reused rather than restated so the wizard can re-submit
 * what it fetched without a per-field transformation; only the id and the
 * read-only side are added. Dates stay ISO strings on both sides, so there is
 * no Date/string mismatch between request and response.
 *
 * GET returns 404 until the first PUT: "not configured yet" is a distinct
 * state, not an empty configuration.
 */
export interface GetCanteenOnboardingResponse
    extends UpsertCanteenOnboardingBody {
    /** Server-minted business id, e.g. "ONB-000001". */
    onboarding_id: string;
}

/* ------------------------------------------------------------------ *
 * PUT /api/onboarding
 * ------------------------------------------------------------------ */

/**
 * Full onboarding configuration. PUT replaces every field, so all of them are
 * present in the body; the frontend sends the whole wizard result in one
 * request.
 *
 * created_by and gst_details are … | null rather than optional: the wizard's
 * empty inputs serialize to null, and an omitted key would be
 * indistinguishable from "clear it". fire_noc_details and additional_documents
 * may be empty arrays.
 *
 * onboarding_id is deliberately absent: the server mints it on the first save
 * and never lets a client choose or change it.
 */
export interface UpsertCanteenOnboardingBody {
    /** Canteen / hospital unit name. Required, non-blank. */
    name: string;
    /** A KITCHEN_COUNTS value: "1 kitchen" … "4 kitchens". */
    number_of_kitchen: KitchenCount;
    /**
     * Display names of the kitchens, one per kitchen: a 2-kitchen canteen sends
     * exactly two names. Required; the API rejects a length that does not match
     * number_of_kitchen.
     */
    kitchen_name: string[];
    /** An OPERATED_BY_OPTIONS value. */
    operated_by: OperatedBy;
    /** Who created this onboarding record; null when not supplied. */
    created_by: string | null;
    /** Full hospital address. Required, non-blank. */
    hospital_address: string;
    /** At least one FSSAI licence. */
    fssai_details: FssaiDetails[];
    /** The single GST certificate, or null when the canteen is not registered. */
    gst_details: GstDetails | null;
    /** Fire NOC certificates; may be empty. */
    fire_noc_details: FireNocDetails[];
    /** Extra supporting documents; may be empty. */
    additional_documents: AdditionalDocument[];
}

/**
 * PUT /api/onboarding response — the saved configuration.
 *
 * Aliased to the GET shape on purpose: a save echoes the whole record, so the
 * wizard never has to follow it with a GET to learn the minted id or confirm
 * what was stored.
 */
export type UpsertCanteenOnboardingResponse = GetCanteenOnboardingResponse;

/* ------------------------------------------------------------------ *
 * POST /api/onboarding/certificate & /api/onboarding/documents
 * ------------------------------------------------------------------ */

/**
 * POST /api/onboarding/certificate — the Cloudinary URL of the uploaded
 * certificate, ready to save as any licence_certificate in the next PUT
 * (FSSAI, GST or Fire NOC).
 */
export interface UploadOnboardingCertificateResponse {
    /** Public HTTPS URL of the uploaded certificate. */
    url: string;
}

/**
 * POST /api/onboarding/documents — Cloudinary URLs for the uploaded documents,
 * in the same order the files were sent. Save each as
 * additional_documents[].link in the next PUT (or as a certificate URL).
 */
export interface UploadOnboardingDocumentsResponse {
    /** Public HTTPS URLs of the uploaded documents. */
    urls: string[];
}
