"use client";

import { GeneralMenu } from "@/data/Menu/type";
import { Pencil, Trash2, Utensils } from "lucide-react";
import { DayCell, ItemList, MENU_CELL, MENU_HEAD, Pill } from "./MenuShared";

export default function GeneralMenuTable({
    menus,
    onEdit,
    onDelete,
    busyId,
}: {
    menus: GeneralMenu[];
    onEdit: (menu: GeneralMenu) => void;
    onDelete: (menu: GeneralMenu) => void;
    busyId?: string | null;
}) {
    if (menus.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
                <Utensils className="mx-auto text-slate-300" size={28} />
                <p className="mt-2 text-sm font-medium text-slate-500">
                    No general menus yet.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                    Upload a general menu to get started.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                    <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                            <th className={MENU_HEAD}>Meal Slot</th>
                            <th className={MENU_HEAD}>Days</th>
                            <th className={MENU_HEAD}>Status</th>
                            <th className={MENU_HEAD}>Items</th>
                            <th className={`${MENU_HEAD} text-right`}>
                                Total
                            </th>
                            <th className={`${MENU_HEAD} text-right`}>
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {menus.map((menu) => {
                            const isBusy = busyId === menu.menu_id;
                            const total = (menu.items ?? []).reduce(
                                (sum, item) => sum + Number(item.selling_price ?? 0),
                                0
                            );

                            return (
                                <tr
                                    key={menu.menu_id}
                                    className={`border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50 ${
                                        isBusy ? "opacity-60" : ""
                                    }`}
                                >
                                    <td className={MENU_CELL}>
                                        <Pill tone="amber">{menu.meal_slot}</Pill>
                                    </td>

                                    <td className={MENU_CELL}>
                                        <DayCell days={menu.day_of_week} />
                                    </td>

                                    <td className={MENU_CELL}>
                                        <Pill
                                            tone={
                                                menu.is_available
                                                    ? "emerald"
                                                    : "slate"
                                            }
                                        >
                                            {menu.is_available
                                                ? "Available"
                                                : "Unavailable"}
                                        </Pill>
                                    </td>

                                    <td className={MENU_CELL}>
                                        <ItemList
                                            items={menu.items}
                                            priceLabel={(item) =>
                                                `₹${Number(
                                                    item.selling_price
                                                ).toLocaleString("en-IN")}`
                                            }
                                        />
                                    </td>

                                    <td
                                        className={`${MENU_CELL} whitespace-nowrap text-right text-sm font-semibold tabular-nums text-slate-800`}
                                    >
                                        ₹{total.toLocaleString("en-IN")}
                                    </td>

                                    <td
                                        className={`${MENU_CELL} whitespace-nowrap text-right`}
                                    >
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => onEdit(menu)}
                                                title={`Edit ${menu.meal_slot} menu`}
                                                aria-label={`Edit ${menu.meal_slot} menu`}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                                            >
                                                <Pencil size={15} />
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => onDelete(menu)}
                                                title={`Delete ${menu.meal_slot} menu`}
                                                aria-label={`Delete ${menu.meal_slot} menu`}
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
