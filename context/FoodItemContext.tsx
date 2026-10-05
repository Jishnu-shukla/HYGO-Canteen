"use client";

import { getInventoryItemsApi } from "@/data/Inventory/api";
import { InventoryItem } from "@/data/Inventory/type";
import { getAllRecipesApi } from "@/data/Recipe/api";
import { FoodItemContextType } from "@/types/FoodItemContextType";
import { createContext, useContext, useEffect, useState } from "react";

// 1. Use createContext instead of useContext
const FoodItemContext = createContext<FoodItemContextType | undefined>(undefined);

export default function FoodItemProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [recipes, setRecipes] = useState<RecipeItem[]>([]);
    const [loading, setLoading] = useState(false);

    async function getInventoryItems() {
        try {
            setLoading(true)
            const data = await getInventoryItemsApi();
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

    useEffect(() => {
        getInventoryItems()
        getRecipes()
    }, [])

    const FoodItemContextValue: FoodItemContextType = {
        items, 
        recipes,
        setRecipes
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
