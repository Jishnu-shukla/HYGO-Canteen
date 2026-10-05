import type { DietType } from "@/data/Menu/type";
import type {
    ConsistencyLiquid,
    DietPlanStatus,
    TextureModification,
} from "@/data/DietPlan/type";

/**
 * Friendlier labels for wire values that read as machine tokens.
 *
 * The underscore forms are what the backend stores, so they are sent verbatim
 * as option values and only prettified in the label, the same split
 * STATUS_LABEL makes in DietOrder/orderStatus.ts.
 */

export const TEXTURE_LABEL: Record<TextureModification, string> = {
    Regular: "Regular",
    Pureed: "Pureed",
    Minced: "Minced",
    Soft_Bite: "Soft Bite",
};

export const CONSISTENCY_LABEL: Record<ConsistencyLiquid, string> = {
    Thin: "Thin",
    Nectar_Thick: "Nectar thick",
    Honey_Thick: "Honey thick",
    Pudding_Thick: "Pudding thick",
};

/**
 * Diet types are already readable, except "High Protien" — an upstream typo
 * that is the stored value and so must still be sent verbatim.
 */
export const DIET_TYPE_LABEL: Record<DietType, string> = {
    Normal: "Normal",
    Diabetic: "Diabetic",
    Renal: "Renal",
    "Low Sodium": "Low sodium",
    Soft: "Soft",
    Liquid: "Liquid",
    "High Protien": "High protein",
    NPO: "NPO",
};

/* ------------------------------------------------------------------ *
 * Status
 * ------------------------------------------------------------------ */

export const PLAN_STATUS_LABEL: Record<DietPlanStatus, string> = {
    Active: "Active",
};

export const PLAN_STATUS_BADGE: Record<DietPlanStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700",
};

/** Used when the server sends a status this build doesn't know yet. */
export const UNKNOWN_STATUS_BADGE = "bg-slate-100 text-slate-700";

/** Local calendar day as YYYY-MM-DD, matching the user's clock not UTC's. */
function todayKey() {
    const now = new Date();

    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Whether a plan is actually in force today.
 *
 * The list returns `status` but not the summary's stricter rule, so a plan
 * reading "Active" can still have started last month or ended last week. This
 * mirrors the active_plans check so the table and the cards never disagree.
 *
 * Dates are compared as YYYY-MM-DD strings, which sort correctly and avoid the
 * timezone shift a full ISO parse would introduce.
 */
export function planPhase(
    startDate: string,
    endDate: string | null
): "upcoming" | "current" | "ended" {
    const today = todayKey();
    const start = startDate ? startDate.slice(0, 10) : null;
    const end = endDate ? endDate.slice(0, 10) : null;

    if (start && start > today) return "upcoming";
    if (end && end < today) return "ended";

    return "current";
}

export const PHASE_LABEL: Record<
    ReturnType<typeof planPhase>,
    string
> = {
    upcoming: "Not started",
    current: "In force",
    ended: "Ended",
};
