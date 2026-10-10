"use client";

import type { PatientMenuPickItem } from "@/data/Menu/type";
import { Ban, LoaderCircle, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 disabled:opacity-60";

/**
 * The plan withholds nothing by default: every dish is allowed until the
 * dietitian strikes it out. So the list is an "allowed" roster and selection
 * *removes* from the plan rather than adding to a deny-list.
 *
 * State stays a list of master_item_id strings — the payload is
 * `disallowed_items_id` — and every dish renders in place, struck through when
 * withheld, so the dietitian edits the roster they can see instead of tracking
 * a second hidden set.
 *
 * Rows come from the patient menu, one per item per meal slot, so the roster
 * shows what the patient can actually be served and each row names its slot.
 */
export default function DisallowedItemsPicker({
    items,
    loading = false,
    selected,
    onChange,
    disabled = false,
}: {
    items: PatientMenuPickItem[];
    loading?: boolean;
    /** master_item_id values withheld from this patient. */
    selected: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
}) {
    const [query, setQuery] = useState("");

    const selectedSet = useMemo(
        () => new Set(selected),
        [selected]
    );

    // Name wins ties, so a dish is reachable under either identifier.
    const visibleItems = useMemo(() => {
        const needle = query.trim().toLowerCase();

        if (!needle) return items;

        return items.filter(
            (item) =>
                item.recipe_name?.toLowerCase().includes(needle) ||
                item.master_item_id?.toLowerCase().includes(needle) ||
                item.meal_slot?.toLowerCase().includes(needle)
        );
    }, [items, query]);

    const toggle = (masterItemId: string) => {
        onChange(
            selectedSet.has(masterItemId)
                ? selected.filter((id) => id !== masterItemId)
                : [...selected, masterItemId]
        );
    };

    // Selection is by master_item_id, and one dish can appear in several meal
    // slots, so the totals count distinct dishes while the roster keeps each
    // slot on its own row.
    const distinctCount = useMemo(
        () => new Set(items.map((item) => item.master_item_id)).size,
        [items]
    );

    const withheldCount = selected.length;

    return (
        <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600">
                    Patient menu items
                </span>

                <span
                    className={`text-[10px] font-semibold ${
                        withheldCount > 0 ? "text-red-600" : "text-slate-400"
                    }`}
                >
                    {withheldCount === 0
                        ? `All ${distinctCount} allowed`
                        : `${withheldCount} of ${distinctCount} withheld`}
                </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50">
                {/* Search */}
                <div className="flex items-center gap-2 border-b border-slate-200 pr-2">
                    <div className="relative min-w-0 flex-1">
                        {loading ? (
                            <LoaderCircle
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-amber-600"
                            />
                        ) : (
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                        )}

                        <input
                            type="text"
                            value={query}
                            disabled={disabled}
                            autoComplete="off"
                            aria-label="Search menu items"
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search dish or MST id..."
                            className={`${inputClass} rounded-none border-0 bg-transparent pl-9`}
                        />
                    </div>

                    {/* Only useful once something is withheld. */}
                    {withheldCount > 0 && (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange([])}
                            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60"
                        >
                            <RotateCcw size={11} />
                            Allow all
                        </button>
                    )}
                </div>

                {/* Roster */}
                <div className="max-h-64 overflow-y-auto">
                    {loading ? (
                        <p className="px-3.5 py-4 text-xs text-slate-400">
                            Loading menu items...
                        </p>
                    ) : items.length === 0 ? (
                        <p className="px-3.5 py-4 text-xs text-slate-400">
                            No menu items available yet.
                        </p>
                    ) : visibleItems.length === 0 ? (
                        <p className="px-3.5 py-4 text-xs text-slate-400">
                            No menu item matches &ldquo;{query.trim()}&rdquo;.
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {visibleItems.map((item) => {
                                const isWithheld = selectedSet.has(
                                    item.master_item_id
                                );

                                return (
                                    <li
                                        key={`${item.master_item_id}-${item.meal_slot}`}
                                    >
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() =>
                                                toggle(item.master_item_id)
                                            }
                                            aria-pressed={isWithheld}
                                            title={
                                                isWithheld
                                                    ? `Allow ${item.recipe_name} (${item.meal_slot}) again`
                                                    : `Withhold ${item.recipe_name} (${item.meal_slot})`
                                            }
                                            className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition disabled:opacity-60 ${
                                                isWithheld
                                                    ? "bg-red-50/70 hover:bg-red-50"
                                                    : "hover:bg-white"
                                            }`}
                                        >
                                            <span
                                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                                                    isWithheld
                                                        ? "bg-red-500 text-white"
                                                        : "bg-emerald-50 text-emerald-600"
                                                }`}
                                            >
                                                {isWithheld ? (
                                                    <Ban size={13} />
                                                ) : (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                )}
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <span
                                                    className={`block truncate text-sm font-medium ${
                                                        isWithheld
                                                            ? "text-slate-400 line-through decoration-red-400 decoration-2"
                                                            : "text-slate-800"
                                                    }`}
                                                >
                                                    {item.recipe_name}{" "}
                                                    <span className="font-normal text-slate-400">
                                                        ({item.meal_slot})
                                                    </span>
                                                </span>

                                                <span className="block truncate text-[10px] text-slate-400">
                                                    {item.master_item_id}
                                                </span>
                                            </span>

                                            <span
                                                className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                                                    isWithheld
                                                        ? "text-red-500"
                                                        : "text-emerald-600"
                                                }`}
                                            >
                                                {isWithheld ? "Withheld" : "Allowed"}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            <span className="mt-1 block text-[10px] text-slate-400">
                Every dish is allowed by default. Select one to strike it out
                and withhold it from this patient.
            </span>
        </div>
    );
}
