import { API_BASE_URL } from "@/data/apiBaseUrl";
import { FssaiInspectionRow } from "./type";

const BASE_URL = `${API_BASE_URL}/fssaiinspection`;

export async function getFssaiInspectionsApi(): Promise<FssaiInspectionRow[]> {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(BASE_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const jsonData = await response.json();
    if (Array.isArray(jsonData)) {
      return jsonData;
    }
    if (jsonData?.status && Array.isArray(jsonData?.data)) {
      return jsonData.data;
    }
    if (Array.isArray(jsonData?.data)) {
      return jsonData.data;
    }
    return [];
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function createFssaiInspectionApi(formData: FormData) {
  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      body: formData,
    });
    const jsonData = await response.json();
    console.log(jsonData);
    return jsonData;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function updateFssaiInspectionApi(inspection_id: string, body: Record<string, unknown>) {
  try {
    const response = await fetch(`${BASE_URL}/${inspection_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const jsonData = await response.json();
    console.log(jsonData);
    return jsonData;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function deleteFssaiInspectionApi(inspection_id: string) {
  try {
    const response = await fetch(`${BASE_URL}/${inspection_id}`, {
      method: "DELETE",
    });
    const jsonData = await response.json();
    console.log(jsonData);
    return jsonData;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
