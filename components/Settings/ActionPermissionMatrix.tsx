"use client";

import { isCustomCell } from "@/data/Settings/overrides";
import {
    ACTION_LABELS,
    PERMISSION_OPTIONS,
    PERMISSION_STYLES,
    ROLE_SHORT,
} from "@/data/Settings/labels";
import {
    getActionPermission,
    type ActionId,
    type ActionPermission,
    type Role,
    type RoleActionMatrix,
} from "@/Roles";
import { Lock } from "lucide-react";

/**
 * The action matrix: every permission-carrying action down the side, every role
 * across the top, one answer per cell.
 *
 * This is the setting; the Screen access tab is a view of it. The four answers
 * are the ones the backend accepts — yes, may be, request, no — so nothing here
 * invents a new kind of authority. "Request" is shown as an answer but grants
 * nothing yet, exactly as the matrix says.
 *
 * A cell that appears in the stored overrides is marked, even when its value
 * happens to equal the default: that is the backend's own rule for "an admin
 * chose this", and the screen repeats it rather than second-guessing it.
 */
export default function ActionPermissionMatrix({
    roles,
    actions,
    permissions,
    matrix,
    overrides,
    onChange,
    readOnly = false,
}: {
    /** The columns, as the backend lists the roles. */
    roles: Role[];
    /** The rows, as the backend lists the actions. */
    actions: ActionId[];
    /** The answers the backend accepts, in the order it lists them. */
    permissions: ActionPermission[];
    /** The matrix being edited — the draft, not what is saved. */
    matrix: RoleActionMatrix;
    /** The cells an admin has already changed, for the "custom" dot. */
    overrides: RoleActionMatrix;
    onChange: (
        action: ActionId,
        role: Role,
        permission: ActionPermission
    ) => void;
    readOnly?: boolean;
}) {
    /** The select's options, with the meaning of each answer as its hint. */
    const options = permissions.map((value) => {
        const known = PERMISSION_OPTIONS.find(
            (option) => option.value === value
        );

        return known ?? { value, label: value, hint: "" };
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
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
                            Action
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
                    {actions.map((action) => {
                        const label = ACTION_LABELS[action]?.label ?? action;
                        const screen = ACTION_LABELS[action]?.screen ?? "";

                        return (
                            <tr
                                key={action}
                                className="border-b border-slate-100 transition hover:bg-slate-50/70"
                            >
                                <td className="px-3 py-2">
                                    <p className="truncate text-xs font-semibold text-slate-700">
                                        {label}
                                    </p>

                                    <p className="truncate text-[10px] text-slate-400">
                                        {screen}
                                    </p>
                                </td>

                                {roles.map((role) => {
                                    if (role === "Admin") {
                                        return (
                                            <td
                                                key={role}
                                                className="px-2 py-2 text-center"
                                            >
                                                <span
                                                    title="Admin is exempt from the matrix"
                                                    className="inline-flex h-5 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                                                >
                                                    <Lock size={12} />
                                                </span>
                                            </td>
                                        );
                                    }

                                    const permission = getActionPermission(
                                        role,
                                        action,
                                        matrix
                                    );

                                    return (
                                        <td
                                            key={role}
                                            className="px-2 py-2 text-center"
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                <select
                                                    value={permission}
                                                    disabled={readOnly}
                                                    aria-label={`${label} for ${role}`}
                                                    title={
                                                        options.find(
                                                            (option) =>
                                                                option.value ===
                                                                permission
                                                        )?.hint
                                                    }
                                                    onChange={(event) =>
                                                        onChange(
                                                            action,
                                                            role,
                                                            event.target
                                                                .value as ActionPermission
                                                        )
                                                    }
                                                    className={`w-full max-w-[104px] cursor-pointer rounded-lg border px-1.5 py-1 text-[11px] font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${PERMISSION_STYLES[permission].select}`}
                                                >
                                                    {options.map((option) => (
                                                        <option
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>

                                                {isCustomCell(
                                                    overrides,
                                                    action,
                                                    role
                                                ) && (
                                                    <span
                                                        title="Changed from the built-in matrix"
                                                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                                                    />
                                                )}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
