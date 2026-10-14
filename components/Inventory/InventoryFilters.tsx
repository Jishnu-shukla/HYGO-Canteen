"use client";

import { InventoryFilterCategory } from "@/data/Inventory/type";
import { Search } from "lucide-react";

interface InventoryFiltersProps {
    categories: InventoryFilterCategory[];
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
    /** Current search text, filtered client-side by the table's host. */
    search: string;
    onSearchChange: (value: string) => void;
}

export default function InventoryFilters({
    categories,
    selectedCategory,
    onCategoryChange,
    search,
    onSearchChange,
}: InventoryFiltersProps) {
    const totalItems = categories.reduce(
        (sum, category) => sum + category.count,
        0
    );

    return (
        <div className="mb-4 space-y-3">
            {/* Search sits above the category chips and the table. */}
            <div className="relative w-full lg:max-w-md">
                <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search inventory items..."
                    aria-label="Search inventory items"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
        </div>
    );
}