"use client";

import { useMenuContext } from "@/context/MenuContext";
import {
    CreateGeneralMenuBody,
    CreateMenuBody,
    CreatePatientMenuBody,
    DIET_TYPE,
    DietType,
    MEAL_TYPE,
    MealSlot,
    MenuDay,
    PAITENTMENU_DAYS,
} from "@/data/Menu/type";
import { LoaderCircle, Plus, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

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

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 disabled:opacity-60";

export default function MenuUploadModal({
    menuType,
    onClose,
    onSave,
}: {
    menuType: "patient" | "general";
    onClose: () => void;
    onSave: (body: CreateMenuBody) => Promise<void>;
}) {
    const { items: masterItems } = useMenuContext();

    // Only approved master items can be added to a published menu.
    const approvedItems = useMemo(
        () => masterItems.filter((item) => item.is_approved),
        [masterItems]
    );

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sellingPrices, setSellingPrices] = useState<Record<string, string>>({});
    const [isAvailable, setIsAvailable] = useState(true);
    const [mealSlot, setMealSlot] = useState<MealSlot>("Breakfast");
    const [days, setDays] = useState<MenuDay[]>([]);
    const [date, setDate] = useState("");
    const [dietType, setDietType] = useState<DietType>("Normal");
    const [portionSize, setPortionSize] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const isPatient = menuType === "patient";

    const toggleDay = (day: MenuDay) => {
        setDays((current) =>
            current.includes(day)
                ? current.filter((d) => d !== day)
                : [...current, day]
        );
    };

    const toggleItem = (id: string) => {
        setSelectedIds((current) =>
            current.includes(id)
                ? current.filter((existing) => existing !== id)
                : [...current, id]
        );
    };

    const selectedCount = selectedIds.length;

    const isInvalid =
        selectedCount === 0 || (isPatient && date.trim() === "");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isInvalid || saving) return;

        // Reject up front rather than posting a menu with a blank selling price.
        if (!isPatient) {
            const hasBlankPrice = selectedIds.some(
                (id) =>
                    sellingPrices[id] === undefined ||
                    sellingPrices[id].trim() === "" ||
                    Number(sellingPrices[id]) < 0
            );

            if (hasBlankPrice) {
                setError("Enter a selling price for every selected item.");
                return;
            }
        }

        const body: CreateMenuBody = isPatient
            ? ({
                type: "patient",
                date: date.trim(),
                meal_slot: mealSlot,
                diet_type: dietType,
                day_of_week: days,
                portion_size: portionSize.trim() || undefined,
                items: selectedIds.map((id) => ({ master_item_id: id })),
            } satisfies CreatePatientMenuBody)
            : ({
                type: "general",
                meal_slot: mealSlot,
                day_of_week: days,
                is_available: isAvailable,
                items: selectedIds.map((id) => ({
                    master_item_id: id,
                    selling_price: Number(sellingPrices[id]),
                })),
            } satisfies CreateGeneralMenuBody);

        try {
            setSaving(true);
            setError("");
            await onSave(body);
            onClose();
        } catch (err) {
            console.error("Error creating menu:", err);
            setError("Could not create the menu. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={() => !saving && onClose()}
        >
            <div
                className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            Upload {isPatient ? "Patient" : "General"} Menu
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-400">
                            {isPatient
                                ? "Assign approved recipes to a date, meal slot and diet."
                                : "Publish cafeteria items with a per-item selling price."}
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

                <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {isPatient && (
                            <Field label="Date">
                                <input
                                    required
                                    type="date"
                                    value={date}
                                    disabled={saving}
                                    onChange={(event) => setDate(event.target.value)}
                                    className={inputClass}
                                />
                            </Field>
                        )}

                        <Field label="Meal slot">
                            <select
                                value={mealSlot}
                                disabled={saving}
                                onChange={(event) => setMealSlot(event.target.value as MealSlot)}
                                className={`${inputClass} appearance-none`}
                            >
                                {MEAL_TYPE.map((slot) => (
                                    <option key={slot} value={slot}>
                                        {slot}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        {isPatient && (
                            <>
                                <Field label="Diet type">
                                    <select
                                        value={dietType}
                                        disabled={saving}
                                        onChange={(event) => setDietType(event.target.value as DietType)}
                                        className={`${inputClass} appearance-none`}
                                    >
                                        {DIET_TYPE.map((diet) => (
                                            <option key={diet} value={diet}>
                                                {diet}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Portion size">
                                    <input
                                        value={portionSize}
                                        disabled={saving}
                                        onChange={(event) => setPortionSize(event.target.value)}
                                        placeholder="e.g. 1 bowl (250g)"
                                        className={inputClass}
                                    />
                                </Field>
                            </>
                        )}

                        {!isPatient && (
                            <Field label="Availability">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => setIsAvailable(true)}
                                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                                            isAvailable
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                : "border-slate-200 bg-slate-50 text-slate-500"
                                        }`}
                                    >
                                        Available
                                    </button>
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => setIsAvailable(false)}
                                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                                            !isAvailable
                                                ? "border-amber-500 bg-amber-50 text-amber-700"
                                                : "border-slate-200 bg-slate-50 text-slate-500"
                                        }`}
                                    >
                                        Unavailable
                                    </button>
                                </div>
                            </Field>
                        )}
                    </div>

                    <Field label="Days of week">
                        <div className="flex flex-wrap gap-2">
                            {PAITENTMENU_DAYS.map((day) => {
                                const isActive = days.includes(day);

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        disabled={saving}
                                        onClick={() => toggleDay(day)}
                                        className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition disabled:opacity-60 ${
                                            isActive
                                                ? "border-amber-600 bg-amber-600 text-white"
                                                : "border-amber-200 bg-white text-amber-700 hover:border-amber-400"
                                        }`}
                                    >
                                        {day.slice(0, 3)}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-600">
                                Items
                            </span>
                            <span className="text-[11px] text-slate-400">
                                {selectedCount} selected
                            </span>
                        </div>

                        {approvedItems.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
                                No approved master items yet. Approve items in Master
                                Menu first.
                            </p>
                        ) : (
                            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                                {approvedItems.map((item) => {
                                    const isSelected = selectedIds.includes(item.master_item_id);

                                    return (
                                        <div
                                            key={item.master_item_id}
                                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                                                isSelected ? "bg-amber-50" : "bg-slate-50"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={saving}
                                                onChange={() => toggleItem(item.master_item_id)}
                                                className="h-4 w-4 shrink-0 accent-amber-600"
                                                aria-label={`Select ${item.recipe_name}`}
                                            />

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-semibold text-slate-700">
                                                    {item.recipe_name}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    Base ₹{Number(item.price).toLocaleString("en-IN")}
                                                </p>
                                            </div>

                                            {!isPatient && isSelected && (
                                                <div className="relative w-28 shrink-0">
                                                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                                        ₹
                                                    </span>
                                                    <input
                                                        required
                                                        min="0"
                                                        step="0.01"
                                                        type="number"
                                                        value={sellingPrices[item.master_item_id] ?? ""}
                                                        disabled={saving}
                                                        onChange={(event) =>
                                                            setSellingPrices((current) => ({
                                                                ...current,
                                                                [item.master_item_id]: event.target.value,
                                                            }))
                                                        }
                                                        placeholder="0.00"
                                                        aria-label={`Selling price for ${item.recipe_name}`}
                                                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-6 pr-2 text-xs text-slate-700 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 disabled:opacity-60"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

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
                            className="flex items-center gap-1.5 rounded-full bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <LoaderCircle size={16} className="animate-spin" />
                                    Uploading
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    Upload Menu
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
