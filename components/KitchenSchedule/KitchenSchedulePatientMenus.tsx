"use client";

import {
    DayCell,
    MENU_CELL,
    MENU_HEAD,
    Pill,
    formatDate,
} from "@/components/Menu/MenuShared";
import type { PatientMenu } from "@/data/Menu/type";
import { Utensils } from "lucide-react";

function aggregateNutritionalInfo(menus: PatientMenu[]): Record<string, number> | null {
    const totals: Record<string, number> = {};

    menus.forEach((menu) => {
        const menuNi = (menu as any).nutritional_info || (menu as any).nutritionalInfo || (menu as any).nutrition_info || (menu as any).nutrients;
        if (menuNi && typeof menuNi === "object") {
            Object.entries(menuNi).forEach(([key, value]) => {
                if (typeof value === "number") {
                    totals[key] = (totals[key] || 0) + value;
                }
            });
            return;
        }
        menu.items?.forEach((item: any) => {
            const ni = item.nutritional_info || item.nutrition_info || item.nutrients;
            if (ni && typeof ni === "object") {
                Object.entries(ni).forEach(([key, value]) => {
                    if (typeof value === "number") {
                        totals[key] = (totals[key] || 0) + value;
                    }
                });
            }
        });
    });

    return Object.keys(totals).length > 0 ? totals : null;
}

function NutritionalInfoBanner({ nutritionalInfo }: { nutritionalInfo?: Record<string, number> | null }) {
    if (!nutritionalInfo || Object.keys(nutritionalInfo).length === 0) {
        return null;
    }

    const entries = Object.entries(nutritionalInfo).filter(
        ([, value]) => value !== undefined && value !== null && typeof value === "number"
    );

    if (entries.length === 0) {
        return null;
    }

    return (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-amber-900">
                Nutritional Info (Whole Patient Menu)
            </p>
            <div className="flex flex-wrap gap-2">
                {entries.map(([key, value]) => (
                    <span
                        key={key}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-white px-2.5 py-1 text-xs font-medium text-amber-900"
                    >
                        <span className="capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="font-semibold">{Number(value).toFixed(2).replace(/\.00$/, "")}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

/**
 * Read-only view of the patient menus held in MenuScheduleContext, shown on the
 * kitchen schedule under the per-slot order tiles.
 *
 * The kitchen works from the same patient menus the dietitian scheduled, so this
 * is the plan itself rather than a per-order projection — it carries no actions
 * and no price, unlike the editable PatientMenuTable on the menu screen.
 */
export function KitchenSchedulePatientMenus({
    menus,
    loading = false,
}: {
    menus: PatientMenu[];
    loading?: boolean;
}) {
    if (loading) {
        return (
            <section className="mt-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex items-center gap-2">
                        <Utensils size={18} className="text-slate-400" />
                        <h2 className="text-base font-semibold text-slate-800">
                            Patient Menus
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500">
                        Menus scheduled for patient meals
                    </p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="px-4 py-10 text-center text-sm text-slate-400">
                        Loading patient menus...
                    </div>
                </div>
            </section>
        );
    }

    if (menus.length === 0) {
        return (
            <section className="mt-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex items-center gap-2">
                        <Utensils size={18} className="text-slate-400" />
                        <h2 className="text-base font-semibold text-slate-800">
                            Patient Menus
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500">
                        Menus scheduled for patient meals
                    </p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="px-4 py-10 text-center text-sm text-slate-400">
                        No patient menus scheduled.
                    </div>
                </div>
            </section>
        );
    }

    const nutritionalInfo =
        menus[0]?.nutritional_info ||
        (menus[0] as any)?.nutritionalInfo ||
        (menus[0] as any)?.nutrition_info ||
        (menus[0] as any)?.nutrients ||
        aggregateNutritionalInfo(menus);

    return (
        <section className="mt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="flex items-center gap-2">
                    <Utensils size={18} className="text-slate-400" />

                    <h2 className="text-base font-semibold text-slate-800">
                        Patient Menus
                    </h2>

                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        {menus.length}
                    </span>
                </div>

                <p className="text-xs text-slate-500">
                    Menus scheduled for patient meals
                </p>
            </div>

            <NutritionalInfoBanner nutritionalInfo={nutritionalInfo} />

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] border-collapse">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className={MENU_HEAD}>Date</th>
                                <th className={MENU_HEAD}>Days</th>
                                <th className={MENU_HEAD}>Meal Slot</th>
                                <th className={MENU_HEAD}>Diet Type</th>
                                <th className={MENU_HEAD}>Portion</th>
                                <th className={MENU_HEAD}>Items</th>
                            </tr>
                        </thead>

                        <tbody>
                            {menus.map((menu) => (
                                <tr
                                    key={menu.menu_id}
                                    className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50"
                                >
                                    <td
                                        className={`${MENU_CELL} font-medium whitespace-nowrap text-slate-800`}
                                    >
                                        {formatDate(menu.date)}
                                    </td>

                                    <td className={MENU_CELL}>
                                        <DayCell days={menu.day_of_week} />
                                    </td>

                                    <td className={MENU_CELL}>
                                        <Pill tone="amber">
                                            {menu.meal_slot}
                                        </Pill>
                                    </td>

                                    <td className={MENU_CELL}>
                                        <Pill tone="blue">
                                            {menu.diet_type}
                                        </Pill>
                                    </td>

                                    <td
                                        className={`${MENU_CELL} whitespace-nowrap text-slate-600`}
                                    >
                                        {menu.portion_size || "—"}
                                    </td>

                                    <td className={MENU_CELL}>
                                        <ItemNames
                                            names={menu.items.map(
                                                (item) => item.recipe_name
                                            )}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

/** Recipe names only — a kitchen prep list, so no per-item price is shown. */
function ItemNames({ names }: { names: string[] }) {
    if (names.length === 0) {
        return <span className="text-sm text-slate-400">No items</span>;
    }

    return (
        <ul className="space-y-1.5">
            {names.map((name, index) => (
                <li
                    key={`${name}-${index}`}
                    className="text-sm font-medium text-slate-800"
                >
                    {name}
                </li>
            ))}
        </ul>
    );
}
