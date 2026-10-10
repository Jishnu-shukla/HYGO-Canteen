import type { CreateRecipeBody, RecipeItem, UpdateRecipeBody } from "./type";

export async function getAllRecipesApi() {
    try {
        const data = await fetch('https://4jzhg556-5000.inc1.devtunnels.ms/api/recipe');
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
} 

export async function createRecipeApi(
    recipe: CreateRecipeBody
): Promise<RecipeItem | undefined> {
    try {
        const data = await fetch('https://4jzhg556-5000.inc1.devtunnels.ms/api/recipe', {
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
            `https://4jzhg556-5000.inc1.devtunnels.ms/api/recipe/${recipe_id}`,
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
            `https://4jzhg556-5000.inc1.devtunnels.ms/api/recipe/${recipeId}`,
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