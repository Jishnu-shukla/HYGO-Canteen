import { API_BASE_URL } from "@/data/apiBaseUrl";
import { GetCanteenOnboardingResponse } from "./type";

const BASE_URL = `${API_BASE_URL}/onboarding`;

export async function getCanteenOnboardingApi(): Promise<GetCanteenOnboardingResponse | null> {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(BASE_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const jsonData = await response.json();
    if (jsonData?.status && jsonData?.data) {
      return jsonData.data;
    }
    if (jsonData?.data) {
      return jsonData.data;
    }
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
}
