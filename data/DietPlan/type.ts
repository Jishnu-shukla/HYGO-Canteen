/**
 * Contracts for /api/dietplan, mirroring models/types.ts on the backend.
 *
 * A DietPlan is the therapeutic prescription a DietOrder is later raised
 * against, so `diet_type` here is the same vocabulary the menu and order
 * screens already use.
 */

import type { DietType } from "@/data/Menu/type";

/* ------------------------------------------------------------------ *
 * Wire vocabularies
 *
 * Underscored members ("Soft_Bite", "Nectar_Thick") are wire values, not
 * display copy — the UI maps them to friendlier labels at render time.
 * ------------------------------------------------------------------ */

/** Texture prescribed for the plan's solid food. Schema default "Regular". */
export const TEXTURE_MODIFICATION = [
    "Regular",
    "Pureed",
    "Minced",
    "Soft_Bite",
] as const;
export type TextureModification = (typeof TEXTURE_MODIFICATION)[number];

/** Consistency prescribed for the plan's liquids. Schema default "Thin". */
export const CONSISTENCY_LIQUID = [
    "Thin",
    "Nectar_Thick",
    "Honey_Thick",
    "Pudding_Thick",
] as const;
export type ConsistencyLiquid = (typeof CONSISTENCY_LIQUID)[number];

/**
 * "Active" is the only status the endpoint documents, and it is the only one
 * the client ever needs: the create body deliberately omits status because the
 * schema defaults it. Extend this const when the re-evaluation flow starts
 * writing other states — nothing in the create path depends on it today.
 */
export const DIET_PLAN_STATUS = ["Active"] as const;
export type DietPlanStatus = (typeof DIET_PLAN_STATUS)[number];

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

/** One row of the diet-type breakdown. */
export interface DietTypeCount {
    diet_type: DietType;
    count: number;
}

/**
 * Plan overview for the dashboard. No query parameters — global totals.
 *
 * - active_plans    plans in force today: status "Active", already started,
 *                   and not past end_date. Deliberately stricter than a bare
 *                   status check, and identical to the rule
 *                   dietorder.service uses when auto-selecting a patient's
 *                   plan, so "active" means one thing across the app.
 * - diet_types      count per diet type across those same active plans.
 * - with_allergens  distinct patients who have an AllergyPreference with at
 *                   least one allergy. This is a patient count, not a plan
 *                   count, so a patient with several plans is counted once.
 */
export interface GetDietPlanSummaryResponse {
    active_plans: number;
    diet_types: DietTypeCount[];
    with_allergens: number;
}

/** GET /api/dietplan?page=1&limit=10 */
export interface GetDietPlansQuery {
    /** 1-based. Defaults to 1. */
    page?: number;
    /** Page size. Defaults to 10, capped at 100. */
    limit?: number;
}

/**
 * One row of the plan list.
 *
 * Every DietPlan field except prescribed_by and disallowed_items_id, which
 * are withheld from the list response: the first is a staff audit field and the
 * second is per-plan clinical detail the list has no use for. Both remain
 * available on the create response and are expected on the plan detail endpoint.
 *
 * patient_name and uhid are joined in from Paitent so the table renders in
 * one request.
 */
export interface DietPlanListItem {
    diet_plan_id: string;
    /** Raw Mongo id of the patient. */
    patient_id: string;
    /** Patient's business ID, e.g. "UHID-2026-0001". */
    uhid: string;
    patient_name: string;
    diet_type: DietType;
    texture_modification: TextureModification;
    consistencies_liquids: ConsistencyLiquid;
    /** ISO timestamp. */
    start_date: string;
    /** ISO timestamp, or null for an open-ended plan. */
    end_date: string | null;
    status: DietPlanStatus;
    createdAt: string;
    updatedAt: string;
}

/** Page metadata, so the UI can render a pager without a second request. */
export interface DietPlanPagination {
    page: number;
    limit: number;
    /** Total matching rows across all pages. */
    total: number;
    total_pages: number;
}

/**
 * All plans, newest record first. No status filter — the UI filters itself,
 * matching GET /api/dietorder.
 */
export interface GetDietPlansResponse {
    data: DietPlanListItem[];
    pagination: DietPlanPagination;
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

/**
 * Only the fields the client owns on create.
 *
 * Deliberately absent, because the server sets them:
 * - diet_plan_id   minted via generateId("DIET_PLAN_ID", "DP"). Note the
 *                  seeded rows use a different shape (DP-2026-0001), so the
 *                  collection holds both formats.
 * - patient_id     resolved from uhid, so no ObjectId crosses the wire.
 * - status         always starts at "Active" (the schema default).
 * - prescribed_by  nullable for now and intended to come from auth
 *                  middleware; the client value below is a stopgap.
 *
 * The patient picker is shared with diet orders: GET /api/dietorder/paitent.
 * There is deliberately no /api/dietplan/paitent.
 */
export interface CreateDietPlanBody {
    /** Patient's business ID, e.g. "UHID-2026-0001". Must resolve to a patient. */
    uhid: string;
    /**
     * Menu items to withhold from this patient.
     *
     * Values are PatientMenuItem master_item_id business IDs (e.g.
     * "MST-000003"), not ObjectIds — same rule as MasterItemRef in
     * menu/type.ts, since PatientMenuItem stores master_item_ids as business
     * IDs.
     *
     * Defaults to an empty array, meaning nothing is withheld.
     */
    disallowed_items_id?: string[];
    /**
     * Display name, accepted so the UI can send what it already has.
     *
     * NOT persisted: only patient_id is stored and the name is read back from
     * the Paitent record at read time. Same rule as CreateDietOrderBody.
     */
    patient_name?: string;
    diet_type: DietType;
    /** ISO date string; the server converts it to a Date. */
    start_date: string;
    /** ISO date string. Omit or send null for an open-ended plan. */
    end_date?: string;
    /** Defaults to "Regular" in the schema. */
    texture_modification?: TextureModification;
    /** Defaults to "Thin" in the schema. */
    consistencies_liquids?: ConsistencyLiquid;
    /**
     * Staff id of the prescriber, as a string.
     *
     * Temporary: once auth middleware exists this will be read from the
     * request context instead, and this field should be dropped from the body.
     */
    prescribed_by_user_id?: string;
}

/** The created plan, with the server-assigned fields filled in. */
export interface CreateDietPlanResponse {
    diet_plan_id: string;
    uhid: string;
    patient_id: string;
    patient_name: string;
    diet_type: DietType;
    texture_modification: TextureModification;
    consistencies_liquids: ConsistencyLiquid;
    /** ISO timestamp. */
    start_date: string;
    /** ISO timestamp, or null for an open-ended plan. */
    end_date: string | null;
    status: DietPlanStatus;
    /** Staff id of the prescriber, or null until auth middleware exists. */
    prescribed_by: string | null;
}
