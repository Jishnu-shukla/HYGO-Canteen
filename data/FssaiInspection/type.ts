export type FssaiInspectionType =
  | "Routine Inspection"
  | "Spot Inspection"
  | "Complaint-based Inspection"
  | "Follow-up Inspection"
  | "Surprise Inspection"
  | "Other / Not specified";

export interface FssaiInspectionRow {
  inspection_id: string;
  location: string;
  date: string;
  reference_number?: string;
  officer_name?: string;
  type?: FssaiInspectionType;
  report_link: string;
  remarks?: string;
}

export interface UpsertFssaiInspectionBody {
  location: string;
  date: string;
  reference_number?: string;
  officer_name?: string;
  type?: FssaiInspectionType;
  report_link: string;
  remarks?: string;
}

export type CreateFssaiInspectionBody = UpsertFssaiInspectionBody;
export type UpdateFssaiInspectionBody = UpsertFssaiInspectionBody;
export type CreateFssaiInspectionResponse = FssaiInspectionRow;
export type UpdateFssaiInspectionResponse = FssaiInspectionRow;
