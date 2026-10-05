import { ChefHat, Edit3, PackageSearch, Trash2 } from "lucide-react";
import { useMemo } from "react";

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

export default function RecipesSection({ search, recipes, handleDeleteRecipe, handleEditRecipe }: { search: string, recipes: RecipeItem[], handleDeleteRecipe: (recipeId: string) => void, handleEditRecipe: (recipe: RecipeItem) => void }) {

    const filteredRecipes = useMemo(() => {
        const query = search.trim().toLowerCase();

        return recipes.filter((recipe) => {
            const matchesSearch =
                !query ||
                recipe.recipe_name.toLowerCase().includes(query) ||
                recipe.ingredients.some((ingredient) =>
                    ingredient.item_id.item_name.toLowerCase().includes(query)
                );

            return matchesSearch;
        });
    }, [recipes, search]);

    return (
        <section>
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        Recipes
                    </h2>
                    <p className="text-xs text-slate-400">
                        {filteredRecipes.length} recipe
                        {filteredRecipes.length === 1 ? "" : "s"} found
                    </p>
                </div>
            </div>

            {filteredRecipes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
                    <PackageSearch className="mx-auto text-slate-300" size={28} />
                    <p className="mt-2 text-sm font-medium text-slate-500">{"No recipes match your search or category."}</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredRecipes.map((recipe) => (
                        <article
                            key={recipe.recipe_id}
                            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                        <ChefHat size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold text-slate-800">
                                            {recipe.recipe_name}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                                    <IconButton
                                        label="Edit recipe"
                                        onClick={() => handleEditRecipe(recipe)}
                                    >
                                        <Edit3 size={14} />
                                    </IconButton>
                                    <IconButton
                                        label="Delete recipe"
                                        danger
                                        onClick={() => handleDeleteRecipe(recipe.recipe_id)}
                                    >
                                        <Trash2 size={14} />
                                    </IconButton>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                {recipe.ingredients.map((ingredient) => (
                                    <div
                                        key={`${recipe.recipe_id}-${ingredient.item_id.item_id}`}
                                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-slate-700">
                                                {ingredient.item_id.item_name}
                                            </p>
                                        </div>
                                        <span className="ml-3 shrink-0 text-xs font-semibold text-slate-600">
                                            {ingredient.quantity} {ingredient.unit_of_measure}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    )
}