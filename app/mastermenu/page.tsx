"use client";

import EditMenuItemModal from "@/components/MasterMenu/EditMenuItemModal";
import MasterMenuSummaryCards from "@/components/MasterMenu/MasterMenuSummaryCard";
import MenuFiltersWithSearch from "@/components/MasterMenu/MenuFiltersWithSearch";
import {
    matchesMenuStatus,
    MenuStatusFilter,
} from "@/components/MasterMenu/menuStatusFilter";
import MenuProvider, { useMenuContext } from "@/context/MenuContext";
import {
    UpdateMasterMenuItem,
    updateMasterMenuItemApi,
} from "@/data/MasterMenu/api";
import { MasterMenuItem } from "@/data/MasterMenu/type";
import { Clock, PackageSearch, Pencil, Utensils } from "lucide-react";
import { useMemo, useState } from "react";

function MasterMenuContent() {
    const { items, setItems } = useMenuContext();

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<MenuStatusFilter>("all");
    const [editingItem, setEditingItem] = useState<MasterMenuItem | null>(null);

    const summary = useMemo(
        () => ({
            total_menu_items: items.length,
            approved_recipes: items.filter((item) => item.is_approved).length,
            pending_approvals: items.filter((item) => !item.is_approved).length,
        }),
        [items]
    );

    const counts = useMemo(
        () => ({
            all: summary.total_menu_items,
            approved: summary.approved_recipes,
            pending: summary.pending_approvals,
        }),
        [summary]
    );

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        return items.filter((item) => {
            const matchesSearch =
                !query ||
                item.recipe_name.toLowerCase().includes(query) ||
                item.recipe_id?.toLowerCase().includes(query);

            return matchesSearch && matchesMenuStatus(item, status);
        });
    }, [items, search, status]);

    const handleSaveItem = async (
        item: MasterMenuItem,
        changes: UpdateMasterMenuItem
    ) => {
        // Let the failure propagate so the modal can show its own error state.
        const updated = await updateMasterMenuItemApi(item.master_item_id, changes);

        if (!updated) {
            throw new Error("Update request failed");
        }

        setItems((current) =>
            current.map((existing) =>
                existing.master_item_id === item.master_item_id
                    ? { ...existing, ...changes }
                    : existing
            )
        );
    };

    return (
        <main className="m-4 space-y-5 bg-slate-50">
            <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                            Master Menu
                        </h1>

                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            SERVICE
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-amber-800/80">
                        All food items are listed here
                    </p>
                </div>
            </section>

            <MasterMenuSummaryCards summary={summary} />

            <MenuFiltersWithSearch
                search={search}
                setSearch={setSearch}
                status={status}
                setStatus={setStatus}
                counts={counts}
            />

            {filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
                    <PackageSearch className="mx-auto text-slate-300" size={28} />
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        No menu items match your search or filter.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.map((item) => (
                        <article
                            key={item.master_item_id}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                        <Utensils size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold text-slate-800">
                                            {item.recipe_name}
                                        </h3>
                                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                                            {item.recipe_id}
                                        </p>
                                    </div>
                                </div>

                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                        item.is_approved
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700"
                                    }`}
                                >
                                    {item.is_approved ? "Approved" : "Pending"}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                title={`Edit ${item.recipe_name}`}
                                aria-label={`Edit ${item.recipe_name}`}
                                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-2 text-[11px] font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <Pencil size={13} />
                                Edit price &amp; approval
                            </button>

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                <span className="font-semibold text-slate-800">
                                    ₹{Number(item.price).toLocaleString("en-IN")}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {item.preparation_time} min
                                </span>
                                <span className="flex items-center gap-1">
                                    {item.nutritional_info?.cal ?? 0} cal
                                </span>
                            </div>

                            {item.approved_by && (
                                <p className="mt-2 text-[10px] text-slate-400">
                                    Approved by {item.approved_by}
                                </p>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {editingItem && (
                <EditMenuItemModal
                    key={editingItem.master_item_id}
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSaveItem}
                />
            )}
        </main>
    );
}

export default function MasterMenu() {
    return (
        <MenuProvider>
            <MasterMenuContent />
        </MenuProvider>
    );
}
