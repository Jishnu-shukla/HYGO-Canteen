"use client";

import CreateRecipeModal from "@/components/Recipe/CreateRecipeModal";
import EditRecipeModal from "@/components/Recipe/EditRecipeModal";
import RecipeFiltersWithSearch from "@/components/Recipe/RecipeFiltersWithSearch";
import RecipesSection from "@/components/Recipe/RecipesSection";
import RecipeSummaryCard from "@/components/Recipe/RecipeSummaryCard";
import { useFoodItemContext } from "@/context/FoodItemContext";
import { InventoryBatch, InventoryItem } from "@/data/Inventory/type";
import { deleteRecipeApi } from "@/data/Recipe/api";
import type { RecipeItem } from "@/data/Recipe/type";
import {
    ChefHat,
    ChevronDown,
    Edit3,
    Leaf,
    PackageSearch,
    Plus,
    Search,
    ShoppingCart,
    Trash2,
    X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";



const CATEGORIES = [
    "ALL",
    "Dry_Goods",
    "Produce",
    "Dairy",
    "Medical_Nutrition",
    "Beverages",
    "Cleaning",
];



export default function Recipe() {
    const { items, recipes, setRecipes } = useFoodItemContext()
    
    const [inventory] = useState<InventoryItem[]>(items);

    const [search, setSearch] = useState("");
    const [isCreateRecipeOpen, setIsCreateRecipeOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<RecipeItem | null>(null);

    // Ids currently being deleted, so each card can spin its own button.
    const [deletingIds, setDeletingIds] = useState<string[]>([]);

    const handleDeleteRecipe = async (recipeId: string) => {
        setDeletingIds((current) =>
            current.includes(recipeId) ? current : [...current, recipeId]
        );

        const deleted = await deleteRecipeApi(recipeId);

        setDeletingIds((current) =>
            current.filter((id) => id !== recipeId)
        );

        // Keep the row on failure — the api helper already logged the reason.
        if (!deleted) return;

        setRecipes((current) =>
            current.filter((recipe) => recipe.recipe_id !== recipeId)
        );
    };

    const handleEditRecipe = (recipe: RecipeItem) => {
        setEditingRecipe(recipe);
    };

    return (
        <main className="space-y-5 pb-8 m-3.5 bg-slate-50">
            {/* Header */}
            <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <ChefHat size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Recipe
                            </h1>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                SERVICE
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Create and manage recipes using ingredients available in inventory.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsCreateRecipeOpen(true)}
                    className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                    <Plus size={18} />
                    Create Recipe
                </button>
            </section>

            {/* Recipe summary cards */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <RecipeSummaryCard
                    icon={<ChefHat size={19} />}
                    label="Total Recipes"
                    value={recipes.length}
                    helper="Available recipes"
                />
                <RecipeSummaryCard
                    icon={<PackageSearch size={19} />}
                    label="Ingredients"
                    value={new Set(
                        recipes.flatMap((recipe) =>
                            recipe.ingredients.map((ingredient) => ingredient.item_id)
                        )
                    ).size}
                    helper="Used in recipes"
                />
                <RecipeSummaryCard
                    icon={<ShoppingCart size={19} />}
                    label="Pre-ordered"
                    value={0}
                    helper="Inventory items"
                />
            </section>

            {/* Search + category filters */}
            <RecipeFiltersWithSearch search={search} setSearch={setSearch}/>

            {/* Recipe cards */}
            <RecipesSection search={search} recipes={recipes} handleDeleteRecipe={handleDeleteRecipe} handleEditRecipe={handleEditRecipe} deletingIds={deletingIds} />

            {/* Create recipe modal */}
            {isCreateRecipeOpen && <CreateRecipeModal setRecipes={setRecipes} onClose={() => setIsCreateRecipeOpen(false)} />}

            {/* Edit recipe modal */}
            {editingRecipe && (
                <EditRecipeModal
                    key={editingRecipe.recipe_id}
                    recipe={editingRecipe}
                    setRecipes={setRecipes}
                    onClose={() => setEditingRecipe(null)}
                />
            )}

        </main>
    );
}



function IconButton({
    children,
    label,
    danger = false,
    active = false,
    onClick,
}: {
    children: React.ReactNode;
    label: string;
    danger?: boolean;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className={`rounded-lg p-2 transition ${
                active
                    ? "bg-blue-50 text-blue-700"
                    : danger
                      ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
                      : "text-slate-400 hover:bg-amber-50 hover:text-amber-700"
            }`}
        >
            {children}
        </button>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
            <PackageSearch className="mx-auto text-slate-300" size={28} />
            <p className="mt-2 text-sm font-medium text-slate-500">{message}</p>
        </div>
    );
}
