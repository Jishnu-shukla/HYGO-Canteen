export type FssaiActionSource =
  | "Internal Inspection"
  | "External Inspection"
  | "Surprise Visit"
  | "Other";

export type FssaiActionStatus = "open" | "in_progress" | "close" | "overdue";

export interface FssaiActionRow {
  action_id: string;
  issue_name: string;
  issue_details?: string;
  issue_source: FssaiActionSource;
  inspection_id: string;
  severity: string;
  action_assigned: string;
  target_date: string;
  status?: FssaiActionStatus;
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
