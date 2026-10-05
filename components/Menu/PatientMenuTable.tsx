"use client";

import { PatientMenu } from "@/data/Menu/type";
import { Pencil, Trash2, Utensils } from "lucide-react";
import { DayCell, formatDate, ItemList, MENU_CELL, MENU_HEAD, Pill } from "./MenuShared";

export default function PatientMenuTable({
    menus,
    onEdit,
    onDelete,
    busyId,
}: {
    menus: PatientMenu[];
    onEdit: (menu: PatientMenu) => void;
    onDelete: (menu: PatientMenu) => void;
    busyId?: string | null;
}) {
    if (menus.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
                <Utensils className="mx-auto text-slate-300" size={28} />
                <p className="mt-2 text-sm font-medium text-slate-500">
                    No patient menus yet.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                    Upload a patient menu to get started.
                </p>
            </div>
        );
    }

    return (
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
                            <th className={`${MENU_HEAD} text-right`}>
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {menus.map((menu) => {
                            const isBusy = busyId === menu.menu_id;

                            return (
                                <tr
                                    key={menu.menu_id}
                                    className={`border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50 ${
                                        isBusy ? "opacity-60" : ""
                                    }`}
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
                                        <Pill tone="amber">{menu.meal_slot}</Pill>
                                    </td>

                                    <td className={MENU_CELL}>
                                        <Pill tone="blue">{menu.diet_type}</Pill>
                                    </td>

                                    <td className={`${MENU_CELL} whitespace-nowrap text-slate-600`}>
                                        {menu.portion_size || "—"}
                                    </td>

                                    <td className={MENU_CELL}>
                                        <ItemList
                                            items={menu.items}
                                            priceLabel={(item) =>
                                                `₹${Number(item.price).toLocaleString("en-IN")}`
                                            }
                                        />
                                    </td>

                                    <td className={`${MENU_CELL} whitespace-nowrap text-right`}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => onEdit(menu)}
                                                title={`Edit menu for ${formatDate(menu.date)}`}
                                                aria-label={`Edit menu for ${formatDate(menu.date)}`}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                                            >
                                                <Pencil size={15} />
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => onDelete(menu)}
                                                title={`Delete menu for ${formatDate(menu.date)}`}
                                                aria-label={`Delete menu for ${formatDate(menu.date)}`}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
