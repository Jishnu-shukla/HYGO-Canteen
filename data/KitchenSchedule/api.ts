import type { GetKitchenScheduleSummaryResponse } from "./type";

/**
 * GET /api/kitchenschedule/summary — today's kitchen workload, no query
 * parameters.
 *
 * Returns null on any failure so the cards can fall back to zeroes rather
 * than blocking the screen; the caller logs the reason.
 */
export async function getKitchenScheduleSummaryApi(): Promise<GetKitchenScheduleSummaryResponse | null> {
    try {
        const response = await fetch(
            "https://4jzhg556-5000.inc1.devtunnels.ms/api/kitchenschedule/summary"
        );

        if (!response.ok) {
            console.log(
                `getKitchenScheduleSummaryApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }

        const jsonData = await response.json();

        return jsonData.data as GetKitchenScheduleSummaryResponse;
    } catch (error) {
        console.log(error);
        return null;
    }
}
