"use client";

import ActionPermissionMatrix from "@/components/Settings/ActionPermissionMatrix";
import RoleAccessList from "@/components/Settings/RoleAccessList";
import ScreenAccessMatrix from "@/components/Settings/ScreenAccessMatrix";
import { useAccessControl } from "@/context/AccessControlContext";
import { useRoleContext } from "@/context/RoleContext";
import {
    countChanges,
    diffMatrix,
    hasCells,
    setPermission,
    setScreenAccess,
} from "@/data/Settings/overrides";
import {
    type ActionId,
    type ActionPermission,
    type Role,
    type RoleActionMatrix,
} from "@/Roles";
import {
    KeyRound,
    ListChecks,
    LoaderCircle,
    RotateCcw,
    Save,
    ShieldAlert,
    SlidersHorizontal,
    TriangleAlert,
} from "lucide-react";
import { useState } from "react";

type TabId = "screens" | "actions";

type ScreenView = "matrix" | "roles";

const TABS: { id: TabId; label: string; Icon: typeof KeyRound }[] = [
    { id: "screens", label: "Screen access", Icon: KeyRound },
    { id: "actions", label: "Action permissions", Icon: ListChecks },
];

/**
 * Settings — the admin's control panel over the role matrix.
 *
 * The matrix has one home: the backend's `/api/rbac/permissions`, which returns
 * the app's coded defaults, the cells an admin changed, and the matrix in force
 * right now. This screen edits that matrix as a draft and saves the cells it
 * changed.
 *
 * Screen access is not a second setting. A screen is open when the role may
 * carry out at least one action on it, so the Screen access tab reads the same
 * matrix the Action permissions tab writes: switching a screen on grants the
 * action the screen exists for, and switching it off withdraws them all.
 *
 * Because the sidebar, the route guard and every action check read the saved
 * matrix, a save takes effect for everyone the moment it lands — no redeploy.
 * A tab that was already open re-reads the matrix when it next becomes visible,
 * so its sidebar catches up without a manual reload.
 */
