export type FssaiActionSource =
  | "Internal"
  | "FSSAI";

export type FssaiActionStatus = "open" | "in_progress" | "close" | "overdue";

export interface FssaiActionRow {
  action_id: string;
  issue_name: string;
  issue_details: string;
  issue_source: FssaiActionSource;
  inspection_id: string;
  severity: string;
  action_assigned: string;
  target_date: string;
  /** Effective status: a stored "open" past its target date reads "overdue". */
  status: FssaiActionStatus;
}

export interface UpsertFssaiActionBody {
  issue_name: string;
  issue_details?: string;
  issue_source: FssaiActionSource;
  inspection_id: string;
  severity: string;
  action_assigned: string;
  target_date: string;
  status?: FssaiActionStatus;
}

export type CreateFssaiActionBody = UpsertFssaiActionBody;
export type UpdateFssaiActionBody = UpsertFssaiActionBody;
export type CreateFssaiActionResponse = FssaiActionRow;
export type UpdateFssaiActionResponse = FssaiActionRow;

/**
 * GET /api/fssaiaction — every action, soonest target date first (target_date
 * asc, `_id` desc as the tie-break). A bare array: the set is small enough for
 * the UI to render whole and filter client-side.
 */
export type GetFssaiActionsResponse = FssaiActionRow[];
