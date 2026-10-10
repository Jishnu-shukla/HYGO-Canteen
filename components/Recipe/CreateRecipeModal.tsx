import { useFoodItemContext } from "@/context/FoodItemContext";
import { createRecipeApi, getAllRecipesApi } from "@/data/Recipe/api";
import type { CreateRecipeBody, RecipeItem } from "@/data/Recipe/type";
import { UNITS } from "@/utils/units";
import { ChevronDown, LoaderCircle, Plus, X } from "lucide-react";
import { Dispatch, FormEvent, useState } from "react";


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
    const [selectedIngredient, setSelectedIngredient] = useState("");
    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState("g");
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

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const resetForm = () => {
        setRecipeName("");
        setSelectedIngredient("");
        setQuantity("");
        setUnit("g");
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
        setError("");
    };

    const handleCreateRecipe = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const ingredient = items.find(
            (item) => item.item_id === selectedIngredient
        );

        if (!ingredient || !recipeName.trim() || Number(quantity) <= 0) return;

        // recipe_id is minted server-side, and the ingredient goes over as the
        // plain inventory id — the service unwraps either shape.
        const body: CreateRecipeBody = {
            recipe_name: recipeName.trim(),
            ingredients: [
                {
                    item_id: ingredient.item_id,
                    quantity: Number(quantity),
                    unit_of_measure: unit,
                },
            ],
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={() => onClose()}
        >
            <div
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Create Recipe
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-400">
                            Add a recipe using an inventory ingredient.
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

                <form onSubmit={handleCreateRecipe} className="space-y-4 p-5">
                    <Field label="Recipe name">
                        <input
                            required
                            value={recipeName}
                            onChange={(event) => setRecipeName(event.target.value)}
                            placeholder="e.g. Vegetable Khichdi"
                            className="form-input"
                        />
                    </Field>

                    <Field label="Ingredient from inventory">
                        <div className="relative">
                            <select
                                required
                                value={selectedIngredient}
                                onChange={(event) =>
                                    setSelectedIngredient(event.target.value)
                                }
                                className="form-input appearance-none pr-10"
                            >
                                <option value="">Select ingredient</option>
                                {items.map((item) => (
                                    <option key={item.item_id} value={item.item_id}>
                                        {item.item_name} —{" "}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                size={16}
                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                        </div>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Quantity">
                            <input
                                required
                                min="0.01"
                                step="0.01"
                                type="number"
                                value={quantity}
                                onChange={(event) => setQuantity(event.target.value)}
                                placeholder="150"
                                className="form-input"
                            />
                        </Field>

                        <Field label="Unit of measure">
                            <div className="relative">
                                <select
                                    value={unit}
                                    onChange={(event) => setUnit(event.target.value)}
                                    className="form-input appearance-none pr-10"
                                >
                                    {UNITS.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={16}
                                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                            </div>
                        </Field>
                    </div>
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
                            disabled={saving}
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
                                    <Plus size={16} />
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