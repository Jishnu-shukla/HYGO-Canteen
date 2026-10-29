export interface ServiceTiming {
  meal_type: string;
  start_time: string;
}

export interface FssaiDetails {
  fssai_licence_number: string;
  licence_type: string;
  issue_date: string;
  valid_until: string;
  food_business_activity: string[];
  licence_certificate: string;
  additional_documents: string[];
}

export interface GetCanteenOnboardingResponse {
  onboarding_id: string;
  name: string;
  number_of_kitchen: string;
  kitchen_name: string[];
  service_areas: string[];
  service_timings: ServiceTiming[];
  operating_days: string[];
  delivery_method: string;
  operated_by: string;
  managed_by: string | null;
  contractor: string | null;
  hospital_address: string;
  fssai_details: FssaiDetails[];
}
