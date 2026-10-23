"use client";

import { getInventoryItemsApi } from "@/data/Inventory/api";
import { InventoryItem } from "@/data/Inventory/type";
import { getAllRecipesApi } from "@/data/Recipe/api";
import type { RecipeItem } from "@/data/Recipe/type";
import { useAccessControl } from "@/context/AccessControlContext";
import { FoodItemContextType } from "@/types/FoodItemContextType";
import { createContext, useContext, useEffect, useState } from "react";

// 1. Use createContext instead of useContext
const FoodItemContext = createContext<FoodItemContextType | undefined>(undefined);

export default function FoodItemProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [recipes, setRecipes] = useState<RecipeItem[]>([]);
    const [loading, setLoading] = useState(false);

    // The backend guards each list with a matrix row, and the matrix says which
    // rows this role holds: GET /api/inventory needs `adjustInventory`,
    // GET /api/recipe needs `manageRecipes`. Asking first means a role without
    // the row never sends the call — which also stops the global error toast
    // from announcing a 403 on every screen the role opens.
    const { can } = useAccessControl();
    const canReadInventory = can("adjustInventory");
    const canReadRecipes = can("manageRecipes");

    async function getInventoryItems() {
        try {
            setLoading(true)
            const { data } = await getInventoryItemsApi();
            setItems(data);
        } catch (error) {
            console.log(error);
        }
        finally {
            setLoading(false);
        }
    }

    async function getRecipes() {
        try {
            setLoading(true)
            const data = await getAllRecipesApi();
            setRecipes(data);
        } catch (error) {
            console.log(error);
        }
        finally {
            setLoading(false);
        }
    }

    // Runs again when the matrix lands, so a role the live matrix grants the
    // row gets its list even if the built-in matrix did not.
    useEffect(() => {
        if (!canReadInventory) return;

        async function loadInventory() {
            await getInventoryItems();
        }

        void loadInventory();
    }, [canReadInventory])

    useEffect(() => {
        if (!canReadRecipes) return;

        async function loadRecipes() {
            await getRecipes();
        }

        void loadRecipes();
    }, [canReadRecipes])

    const FoodItemContextValue: FoodItemContextType = {
        items, 
        recipes,
        setRecipes,
        refreshItems: getInventoryItems
    };

    return (
        <FoodItemContext.Provider value={FoodItemContextValue}>
            {children}
        </FoodItemContext.Provider>
    )
};


export const useFoodItemContext = () => {
    const context = useContext(FoodItemContext);
    if (!context) {
        throw new Error("useInventoryContext must be used within an InventoryProvider");
    }

    return context;
};
