"use client";

import { InventoryFilterCategory } from "@/data/Inventory/type";

interface InventoryFiltersProps {
    categories: InventoryFilterCategory[];
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
}

export default function InventoryFilters({
    categories,
    selectedCategory,
    onCategoryChange,
}: InventoryFiltersProps) {
    const totalItems = categories.reduce(
        (sum, category) => sum + category.count,
        0
    );

    return (
        <div className="mb-4 flex flex-wrap items-center gap-2">
            {/* All Categories */}
            <button
                type="button"
                onClick={() => onCategoryChange("All")}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                    selectedCategory === "All"
                        ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                        : "border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50"
                }`}
            >
                ALL CATEGORIES ({totalItems})
            </button>

            {/* Category filters */}
            {categories.map((category) => {
                const isActive = selectedCategory === category.name;

                return (
                    <button
                        key={category.name}
                        type="button"
                        onClick={() => onCategoryChange(category.name)}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                            isActive
                                ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                                : "border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50"
                        }`}
                    >
                        {category.name.toUpperCase()} ({category.count})
                    </button>
                );
            })}
        </div>
    );
}