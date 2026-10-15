import { useFoodItemContext } from "@/context/FoodItemContext";
import { createRecipeApi, getAllRecipesApi } from "@/data/Recipe/api";
import {
    getSpoonacularNutrition,
    searchSpoonacularRecipes,
    type SpoonacularSearchResult,
} from "@/data/Recipe/spoonacular";
import type { CreateRecipeBody, RecipeItem } from "@/data/Recipe/type";
import { UNITS } from "@/utils/units";
import { ChevronDown, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { Dispatch, FormEvent, useEffect, useRef, useState } from "react";

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

const EMPTY_INGREDIENT: IngredientDraft = {
    item_id: "",
    quantity: "",
    unit_of_measure: "g",
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

export default function CreateRecipeModal({ setRecipes, onClose }: { setRecipes: Dispatch<React.SetStateAction<RecipeItem[]>>, onClose: () => void }) {

    const { items } = useFoodItemContext();

    const [recipeName, setRecipeName] = useState("");
    const [ingredients, setIngredients] = useState<IngredientDraft[]>([
        { ...EMPTY_INGREDIENT },
    ]);
    const [preparationTime, setPreparationTime] = useState("");
    const [nutritionalInfo, setNutritionalInfo] = useState({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sodium: 0,
        sugar: 0,
        cholestrol: 0
    });
    const [imageUrl, setImageUrl] = useState("");

    // Recipe-name autocomplete, fed by the Spoonacular search proxy.
    const [suggestions, setSuggestions] = useState<SpoonacularSearchResult[]>([]);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);

    const [nutritionLoading, setNutritionLoading] = useState(false);
    const [nutritionNotice, setNutritionNotice] = useState("");

    // The recipe picked from the dropdown — its Spoonacular id and image. Kept
    // so the form can tell a looked-up recipe from a manually typed name.
    const [selectedRecipe, setSelectedRecipe] = useState<{
        id: number;
        imageUrl: string;
    } | null>(null);

    // Debounce timer plus a sequence stamp, so a slow earlier search cannot
    // overwrite the results of a later keystroke.
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchSeqRef = useRef(0);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const resetForm = () => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        setRecipeName("");
        setIngredients([{ ...EMPTY_INGREDIENT }]);
        setPreparationTime("");
        setNutritionalInfo({
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sodium: 0,
            sugar: 0,
            cholestrol: 0,
        });
        setImageUrl("");
        setSuggestions([]);
        setSuggestionsOpen(false);
        setHighlighted(-1);
        setSearching(false);
        setNutritionLoading(false);
        setNutritionNotice("");
        setSelectedRecipe(null);
        setError("");
    };

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
        setIngredients((current) => [...current, { ...EMPTY_INGREDIENT }]);
    };

    const removeIngredient = (index: number) => {
        setIngredients((current) =>
            current.filter((_, rowIndex) => rowIndex !== index)
        );
    };

    // Cancel a pending debounce when the modal closes. No state is touched
    // here, so it stays clear of the set-state-in-effect rule.
    useEffect(() => {
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, []);

    /**
     * Typing the recipe name also drives the dropdown. The request is
     * debounced and stamped with a sequence number: a slow earlier search
     * cannot overwrite the results of a later keystroke.
     */
    function scheduleSearch(value: string) {
        setRecipeName(value);
        setSelectedRecipe(null);
        setNutritionNotice("");
        setHighlighted(-1);

        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        const trimmed = value.trim();

        if (trimmed.length < 3) {
            searchSeqRef.current += 1; // invalidate any in-flight search
            setSuggestions([]);
            setSuggestionsOpen(false);
            setSearching(false);
            return;
        }

        setSearching(true);
        setSuggestionsOpen(true);

        const seq = searchSeqRef.current + 1;
        searchSeqRef.current = seq;

        searchTimerRef.current = setTimeout(async () => {
            const results = await searchSpoonacularRecipes(trimmed);

            if (seq !== searchSeqRef.current) return;

            setSuggestions(results ?? []);
            setSuggestionsOpen(true);
            setSearching(false);
        }, 350);
    }

    /**
     * Picking a suggestion fills the name and image, then loads the recipe's
     * nutrition and drops it into the eight nutrition fields.
     */
    async function handleSelectRecipe(result: SpoonacularSearchResult) {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchSeqRef.current += 1; // invalidate any in-flight search

        setRecipeName(result.title);
        setSuggestions([]);
        setSuggestionsOpen(false);
        setHighlighted(-1);
        setSelectedRecipe({ id: result.id, imageUrl: result.image });
        setImageUrl(result.image);

        setNutritionLoading(true);
        setNutritionNotice("");

        const nutrition = await getSpoonacularNutrition(result.id);

        setNutritionLoading(false);

        if (!nutrition) {
            setNutritionNotice(
                "Could not load nutrition for this recipe — enter it manually."
            );
            return;
        }

        setNutritionalInfo(nutrition);
    }

    function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (!suggestionsOpen || suggestions.length === 0) return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlighted(
                (current) => (current + 1) % suggestions.length
            );
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlighted(
                (current) =>
                    (current - 1 + suggestions.length) % suggestions.length
            );
        } else if (event.key === "Enter" && highlighted >= 0) {
            event.preventDefault();
            handleSelectRecipe(suggestions[highlighted]);
        } else if (event.key === "Escape") {
            setSuggestionsOpen(false);
        }
    }

    const isInvalid =
        recipeName.trim() === "" ||
        ingredients.length === 0 ||
        ingredients.some(
            (row) => row.item_id === "" || Number(row.quantity) <= 0
        );

    const handleCreateRecipe = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isInvalid || saving) return;

        // recipe_id is minted server-side, and each ingredient goes over as the
        // plain inventory id — the service unwraps either shape.
        const body: CreateRecipeBody = {
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

        const created = await createRecipeApi(body);

        if (!created) {
            setError("Could not create the recipe. Please try again.");
            setSaving(false);
            return;
        }

        // Re-read the list so the new row carries the populated item names the
        // GET returns; the create response may hand back only the stored refs.
        const fresh = await getAllRecipesApi();

        setRecipes(
            Array.isArray(fresh) ? fresh : (current) => [created, ...current]
        );

        setSaving(false);
        resetForm();
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
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Create Recipe
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-400">
                            Build a recipe from one or more inventory
                            ingredients.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            resetForm();
                            onClose();
                        }}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form
                    onSubmit={handleCreateRecipe}
                    className="max-h-[70vh] space-y-4 overflow-y-auto p-5"
                >
                    <div className="relative">
                        <label
                            htmlFor="recipe-name"
                            className="mb-1.5 block text-xs font-semibold text-slate-600"
                        >
                            Recipe name
                        </label>

                        <div className="relative">
                            <input
                                id="recipe-name"
                                required
                                autoComplete="off"
                                value={recipeName}
                                onChange={(event) =>
                                    scheduleSearch(event.target.value)
                                }
                                onFocus={() => {
                                    if (suggestions.length > 0) {
                                        setSuggestionsOpen(true);
                                    }
                                }}
                                onBlur={() =>
                                    window.setTimeout(
                                        () => setSuggestionsOpen(false),
                                        150
                                    )
                                }
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search a recipe, e.g. Vegetable Khichdi"
                                className="form-input pr-10"
                            />

                            {searching && (
                                <LoaderCircle
                                    size={16}
                                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                                />
                            )}
                        </div>

                        {suggestionsOpen && (
                            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                                {suggestions.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-slate-400">
                                        {searching
                                            ? "Searching…"
                                            : "No recipes found."}
                                    </p>
                                ) : (
                                    suggestions.map((result, index) => (
                                        <button
                                            key={result.id}
                                            type="button"
                                            // Keep focus so the click lands
                                            // before the input's blur closes
                                            // the list.
                                            onMouseDown={(event) =>
                                                event.preventDefault()
                                            }
                                            onClick={() =>
                                                handleSelectRecipe(result)
                                            }
                                            onMouseEnter={() =>
                                                setHighlighted(index)
                                            }
                                            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition ${
                                                highlighted === index
                                                    ? "bg-amber-50 text-amber-900"
                                                    : "text-slate-700 hover:bg-slate-50"
                                            }`}
                                        >
                                            <span
                                                aria-hidden
                                                className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 bg-cover bg-center"
                                                style={{
                                                    backgroundImage: result.image
                                                        ? `url(${result.image})`
                                                        : undefined,
                                                }}
                                            />

                                            <span className="min-w-0 flex-1 truncate font-medium">
                                                {result.title}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {nutritionLoading && (
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                <LoaderCircle
                                    size={11}
                                    className="animate-spin"
                                />
                                Loading nutrition…
                            </p>
                        )}

                        {!nutritionLoading && nutritionNotice && (
                            <p className="mt-1 text-[10px] text-amber-600">
                                {nutritionNotice}
                            </p>
                        )}

                        {!nutritionLoading &&
                            !nutritionNotice &&
                            selectedRecipe && (
                                <p className="mt-1 text-[10px] text-slate-400">
                                    Nutrition and image filled from Spoonacular
                                    recipe #{selectedRecipe.id}.
                                </p>
                            )}
                    </div>

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
                                            {items.map((item) => (
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
                        <div className="relative">
                            <input
                                required
                                value={preparationTime}
                                onChange={(event) => setPreparationTime(event.target.value)}
                                placeholder="e.g. 10"
                                className="form-input"
                            />
                        </div>
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
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            calories: parseInt(event.target.value) || 0,
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
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            protein: parseInt(event.target.value) || 0,
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
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            carbs: parseInt(event.target.value) || 0,
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
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            fat: parseInt(event.target.value) || 0,
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
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            fiber: parseInt(event.target.value) || 0,
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
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            sodium: parseInt(event.target.value) || 0,
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
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            sugar: parseInt(event.target.value) || 0,
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
                                    onChange={(event) =>
                                        setNutritionalInfo({
                                            ...nutritionalInfo,
                                            cholestrol: parseInt(event.target.value) || 0,
                                        })
                                    }
                                    placeholder="10"
                                    className="form-input"
                                />
                            </Field>
                        </div>
                    </section>
                    <Field label="Image URL">
                        <div className="relative">
                            <input
                                value={imageUrl}
                                onChange={(event) => setImageUrl(event.target.value)}
                                placeholder="e.g. https://example.com/image.jpg"
                                className="form-input"
                            />
                        </div>
                    </Field>
                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                onClose();
                            }}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
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
                                    Creating
                                </>
                            ) : (
                                <>
                                    Create Recipe
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
            `}</style>
        </div>
    )
}