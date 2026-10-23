"use client";

import AccessToggle from "@/components/Settings/AccessToggle";
import { isCustomCell } from "@/data/Settings/overrides";
import { ROLE_SUMMARIES } from "@/data/Settings/labels";
import {
    getRoleRoutes,
    getScreenActions,
    type Role,
    type RoleActionMatrix,
} from "@/Roles";
import { SIDEBAR_ROUTES } from "@/routes";
import { Lock } from "lucide-react";

/**
 * The same screen access, read one role at a time.
 *
 * The grid answers "who reaches what" at a glance; this answers "what does this
 * one role reach", which is the question an admin has when someone says "the
 * nurse cannot open the kitchen schedule".
 *
 * Screens are listed in sidebar order and grouped by section, so the list
 * matches what the person sees in the navigation. The switches are the same
 * setting as in the grid — one action grant per screen — not a second one.
 */
export default function RoleAccessList({
    roles,
    matrix,
    overrides,
    onToggle,
    readOnly = false,
}: {
    /** The roles to list, as the backend lists them. */
    roles: Role[];
    /** The matrix being edited — the draft, not what is saved. */
    matrix: RoleActionMatrix;
    /** The cells an admin has already changed, for the "custom" dot. */
    overrides: RoleActionMatrix;
    onToggle: (path: string, role: Role, allowed: boolean) => void;
    readOnly?: boolean;
}) {
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {roles.map((role) => {
                const open = new Set(getRoleRoutes(role, matrix));

                return (
                    <section
                        key={role}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-slate-800">
                                    {role}
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500">
                                    {ROLE_SUMMARIES[role]}
                                </p>
                            </div>

                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                {role === "Admin"
                                    ? "ALL SCREENS"
                                    : `${open.size} SCREENS`}
                            </span>
                        </header>

                        <div className="max-h-[22rem] overflow-y-auto">
                            {SIDEBAR_ROUTES.map((section) => (
                                <div key={section.section}>
                                    <p className="bg-slate-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        {section.section}
                                    </p>

                                    <ul>
                                        {section.items.map((item) => {
                                            const allowed =
                                                role === "Admin" ||
                                                open.has(item.path);

                                            const custom =
                                                role !== "Admin" &&
                                                getScreenActions(
                                                    item.path
                                                ).some((action) =>
                                                    isCustomCell(
                                                        overrides,
                                                        action,
                                                        role
                                                    )
                                                );

                                            return (
                                                <li
                                                    key={item.path}
                                                    className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 last:border-b-0"
                                                >
                                                    <span className="min-w-0">
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="truncate text-xs font-medium text-slate-700">
                                                                {item.name}
                                                            </span>

                                                            {custom && (
                                                                <span
                                                                    title="Changed from the built-in matrix"
                                                                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                                                                />
                                                            )}
                                                        </span>

                                                        <span className="block truncate font-mono text-[10px] text-slate-400">
                                                            {item.path}
                                                        </span>
                                                    </span>

                                                    {role === "Admin" ? (
                                                        <span
                                                            title="Admin reaches every screen"
                                                            className="inline-flex h-5 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                                                        >
                                                            <Lock size={12} />
                                                        </span>
                                                    ) : (
                                                        <AccessToggle
                                                            checked={allowed}
                                                            disabled={readOnly}
                                                            label={`${item.name} for ${role}`}
                                                            onChange={(next) =>
                                                                onToggle(
                                                                    item.path,
                                                                    role,
                                                                    next
                                                                )
                                                            }
                                                        />
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
