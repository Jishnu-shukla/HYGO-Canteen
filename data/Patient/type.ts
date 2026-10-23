/**
 * Request/response contracts for /api/patients.
 *
 *   GET  /api/patients/summary
 *        -> GetPatientResponseSummary          (no query, no body)
 *   GET  /api/patients?page=&limit=
 *        -> GetPatientsResponse                (paginated roster)
 *   GET  /api/patients/:uhid
 *        -> GetPatientHistoryResponse          (single-patient timeline)
 *
 * The Patients screen is the roster of admitted patients; clicking a row opens
 * the patient's whole history in one modal, loaded from the :uhid endpoint.
 *
 * RBAC: the screen is guarded by the viewPatients action — see ACTIONS and
 * ROLE_ACTIONS in Roles.ts — which defaults to Admin, Dietitian and Nurse.
 * The route itself is registered in the backend's rbac route registry; like
 * every other endpoint it is refused until it has an entry there.
 */

import type { AllergyPrefListItem } from "@/data/AllergyPref/type";
import type { AssessmentListItem } from "@/data/Assessment/type";
import type { DietOrderListItem, OrderStatus } from "@/data/DietOrder/type";
import type { DietPlanListItem } from "@/data/DietPlan/type";
import type { MealSlot } from "@/data/Menu/type";

/**
 * GET /api/patients/summary response.
 *
 * Three PATIENT counts, not record counts: active_plans and
 * total_allergens count each patient once however many documents they have,
 * so the three numbers read against each other ("of N patients, how many are
 * on a plan, how many have a recorded allergy").
 *
 * The intended scope is the working roster — soft-deleted patients
 * (Paitent.isDeleted: true) are not counted, matching the patient picker in
 * dietorder.service — and the service counts come from:
 *
 *   - total_patient    every non-deleted patient in the Paitent collection.
 *   - active_plans     distinct patients with a DietPlan in force today
 *                      (status Active, start_date reached, end_date not
 *                      passed — the same filter dietplan.service and
 *                      dietorder.service use). Counted patient-wise rather
 *                      than as a number of plan documents, so a patient with
 *                      two overlapping plans still contributes 1.
 *   - total_allergens  distinct patients with at least one document in the
 *                      allergypref collection — the presence of the
 *                      AllergyPreference record is what counts, not how many
 *                      allergies it lists.
 */
export interface GetPatientResponseSummary {
    total_patient: number;
    active_plans: number;
    total_allergens: number;
}

/* ------------------------------------------------------------------ *
 * List
 * ------------------------------------------------------------------ */

/** GET /api/patients?page=1&limit=10 */
export interface GetPatientsQuery {
    /** 1-based. Defaults to 1. */
    page?: number;
    /** Page size. Defaults to 10, capped at 100. */
    limit?: number;
}

/**
 * One row of the patient list.
 *
 * The columns the roster table renders: identity (uhid, name), the two
 * values shown beside them (age, gender), blood group for the clinical and
 * dietary context, and isDeleted so a soft-deleted row stays distinguishable
 * in the table.
 *
 * age is derived, not stored — Paitent only has dateOfBirth. The service
 * computes whole years at request time, so the number is always current rather
 * than stale the way a persisted age would be.
 */
export interface PatientListItem {
    /** Patient's business ID, e.g. "UHID-2026-0001". */
    uhid: string;
    name: string;
    /** Whole years derived from dateOfBirth; null when dateOfBirth is missing. */
    age: number | null;
    /** Free text in the schema (no enum), so not narrowed to a union. */
    gender: string;
    /** Free text in the schema, e.g. "A+". "" when unrecorded. */
    bloodGroup: string;
    isDeleted: boolean;
}

export interface PatientPagination {
    page: number;
    limit: number;
    /** Total matching rows across all pages. */
    total: number;
    total_pages: number;
}

/**
 * Paginated patient roster, ordered by uhid ascending.
 *
 * uhid is unique, so it gives a strict total order and pages cannot overlap
 * or skip a row between requests.
 *
 * Soft-deleted rows are included rather than filtered out: isDeleted is part
 * of the contract so the screen can show and filter them itself — the same
 * "list everything, let the UI filter" rule as GET /api/dietplan and
 * GET /api/dietorder.
 */
export interface GetPatientsResponse {
    data: PatientListItem[];
    pagination: PatientPagination;
}

/* ------------------------------------------------------------------ *
 * History
 * ------------------------------------------------------------------ */

