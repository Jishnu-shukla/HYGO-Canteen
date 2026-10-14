/**
 * Client helpers for the Spoonacular lookups behind the recipe-name
 * autocomplete.
 *
 * These call this app's own /api/spoonacular routes, not Spoonacular itself:
 * the provider key lives in SPOONACULAR_API_KEY (.env), which Next.js only
 * exposes on the server, so the key never reaches the browser. Both helpers
 * return undefined on any failure (the route already logged the reason) so the
 * modal can fall back to manual entry instead of breaking.
 */

export type SpoonacularSearchResult = {
    id: number;
    title: string;
    image: string;
};

/** Mirrors the modal's nutritional_info shape, including the backend's spelling. */
export type SpoonacularNutrition = {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
    sugar: number;
    cholestrol: number;
};

export async function searchSpoonacularRecipes(
    query: string
): Promise<SpoonacularSearchResult[] | undefined> {
    try {
        const response = await fetch(
            `/api/spoonacular/search?q=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
            console.log(
                `searchSpoonacularRecipes failed: ${response.status} ${response.statusText}`
            );
            return undefined;
        }

        const json = (await response.json()) as {
            results?: SpoonacularSearchResult[];
        };

        return json.results ?? [];
    } catch (error) {
        console.log(error);
        return undefined;
    }
}

export async function getSpoonacularNutrition(
    id: number
): Promise<SpoonacularNutrition | undefined> {
    try {
        const response = await fetch(`/api/spoonacular/nutrition?id=${id}`);

        if (!response.ok) {
            console.log(
                `getSpoonacularNutrition failed: ${response.status} ${response.statusText}`
            );
            return undefined;
        }

        const json = (await response.json()) as {
            nutrition?: SpoonacularNutrition;
        };

        return json.nutrition;
    } catch (error) {
        console.log(error);
        return undefined;
    }
}
