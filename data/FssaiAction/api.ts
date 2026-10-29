import { API_BASE_URL } from "@/data/apiBaseUrl";
import { FssaiActionRow } from "./type";

const BASE_URL = `${API_BASE_URL}/fssaiaction`;

export async function getFssaiActionsApi(): Promise<FssaiActionRow[]> {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(BASE_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const jsonData = await response.json();
    if (Array.isArray(jsonData)) return jsonData;
    if (jsonData?.status && Array.isArray(jsonData?.data)) return jsonData.data;
    if (Array.isArray(jsonData?.data)) return jsonData.data;
    return [];
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function createFssaiActionApi(body: Record<string, unknown>) {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export async function updateFssaiActionApi(action_id: string, body: Record<string, unknown>) {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${BASE_URL}/${action_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export async function deleteFssaiActionApi(action_id: string) {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${BASE_URL}/${action_id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const jsonData = await response.json();
    console.log(jsonData);
    return jsonData;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