/**
 * One recipe line on a history row: which master item, its name, and how many
 * portions were served.
 *
 * Both order sections resolve their stored item refs to a recipe name, because
 * the timeline is read by people ("what was served") rather than by code that
 * already holds the ids. master_item_id stays on the line as a stable key for
 * the UI list and as a link back to the master menu entry.
 */
export interface PatientHistoryRecipe {
    /** MasterMenuItem ObjectId, as a hex string. */
    master_item_id: string;
    /** Joined from MasterMenuItem.recipe_name. */
    recipe_name: string;
    /** Portions served. Always 1 on diet orders — see PatientDietOrderHistoryItem. */
    quantity: number;
}

/**
 * One diet order in the patient's history.
 *
 * The regular list row (DietOrderListItem) with the patient identity and the
 * raw master_item_ids replaced by resolved items: the patient is already the
 * subject of the response, and the screen shows recipe names rather than ids.
 *
 * DietOrder stores a flat list of item refs with no quantity field, so each
 * recipe contributes exactly 1 portion — a diet order is one prescribed meal for
 * one patient. Regular meal orders keep the requested quantities (see
 * PatientMealOrderHistoryItem).
 */
export interface PatientDietOrderHistoryItem
    extends Omit<
        DietOrderListItem,
        "master_item_ids" | "patient_id" | "uhid" | "patient_name"
    > {
    items: PatientHistoryRecipe[];
}

/**
 * One regular meal order in the patient's history.
 *
 * These are the orders for patients with no diet plan or diet order, stored in
 * the mealorders collection and read through services/mealorder.service.ts.
 * Unlike a diet order, the requested quantity is stored per line, so the items
 * keep it verbatim.
 */
export interface PatientMealOrderHistoryItem {
    /** Business id, e.g. "MEAL-000001". */
    meal_order_id: string;
    meal_type: MealSlot;
    /** ISO timestamp of the meal slot the order was raised for. */
    scheduled_date: string;
    status: OrderStatus;
    order_source: string;
    special_instruction: string;
    is_special: boolean;
    /** Always null: nothing writes a ward id, same as DietOrder. */
    ward_id: string | null;
    ward_name: string;
    bed_number: string;
    cancellation_reason: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    delivered_by_user_id: string | null;
    qr_code_tag: string | null;
    /** Requested lines, recipe names resolved from MasterMenuItem. */
    items: PatientHistoryRecipe[];
    createdAt: string;
    updatedAt: string;
}

/**
 * One plate-waste log in the patient's history.
 *
 * Deliberately NOT the GET /api/platewaste row: that row carries diet_type
 * (the patient's newest plan) and low_intake (a per-diet-type count across
 * ALL patients), both of which are global-screen values and would be
 * meaningless on a single patient's timeline. These are the log's own fields.
 */
export interface PatientPlateWasteHistoryItem {
    /** 0-100. */
    intake_percentage: number;
    /** Empty string when no reason was recorded. */
    rejection_reason: string;
    /** Free-text note; empty string when none. */
    notes: string;
    ward_name: string;
    /** ISO timestamp of when the log was filed. */
    createdAt: string;
}

/**
 * GET /api/patients/:uhid response — one patient's whole history in one read.
 *
 * Every section is scoped to the patient and ordered newest first, assembled by
 * the service that owns that collection so each keeps its own shaping rules:
 *
 *   - diet_orders              DietOrder rows, item refs resolved to recipes
 *                              (1 portion each).
 *   - meal_orders              mealorders rows, with the requested quantities.
 *   - diet_plans               DietPlan list rows.
 *   - allergies                AllergyPreference list rows.
 *   - nutritional_assessments  Assessment list rows.
 *   - plate_waste_analytics    PlateWasteAnalytics log rows.
 *
 * The plan/allergy/assessment sections reuse the list-row types their own
 * endpoints already publish, so a field added there shows up here without a
 * second contract.
 *
 * Not paginated: this is a single-patient timeline and the screen shows each
 * section in full. If a long-stay patient ever grows too large to send in one
 * response, the fix is a per-section limit query rather than one page
 * envelope across six unrelated collections.
 */
export interface GetPatientHistoryResponse {
    /** The same row GET /api/patients would show for this patient. */
    patient: PatientListItem;
    diet_orders: PatientDietOrderHistoryItem[];
    meal_orders: PatientMealOrderHistoryItem[];
    diet_plans: DietPlanListItem[];
    allergies: AllergyPrefListItem[];
    nutritional_assessments: AssessmentListItem[];
    plate_waste_analytics: PatientPlateWasteHistoryItem[];
}
