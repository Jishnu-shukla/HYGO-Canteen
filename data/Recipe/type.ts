type RecipeIngredient = {
    item_id: {
        item_id: string;
        item_name: string
    };
    quantity: number;
    unit_of_measure: string;
};

type RecipeItem = {
    recipe_id: string;
    recipe_name: string;
    ingredients: RecipeIngredient[];
    nutritional_info: {
        calories: number,
		protein: number,
		carbs: number,
		fat: number,
		fiber: number,
		sodium: number,
		sugar: number,
		cholestrol: number
    }
    preparation_time: number;
    image_url: string | null;
};