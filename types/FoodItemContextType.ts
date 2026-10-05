import { InventoryItem } from "@/data/Inventory/type"

export type FoodItemContextType = {
    items: InventoryItem[];
    recipes: RecipeItem[];
    setRecipes: React.Dispatch<React.SetStateAction<RecipeItem[]>>;
}