export default function SettingsPage() {
    const { role } = useRoleContext();
    const {
        matrix,
        overrides,
        roles,
        actions,
        permissions,
        status,
        error,
        errorStatus,
        canManage,
        updatedBy,
        saveMatrix,
        resetMatrix,
    } = useAccessControl();

    const [tab, setTab] = useState<TabId>("screens");
    const [view, setView] = useState<ScreenView>("matrix");
    const [draft, setDraft] = useState<RoleActionMatrix>(matrix);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [confirmingReset, setConfirmingReset] = useState(false);

    // The live matrix is the source of truth and the draft follows it: on the
    // first load, and again whenever the saved matrix changes. Adjusting the
    // draft while rendering keeps the two in step without a second render
    // pass.
    //
    // A background refresh can land mid-edit. Adopting it then would throw
    // away changes the admin has not saved yet, so the draft is kept when it
    // holds cells the matrix does not — while `syncedFrom` still moves to the
    // newer copy, so the change count is measured against what the backend
    // now serves.
    const [syncedFrom, setSyncedFrom] = useState<RoleActionMatrix>(matrix);

    if (matrix !== syncedFrom) {
        const unsaved = hasCells(diffMatrix(syncedFrom, draft));

        setSyncedFrom(matrix);
        if (!unsaved) setDraft(matrix);
    }

    const changes = countChanges(matrix, draft);

    const loading = status === "loading";
    const serviceDown = status === "error";
    const refused = errorStatus === 403;
    const customised = hasCells(overrides);

    /**
     * Whether the matrix may be edited right now.
     *
     * Loading and saving count as locked: an edit made while the matrix is
     * still arriving — or while a save is in flight — would be replaced by the
     * answer when it lands, and the admin would watch their change vanish
     * without a word.
     */
    const locked = !canManage || loading || serviceDown || saving;

    function handleToggleRoute(path: string, role_: Role, allowed: boolean) {
        setDraft((previous) => setScreenAccess(previous, path, role_, allowed));
        setSaved(false);
    }

    function handlePermission(
        action: ActionId,
        role_: Role,
        permission: ActionPermission
    ) {
        setDraft((previous) =>
            setPermission(previous, action, role_, permission)
        );
        setSaved(false);
    }

    async function handleSave() {
        // Only the cells that differ are sent; the backend merges them into
        // the stored overrides and leaves everything else as it was.
        const patch = diffMatrix(matrix, draft);

        setSaving(true);
        setSaveError(null);

        const result = await saveMatrix(patch);

        setSaving(false);

        if (!result.ok) {
            setSaveError(result.error);
            return;
        }

        // Adopt what the backend stored rather than assuming the draft became
        // the truth: another admin may have changed other cells meanwhile.
        if (result.matrix) {
            setDraft(result.matrix);
            setSyncedFrom(result.matrix);
        }

        setSaved(true);
    }

    async function handleReset() {
        setSaving(true);
        setSaveError(null);

        const result = await resetMatrix();

        setSaving(false);
        setConfirmingReset(false);

        if (!result.ok) {
            setSaveError(result.error);
            return;
        }

        // A reset drops the draft too — including edits that were never saved.
        if (result.matrix) {
            setDraft(result.matrix);
            setSyncedFrom(result.matrix);
        }

        setSaved(true);
    }

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <SlidersHorizontal size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Settings
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                ACCESS CONTROL
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Decide which screens each role reaches and what each
                        role may do. Screen access follows the actions on a
                        screen.
                    </p>
                </div>

                <div className="flex flex-col items-start gap-1.5 md:items-end">
                    <span
                        role="status"
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                            loading
                                ? "bg-sky-50 text-sky-700"
                                : refused || serviceDown
                                  ? "bg-red-50 text-red-600"
                                  : customised
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                        }`}
                    >
                        {loading ? (
                            <>
                                <LoaderCircle size={12} className="animate-spin" />
                                LOADING MATRIX
                            </>
                        ) : refused ? (
                            <>
                                <ShieldAlert size={12} />
                                ADMIN ONLY
                            </>
                        ) : serviceDown ? (
                            <>
                                <TriangleAlert size={12} />
                                SERVICE UNREACHABLE
                            </>
                        ) : customised ? (
                            <>
                                <ShieldAlert size={12} />
                                CUSTOMISED MATRIX
                            </>
                        ) : (
                            <>
                                <KeyRound size={12} />
                                BUILT-IN MATRIX
                            </>
                        )}
                    </span>

                    {updatedBy && (
                        <p className="text-[11px] text-slate-400">
                            Last saved by {updatedBy}
                        </p>
                    )}
                </div>
            </section>

            {/* The backend refuses this role: say so instead of drawing the
                built-in matrix as if it were the saved one. */}
            {refused && error && (
                <div
                    role="alert"
                    className="mb-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3"
                >
                    <ShieldAlert
                        size={18}
                        className="mt-0.5 shrink-0 text-red-500"
                    />

                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-red-700">
                            The access-control API is Admin-only
                        </p>

                        <p className="mt-0.5 text-xs text-red-600/90">
                            {role} may open this screen but may not read or
                            change the matrix behind it. {error} What is shown
                            below is the app&apos;s built-in matrix, not the
                            admin&apos;s saved one, and nothing here can be
                            saved.
                        </p>
                    </div>
                </div>
            )}

            {/* Any other failure: the matrix is a fallback, not the truth. */}
            {serviceDown && !refused && error && (
                <div
                    role="alert"
                    className="mb-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3"
                >
                    <TriangleAlert
                        size={18}
                        className="mt-0.5 shrink-0 text-red-500"
                    />

                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-red-700">
                            The access-control API could not be reached
                        </p>

                        <p className="mt-0.5 text-xs text-red-600/90">
                            {error} The built-in matrix is in force until it
                            answers, and changes cannot be saved.
                        </p>
                    </div>
                </div>
            )}

            {/* A role that may read the matrix but not change it. */}
            {status === "ready" && !canManage && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <ShieldAlert
                        size={18}
                        className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <p className="text-xs text-amber-800">
                        You are signed in as {role}. You can read the matrix
                        here, but changing it is an Admin&apos;s job, or the
                        job of a role granted the Manage settings permission.
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div
                    role="tablist"
                    aria-label="Settings sections"
                    className="flex flex-wrap gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
                >
                    {TABS.map(({ id, label, Icon }) => {
                        const active = tab === id;

                        return (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setTab(id)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                                    active
                                        ? "bg-amber-600 text-white"
                                        : "text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <Icon size={14} />
                                {label}
                            </button>
                        );
                    })}
                </div>

                {tab === "screens" && (
                    <div
                        role="group"
                        aria-label="Screen access view"
                        className="flex gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
                    >
                        {(
                            [
                                { id: "matrix", label: "Matrix" },
                                { id: "roles", label: "By role" },
                            ] as const
                        ).map((option) => {
                            const active = view === option.id;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setView(option.id)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                                        active
                                            ? "bg-slate-800 text-white"
                                            : "text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Panels */}
            {tab === "screens" && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-800">
                                Screen access
                            </h2>

                            <p className="mt-0.5 text-xs text-slate-500">
                                A screen is open when the role may carry out at
                                least one action on it — the switch grants the
                                action the screen exists for
                            </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {roles.length} ROLES
                        </span>
                    </div>

                    {view === "matrix" ? (
                        <ScreenAccessMatrix
                            roles={roles}
                            matrix={draft}
                            overrides={overrides}
                            onToggle={handleToggleRoute}
                            readOnly={locked}
                        />
                    ) : (
                        <div className="p-4">
                            <RoleAccessList
                                roles={roles}
                                matrix={draft}
                                overrides={overrides}
                                onToggle={handleToggleRoute}
                                readOnly={locked}
                            />
                        </div>
                    )}
                </section>
            )}

            {tab === "actions" && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-800">
                                Action permissions
                            </h2>

                            <p className="mt-0.5 text-xs text-slate-500">
                                What each role may carry out inside a screen it
                                can reach
                            </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {permissions.length} LEVELS
                        </span>
                    </div>

                    <ActionPermissionMatrix
                        roles={roles}
                        actions={actions}
                        permissions={permissions}
                        matrix={draft}
                        overrides={overrides}
                        onChange={handlePermission}
                        readOnly={locked}
                    />
                </section>
            )}

            {/* Save bar — only a role that may manage the settings has
                changes to save. */}
            {canManage && (
                <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">
                            {changes > 0
                                ? `${changes} unsaved ${changes === 1 ? "change" : "changes"}`
                                : "No unsaved changes"}
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-400">
                            {saved
                                ? "Saved — the new matrix is live for everyone."
                                : "Saving applies the matrix to every signed-in user."}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {saveError && (
                            <p className="text-xs font-medium text-red-600">
                                {saveError}
                            </p>
                        )}

                        {/* Reset asks before it throws the admin's changes
                            away: the first click asks, the second one does it. */}
                        {confirmingReset ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <RotateCcw size={14} />
                                    {saving ? "Resetting…" : "Confirm reset"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setConfirmingReset(false)}
                                    className="rounded-full px-3 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirmingReset(true);
                                    setSaved(false);
                                }}
                                disabled={saving || !customised}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RotateCcw size={14} />
                                Reset
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || changes === 0 || serviceDown}
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <LoaderCircle size={14} className="animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            {saving ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
