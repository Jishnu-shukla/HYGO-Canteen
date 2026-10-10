import { InventoryItem } from "@/data/Inventory/type"

export type FoodItemContextType = {
    items: InventoryItem[];
    recipes: RecipeItem[];
    setRecipes: React.Dispatch<React.SetStateAction<RecipeItem[]>>;
    /** Re-fetches the inventory items from the API and updates `items`. */
    refreshItems: () => Promise<void>;
}