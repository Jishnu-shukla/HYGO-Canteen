export type RecipeIngredient = {
    item_id: {
        item_id: string;
        item_name: string;
    };
    quantity: number;
    unit_of_measure: string;
};

export type RecipeItem = {
    recipe_id: string;
    recipe_name: string;
    ingredients: RecipeIngredient[];
    nutritional_info: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        sodium: number;
        sugar: number;
        cholestrol: number;
    };
    preparation_time: number;
    image_url: string | null;
};

/**
 * POST /api/recipe request body.
 *
 * ingredients[].item_id accepts either the plain inventory business id
 * ("ITEM-000001") or the nested lookup shape ({ item_id, item_name });
 * the service unwraps both (recipe.service.ts create()).
 * recipe_id is intentionally absent — it is minted server-side via
 * generateId("RECIPE_ID", "REC").
 */
export interface CreateRecipeBody {
    recipe_name: string;
    ingredients: {
        item_id: string | { item_id: string; item_name: string };
        quantity: number;
        unit_of_measure: string;
    }[];
    preparation_time?: number;
    nutritional_info?: Record<string, number>;
    image_url?: string | null;
}

/**
 * PUT /api/recipe/:recipe_id request body.
 *
 * Partial update — every field is optional; omitted fields are left unchanged.
 * ingredients replaces all three parallel arrays (ingredient_inventory_id,
 * quantity_required, unit_of_measure) atomically. item_id accepts the same
 * two forms as CreateRecipeBody.
 */
export interface UpdateRecipeBody {
    recipe_name?: string;
    ingredients?: {
        item_id: string | { item_id: string; item_name: string };
        quantity: number;
        unit_of_measure: string;
    }[];
    preparation_time?: number;
    nutritional_info?: Record<string, number>;
    image_url?: string | null;
}
