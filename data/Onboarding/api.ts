import { API_BASE_URL } from "@/data/apiBaseUrl";
import type {
  GetCanteenOnboardingResponse,
  UploadOnboardingCertificateResponse,
  UploadOnboardingDocumentsResponse,
  UpsertCanteenOnboardingBody,
  UpsertCanteenOnboardingResponse,
} from "./type";

const BASE_URL = `${API_BASE_URL}/onboarding`;

/** Reads the backend's own message out of a failed JSON body. */
function readApiError(json: unknown, status: number): string {
  const message = (json as { message?: unknown } | null)?.message;

  if (typeof message === "string" && message !== "") {
    return message;
  }

  return `Request failed with status ${status}.`;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** The onboarding document, or null when it has not been configured yet. */
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

/**
 * PUT /api/onboarding — full replace of the onboarding document. Creates the
 * singleton on the first save (201) and replaces it afterwards (200).
 */
export async function upsertCanteenOnboardingApi(
  body: UpsertCanteenOnboardingBody
): Promise<UpsertCanteenOnboardingResponse> {
  const response = await fetch(BASE_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const jsonData = await readJson(response);

  if (!response.ok) {
    throw new Error(readApiError(jsonData, response.status));
  }

  const data = (jsonData as { data?: UpsertCanteenOnboardingResponse } | null)
    ?.data;

  if (!data) {
    throw new Error("The onboarding API answered without the saved record.");
  }

  return data;
}

function readUrlPayload(json: unknown, key: "url" | "urls"): unknown {
  const payload =
    (json as { data?: unknown } | null)?.data ?? json;

  return (payload as Record<string, unknown> | null)?.[key];
}

/**
 * POST /api/onboarding/certificate — uploads one certificate (multipart) and
 * returns its Cloudinary URL. Save it as licence_certificate in the next PUT.
 */
export async function uploadOnboardingCertificateApi(
  file: File
): Promise<UploadOnboardingCertificateResponse> {
  const formData = new FormData();
  formData.append("certificate", file);

  const response = await fetch(`${BASE_URL}/certificate`, {
    method: "POST",
    body: formData,
  });
  const jsonData = await readJson(response);

  if (!response.ok) {
    throw new Error(readApiError(jsonData, response.status));
  }

  const url = readUrlPayload(jsonData, "url");

  if (typeof url !== "string" || url === "") {
    throw new Error("The certificate upload did not return a file URL.");
  }

  return { url };
}

/**
 * POST /api/onboarding/documents — uploads one or more supporting documents
 * (multipart) and returns their Cloudinary URLs in the order sent.
 */
export async function uploadOnboardingDocumentsApi(
  files: File[]
): Promise<UploadOnboardingDocumentsResponse> {
  const formData = new FormData();

  for (const file of files) {
    formData.append("documents", file);
  }

  const response = await fetch(`${BASE_URL}/documents`, {
    method: "POST",
    body: formData,
  });
  const jsonData = await readJson(response);

  if (!response.ok) {
    throw new Error(readApiError(jsonData, response.status));
  }

  const urls = readUrlPayload(jsonData, "urls");

  if (!Array.isArray(urls) || urls.some((url) => typeof url !== "string")) {
    throw new Error("The document upload did not return file URLs.");
  }

  return { urls: urls as string[] };
}
