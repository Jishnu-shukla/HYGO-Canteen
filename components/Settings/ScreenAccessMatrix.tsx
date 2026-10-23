"use client";

import AccessToggle from "@/components/Settings/AccessToggle";
import { isCustomCell } from "@/data/Settings/overrides";
import { ROLE_SHORT } from "@/data/Settings/labels";
import {
    getRoleRoutes,
    getScreenActions,
    type Role,
    type RoleActionMatrix,
} from "@/Roles";
import { SIDEBAR_ROUTES } from "@/routes";
import { Lock } from "lucide-react";
import { Fragment } from "react";

/**
 * The screen-access matrix: every screen down the side, every role across the
 * top, one switch per cell.
 *
 * The switches are not a separate setting. A screen is open when the role may
 * carry out at least one action on it, so each switch reads the same matrix the
 * Action permissions tab edits — switching a screen on grants the action the
 * screen exists for, and switching it off withdraws every action on it.
 *
 * Admin's column is locked: Admin reaches everything by definition, so a
 * switch there would be a lie rather than a setting.
 */
export default function ScreenAccessMatrix({
    roles,
    matrix,
    overrides,
    onToggle,
    readOnly = false,
}: {
    /** The columns, as the backend lists the roles. */
    roles: Role[];
    /** The matrix being edited — the draft, not what is saved. */
    matrix: RoleActionMatrix;
    /** The cells an admin has already changed, for the "custom" dot. */
    overrides: RoleActionMatrix;
    onToggle: (path: string, role: Role, allowed: boolean) => void;
    readOnly?: boolean;
}) {
    // The screens each role reaches, computed once per render.
    const routesByRole = new Map(
        roles.map((role) => [role, new Set(getRoleRoutes(role, matrix))])
    );

    /** Whether any action behind this screen was changed by an admin. */
    function isCustom(role: Role, path: string): boolean {
        if (role === "Admin") return false;

        return getScreenActions(path).some((action) =>
            isCustomCell(overrides, action, role)
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
                <colgroup>
                    <col style={{ width: "30%" }} />
                    {roles.map((role) => (
                        <col key={role} style={{ width: "10%" }} />
                    ))}
                </colgroup>

                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                        <th
                            scope="col"
                            className="whitespace-nowrap px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-amber-700"
                        >
                            Screen
                        </th>

                        {roles.map((role) => (
                            <th
                                key={role}
                                scope="col"
                                title={role}
                                className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-amber-700"
                            >
                                {ROLE_SHORT[role] ?? role}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {SIDEBAR_ROUTES.map((section) => (
                        <Fragment key={section.section}>
                            {/* One row per sidebar section, so the grid reads in
                                the same order the sidebar does. */}
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                <td
                                    colSpan={roles.length + 1}
                                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                                >
                                    {section.section}
                                </td>
                            </tr>

                            {section.items.map((item) => (
                                <tr
                                    key={item.path}
                                    className="border-b border-slate-100 transition hover:bg-slate-50/70"
                                >
                                    <td className="px-3 py-2">
                                        <p className="truncate text-xs font-semibold text-slate-700">
                                            {item.name}
                                        </p>

                                        <p className="truncate font-mono text-[10px] text-slate-400">
                                            {item.path}
                                        </p>
                                    </td>

                                    {roles.map((role) => {
                                        const allowed =
                                            role === "Admin" ||
                                            (routesByRole
                                                .get(role)
                                                ?.has(item.path) ??
                                                false);

                                        if (role === "Admin") {
                                            return (
                                                <td
                                                    key={role}
                                                    className="px-2 py-2 text-center"
                                                >
                                                    <span
                                                        title="Admin reaches every screen"
                                                        className="inline-flex h-5 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                                                    >
                                                        <Lock size={12} />
                                                    </span>
                                                </td>
                                            );
                                        }

                                        return (
                                            <td
                                                key={role}
                                                className="px-2 py-2 text-center"
                                            >
                                                <span className="inline-flex items-center gap-1.5">
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

                                                    {isCustom(role, item.path) && (
                                                        <span
                                                            title="Changed from the built-in matrix"
                                                            className="h-1.5 w-1.5 rounded-full bg-amber-500"
                                                        />
                                                    )}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
