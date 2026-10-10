import { CreateMenuBody, GetMenusQuery, PatientMenuPickItem } from "./type";

const BASE_URL = "https://4jzhg556-5000.inc1.devtunnels.ms/api/menu";

/**
 * Serialises a query into the params the backend expects.
 * Undefined values are dropped so we never send the literal string "undefined".
 */
function buildQueryString(query: GetMenusQuery): string {
    const params = new URLSearchParams();

    params.set("type", query.type);

    if (query.date) params.set("date", query.date);
    if (query.diet_type) params.set("diet_type", query.diet_type);
    if (query.meal_slot) params.set("meal_slot", query.meal_slot);
    if (query.is_available !== undefined) {
        params.set("is_available", String(query.is_available));
    }
    if (query.expanded !== undefined) {
        params.set("expanded", String(query.expanded));
    }
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));

    const qs = params.toString();

    return qs ? `?${qs}` : "";
}

export async function getMenusApi(query: GetMenusQuery) {
    try {
        const data = await fetch(`${BASE_URL}${buildQueryString(query)}`);
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}

/**
 * The diet_plan disallowed-items picker: one row per distinct patient menu
 * item per meal slot. Returns undefined on failure so callers can keep their
 * existing list rather than blanking it.
 */
export async function getPatientMenuPickItemsApi(): Promise<
    PatientMenuPickItem[] | undefined
> {
    const data = await getMenusApi({ type: "patient", expanded: true });

    return Array.isArray(data) ? (data as PatientMenuPickItem[]) : undefined;
}

export async function createMenuApi(body: CreateMenuBody) {
    try {
        const data = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}

export async function updateMenuApi(
    menu_id: string,
    type: "patient" | "general",
    body: Record<string, unknown>
) {
    try {
        const data = await fetch(`${BASE_URL}/${menu_id}?type=${type}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ type, ...body }),
        });
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}

export async function deleteMenuApi(
    menu_id: string,
    type: "patient" | "general"
) {
    try {
        const data = await fetch(`${BASE_URL}/${menu_id}?type=${type}`, {
            method: "DELETE",
        });
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}
