import { useFoodItemContext } from "@/context/FoodItemContext";
import { getAllRecipesApi, updateRecipeApi } from "@/data/Recipe/api";
import type { RecipeItem, UpdateRecipeBody } from "@/data/Recipe/type";
import { UNITS } from "@/utils/units";
import { ChevronDown, LoaderCircle, Plus, Save, Trash2, X } from "lucide-react";
import { Dispatch, FormEvent, useMemo, useState } from "react";

/**
 * One editable ingredient row. quantity is held as a string while the user
 * types (an <input type="number"> gives "" for a transiently empty field) and
 * converted on submit, so a half-typed value does not read as 0.
 */
type IngredientDraft = {
    item_id: string;
    quantity: string;
    unit_of_measure: string;
};

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                {label}
            </span>
            {children}
        </label>
    );
}

export default function EditRecipeModal({
    recipe,
    setRecipes,
    onClose,
}: {
    recipe: RecipeItem;
    setRecipes: Dispatch<React.SetStateAction<RecipeItem[]>>;
    onClose: () => void;
}) {
    const { items } = useFoodItemContext();

    // The parent mounts this with key={recipe_id}, so a different card remounts
    // with fresh initial state and no sync-back effect is needed.
    const [recipeName, setRecipeName] = useState(recipe.recipe_name);
    const [ingredients, setIngredients] = useState<IngredientDraft[]>(() =>
        recipe.ingredients.map((ingredient) => ({
            item_id: ingredient.item_id.item_id,
            quantity: String(ingredient.quantity),
            unit_of_measure: ingredient.unit_of_measure,
        }))
    );
    const [preparationTime, setPreparationTime] = useState(
        String(recipe.preparation_time ?? "")
    );
    const [nutritionalInfo, setNutritionalInfo] = useState({
        calories: recipe.nutritional_info?.calories ?? 0,
        protein: recipe.nutritional_info?.protein ?? 0,
        carbs: recipe.nutritional_info?.carbs ?? 0,
        fat: recipe.nutritional_info?.fat ?? 0,
        fiber: recipe.nutritional_info?.fiber ?? 0,
        sodium: recipe.nutritional_info?.sodium ?? 0,
        sugar: recipe.nutritional_info?.sugar ?? 0,
        cholestrol: recipe.nutritional_info?.cholestrol ?? 0,
    });
    const [imageUrl, setImageUrl] = useState(recipe.image_url ?? "");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // The recipe's own ingredients may reference an item no longer in the
    // approved inventory list, so keep those selectable rather than dropping
    // them from the dropdown and silently blanking the row.
    const selectableItems = useMemo(() => {
        const byId = new Map<string, string>();

        for (const item of items) {
            byId.set(item.item_id, item.item_name);
        }

        for (const ingredient of recipe.ingredients) {
            if (!byId.has(ingredient.item_id.item_id)) {
                byId.set(ingredient.item_id.item_id, ingredient.item_id.item_name);
            }
        }

        return Array.from(byId, ([item_id, item_name]) => ({
            item_id,
            item_name,
        }));
    }, [items, recipe.ingredients]);

    const updateIngredient = (
        index: number,
        patch: Partial<IngredientDraft>
    ) => {
        setIngredients((current) =>
            current.map((row, rowIndex) =>
                rowIndex === index ? { ...row, ...patch } : row
            )
        );
    };

    const addIngredient = () => {
        setIngredients((current) => [
            ...current,
            { item_id: "", quantity: "", unit_of_measure: "g" },
        ]);
    };

    const removeIngredient = (index: number) => {
        setIngredients((current) =>
            current.filter((_, rowIndex) => rowIndex !== index)
        );
    };

    const isInvalid =
        recipeName.trim() === "" ||
        ingredients.length === 0 ||
        ingredients.some(
            (row) => row.item_id === "" || Number(row.quantity) <= 0
        );

    const handleUpdateRecipe = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isInvalid || saving) return;

        // ingredients replaces the stored list wholesale, so every row is
        // sent. item_id goes over as the plain inventory id — the service
        // unwraps either shape.
        const body: UpdateRecipeBody = {
            recipe_name: recipeName.trim(),
            ingredients: ingredients.map((row) => ({
                item_id: row.item_id,
                quantity: Number(row.quantity),
                unit_of_measure: row.unit_of_measure,
            })),
            preparation_time: Number(preparationTime) || undefined,
            nutritional_info: nutritionalInfo,
            image_url: imageUrl.trim() || null,
        };

        setSaving(true);
        setError("");

        const updated = await updateRecipeApi(recipe.recipe_id, body);

        if (!updated) {
            setError("Could not save the recipe. Please try again.");
            setSaving(false);
            return;
        }

        // Re-read the list so the row carries the populated item names the GET
        // returns; the PUT response may hand back only the stored refs.
        const fresh = await getAllRecipesApi();

        setRecipes(
            Array.isArray(fresh)
                ? fresh
                : (current) =>
                      current.map((entry) =>
                          entry.recipe_id === recipe.recipe_id
                              ? updated
                              : entry
                      )
        );

        setSaving(false);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={() => !saving && onClose()}
        >
            <div
                className="my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-slate-800">
                            Edit Recipe
                        </h2>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                            {recipe.recipe_id}
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form
                    onSubmit={handleUpdateRecipe}
                    className="max-h-[70vh] space-y-4 overflow-y-auto p-5"
                >
                    <Field label="Recipe name">
                        <input
                            required
                            value={recipeName}
                            disabled={saving}
                            onChange={(event) =>
                                setRecipeName(event.target.value)
                            }
                            placeholder="e.g. Vegetable Khichdi"
                            className="form-input"
                        />
                    </Field>

                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-600">
                                Ingredients
                            </span>
                            <span className="text-xs text-slate-400">
                                {ingredients.length} selected
                            </span>
                        </div>

                        {ingredients.length > 0 && (
                            <div className="mb-1 flex items-center gap-2 px-2">
                                <span className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Ingredient
                                </span>
                                <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Quantity
                                </span>
                                <span className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Unit
                                </span>
                                <span className="w-9 shrink-0" />
                            </div>
                        )}

                        <div className="space-y-2">
                            {ingredients.map((row, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2"
                                >
                                    <div className="relative min-w-0 flex-1">
                                        <select
                                            required
                                            value={row.item_id}
                                            disabled={saving}
                                            aria-label="Ingredient"
                                            onChange={(event) =>
                                                updateIngredient(index, {
                                                    item_id: event.target.value,
                                                })
                                            }
                                            className="form-input appearance-none pr-9"
                                        >
                                            <option value="">
                                                Select ingredient
                                            </option>
                                            {selectableItems.map((item) => (
                                                <option
                                                    key={item.item_id}
                                                    value={item.item_id}
                                                >
                                                    {item.item_name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown
                                            size={16}
                                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        />
                                    </div>

                                    <div className="w-24 shrink-0">
                                        <input
                                            required
                                            min="0.01"
                                            step="0.01"
                                            type="number"
                                            value={row.quantity}
                                            disabled={saving}
                                            aria-label="Quantity"
                                            onChange={(event) =>
                                                updateIngredient(index, {
                                                    quantity:
                                                        event.target.value,
                                                })
                                            }
                                            placeholder="Qty"
                                            className="form-input"
                                        />
                                    </div>

                                    <div className="relative w-24 shrink-0">
                                        <select
                                            value={row.unit_of_measure}
                                            disabled={saving}
                                            aria-label="Unit of measure"
                                            onChange={(event) =>
                                                updateIngredient(index, {
                                                    unit_of_measure:
                                                        event.target.value,
                                                })
                                            }
                                            className="form-input appearance-none pr-8"
                                        >
                                            {UNITS.map((value) => (
                                                <option key={value} value={value}>
                                                    {value}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown
                                            size={16}
                                            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        disabled={
                                            saving || ingredients.length === 1
                                        }
                                        onClick={() => removeIngredient(index)}
                                        aria-label="Remove ingredient"
                                        title="Remove ingredient"
                                        className="shrink-0 rounded-lg p-2.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={addIngredient}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2.5 text-xs font-semibold text-amber-700 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-60"
                        >
                            <Plus size={15} />
                            Add ingredient
                        </button>
                    </section>

                    <Field label="Preparation Time (in minutes)">
                        <input
                            required
                            value={preparationTime}
                            disabled={saving}
                            onChange={(event) =>
                                setPreparationTime(event.target.value)
                            }
                            placeholder="e.g. 10"
                            className="form-input"
                        />
                    </Field>

                    <section>
                        <div className="mb-3">
                            <h3 className="text-sm font-bold text-slate-800">
                                Nutritional Information
                            </h3>

                            <p className="mt-0.5 text-xs text-slate-400">
                                Provide the nutritional values per serving.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Field label="Calories">
                                <input
                                    required
                                    min="0"
                                    type="number"
                                    value={nutritionalInfo.calories}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            calories:
                                                parseInt(event.target.value) ||
                                                0,
                                        })
                                    }
                                    placeholder="200"
                                    className="form-input"
                                />
                            </Field>

                            <Field label="Protein (g)">
                                <input
                                    required
                                    min="0"
                                    type="number"
                                    value={nutritionalInfo.protein}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            protein:
                                                parseInt(event.target.value) ||
                                                0,
                                        })
                                    }
                                    placeholder="10"
                                    className="form-input"
                                />
                            </Field>

                            <Field label="Carbs (g)">
                                <input
                                    required
                                    min="0"
                                    type="number"
                                    value={nutritionalInfo.carbs}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            carbs:
                                                parseInt(event.target.value) ||
                                                0,
                                        })
                                    }
                                    placeholder="30"
                                    className="form-input"
                                />
                            </Field>

                            <Field label="Fat (g)">
                                <input
                                    required
                                    min="0"
                                    type="number"
                                    value={nutritionalInfo.fat}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            fat:
                                                parseInt(event.target.value) ||
                                                0,
                                        })
                                    }
                                    placeholder="5"
                                    className="form-input"
                                />
                            </Field>

                            <Field label="Fiber (g)">
                                <input
                                    required
                                    min="0"
                                    type="number"
                                    value={nutritionalInfo.fiber}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            fiber:
                                                parseInt(event.target.value) ||
                                                0,
                                        })
                                    }
                                    placeholder="3"
                                    className="form-input"
                                />
                            </Field>

                            <Field label="Sodium (mg)">
                                <input
                                    required
                                    min="0"
                                    type="number"
                                    value={nutritionalInfo.sodium}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            sodium:
                                                parseInt(event.target.value) ||
                                                0,
                                        })
                                    }
                                    placeholder="200"
                                    className="form-input"
                                />
                            </Field>

                            <Field label="Sugar (g)">
                                <input
                                    required
                                    min="0"
                                    type="number"
                                    value={nutritionalInfo.sugar}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            sugar:
                                                parseInt(event.target.value) ||
                                                0,
                                        })
                                    }
                                    placeholder="10"
                                    className="form-input"
                                />
                            </Field>

                            <Field label="Cholesterol (mg)">
                                <input
                                    required
                                    min="0"
                                    type="number"
                                    value={nutritionalInfo.cholestrol}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            cholestrol:
                                                parseInt(event.target.value) ||
                                                0,
                                        })
                                    }
                                    placeholder="10"
                                    className="form-input"
                                />
                            </Field>
                        </div>
                    </section>

                    <Field label="Image URL">
                        <input
                            value={imageUrl}
                            disabled={saving}
                            onChange={(event) =>
                                setImageUrl(event.target.value)
                            }
                            placeholder="e.g. https://example.com/image.jpg"
                            className="form-input"
                        />
                    </Field>

                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onClose}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isInvalid || saving}
                            className="flex items-center gap-1.5 rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                    Saving
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Save changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .form-input {
                    width: 100%;
                    border-radius: 0.75rem;
                    border: 1px solid rgb(226 232 240);
                    background: rgb(248 250 252);
                    padding: 0.65rem 0.85rem;
                    font-size: 0.875rem;
                    color: rgb(51 65 85);
                    outline: none;
                    transition: all 150ms ease;
                }

                .form-input::placeholder {
                    color: rgb(148 163 184);
                }

                .form-input:focus {
                    border-color: rgb(252 211 77);
                    background: white;
                    box-shadow: 0 0 0 3px rgb(254 243 199);
                }

                .form-input:disabled {
                    opacity: 0.6;
                }
            `}</style>
        </div>
    );
}
