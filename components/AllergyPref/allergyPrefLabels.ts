import type { AllergySeverity } from "@/data/AllergyPref/type";

/**
 * Display metadata for the allergy-preference list.
 *
 * The severity colours escalate with clinical urgency so the dangerous rows
 * are findable without reading every cell — a severe anaphylaxis record should
 * be visible in a scan of the severity column.
 */
export const SEVERITY_LABEL: Record<AllergySeverity, string> = {
    Mild: "Mild",
    Moderate: "Moderate",
    Severe_Anaphylaxis: "Severe (Anaphylaxis)",
};

export const SEVERITY_BADGE: Record<AllergySeverity, string> = {
    Mild: "bg-slate-100 text-slate-600",
    Moderate: "bg-amber-100 text-amber-800",
    Severe_Anaphylaxis: "bg-red-100 text-red-700",
};

/**
 * For a severity this build has no colour for.
 */
export const UNKNOWN_SEVERITY_BADGE = "bg-slate-100 text-slate-700";

// Restriction values need no label map — every documented value is already
// human-readable, so the table renders the raw string. That also keeps
// undeclared values working: the live data currently contains
// "Non-Vegetarian", which is absent from the ReligiousDietaryRestriction union.