import { API_BASE_URL } from "@/data/apiBaseUrl";

export default async function getDashboardDataApi() {
    try {
        const data = await fetch(`${API_BASE_URL}/dashboard`);
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
} 
export async function getDashboardOrdersWithComplianceApi() {
    try {
        const data = await fetch(`${API_BASE_URL}/dashboard/orders`);
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
} 