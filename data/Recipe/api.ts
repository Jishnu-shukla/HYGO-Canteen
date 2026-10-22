import { API_BASE_URL } from "@/data/apiBaseUrl";
import type { CreateRecipeBody, RecipeItem, UpdateRecipeBody } from "./type";

/**
 * GET /api/recipe — every recipe.
 *
 * Always resolves to an array. A failed request (e.g. 401 before login) or an
 * unexpected payload yields [] instead of null, so the context invariant
 * `recipes: RecipeItem[]` holds and the page can render an empty state rather
 * than crash on `recipes.length`.
 */
export async function getAllRecipesApi(): Promise<RecipeItem[]> {
    try {
        const data = await fetch(`${API_BASE_URL}/recipe`);
        const jsonData = await data.json();
        console.log(jsonData);
        return Array.isArray(jsonData?.data) ? jsonData.data : [];
    } catch (error) {
        console.log(error);
        return [];
    }
}

export async function createRecipeApi(
    recipe: CreateRecipeBody
): Promise<RecipeItem | undefined> {
    try {
        const data = await fetch(`${API_BASE_URL}/recipe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(recipe)
        });
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}

export async function deleteRecipeApi(recipe_id: string): Promise<boolean> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/recipe/${recipe_id}`,
            {
                method: "DELETE"
            }
        );
        const jsonData = await response.json();
        console.log(jsonData);
        return response.ok;
    } catch (error) {
        console.log(error);
        return false;
    }
}

/**
 * PUT /api/recipe/:recipe_id — partial update.
 *
 * Only the fields present on `recipe` are touched. ingredients, when sent,
 * replaces the whole ingredient list atomically, so callers must pass every
 * row they want to keep.
 *
 * Returns undefined on any failure so the modal can surface a generic error;
 * the caller logs the reason.
 */
export async function updateRecipeApi(
    recipeId: string,
    recipe: UpdateRecipeBody
): Promise<RecipeItem | undefined> {
    try {
        const data = await fetch(
            `${API_BASE_URL}/recipe/${recipeId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(recipe)
            }
        );
        const jsonData = await data.json();

        if (!data.ok) {
            console.log(
                `updateRecipeApi failed: ${data.status} ${data.statusText}`,
                jsonData
            );
            return undefined;
        }

        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}