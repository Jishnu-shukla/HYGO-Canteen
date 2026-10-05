"use client";

import GeneralMenuTable from "@/components/Menu/GeneralMenuTable";
import MenuDeleteConfirm from "@/components/Menu/MenuDeleteConfirm";
import MenuEditModal from "@/components/Menu/MenuEditModal";
import MenuUploadModal from "@/components/Menu/MenuUploadModal";
import PatientMenuTable from "@/components/Menu/PatientMenuTable";
import MenuProvider from "@/context/MenuContext";
import MenuScheduleProvider, {
    useMenuScheduleContext,
} from "@/context/MenuScheduleContext";
import {
    createMenuApi,
    deleteMenuApi,
    updateMenuApi,
} from "@/data/Menu/api";
import {
    CreateMenuBody,
    GeneralMenu,
    MenuType,
    PatientMenu,
} from "@/data/Menu/type";
import { ClipboardList, Upload } from "lucide-react";
import { useState } from "react";

const TABS: { key: MenuType; label: string }[] = [
    { key: "patient", label: "Patient Menu" },
    { key: "general", label: "General Menu" },
];

type EditTarget = PatientMenu | GeneralMenu;
type DeleteTarget = PatientMenu | GeneralMenu;

function describeMenu(menu: EditTarget, menuType: MenuType) {
    return menuType === "patient"
        ? `patient menu for ${(menu as PatientMenu).date}`
        : `${menu.meal_slot} general menu`;
}

function MenuContent() {
    const { patientMenus, generalMenus, loading, refresh } =
        useMenuScheduleContext();

    const [activeTab, setActiveTab] = useState<MenuType>("patient");
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [rowError, setRowError] = useState("");

    const handleCreate = async (body: CreateMenuBody) => {
        // Let failure propagate so the modal can render its own error state.
        const created = await createMenuApi(body);

        if (!created) {
            throw new Error("Create menu request failed");
        }

        await refresh();
    };

    const handleUpdate = async (
        menu: EditTarget,
        changes: Record<string, unknown>
    ) => {
        const updated = await updateMenuApi(menu.menu_id, activeTab, changes);

        if (!updated) {
            throw new Error("Update menu request failed");
        }

        await refresh();
    };

    const handleDelete = async (menu: DeleteTarget) => {
        setBusyId(menu.menu_id);
        setRowError("");

        try {
            const deleted = await deleteMenuApi(menu.menu_id, activeTab);

            if (!deleted) {
                throw new Error("Delete menu request failed");
            }

            await refresh();
        } catch (error) {
            console.error("Error deleting menu:", error);
            setRowError("Could not delete the menu. Please try again.");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <main className="m-4 space-y-5 bg-slate-50">
            <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <ClipboardList size={21} />
                        </div>

                        <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                            Menu
                        </h1>

                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            SERVICE
                        </span>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/80">
                        Schedule approved recipes across meal slots for patient
                        and cafeteria service.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsUploadOpen(true)}
                    className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                >
                    <Upload size={17} />
                    Upload Menu
                </button>
            </section>

            {/* Patient / General tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const count =
                        tab.key === "patient"
                            ? patientMenus.length
                            : generalMenus.length;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                                setActiveTab(tab.key);
                                setRowError("");
                            }}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                isActive
                                    ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                                    : "border-amber-200 bg-white text-amber-800 hover:border-amber-400 hover:bg-amber-50"
                            }`}
                        >
                            {tab.label}{" "}
                            <span className="opacity-80">({count})</span>
                        </button>
                    );
                })}
            </div>

            {rowError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {rowError}
                </p>
            )}

            {loading ? (
                <p className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
                    Loading menus...
                </p>
            ) : activeTab === "patient" ? (
                <PatientMenuTable
                    menus={patientMenus}
                    busyId={busyId}
                    onEdit={(menu) => {
                        setRowError("");
                        setEditTarget(menu);
                    }}
                    onDelete={(menu) => {
                        setRowError("");
                        setDeleteTarget(menu);
                    }}
                />
            ) : (
                <GeneralMenuTable
                    menus={generalMenus}
                    busyId={busyId}
                    onEdit={(menu) => {
                        setRowError("");
                        setEditTarget(menu);
                    }}
                    onDelete={(menu) => {
                        setRowError("");
                        setDeleteTarget(menu);
                    }}
                />
            )}

            {isUploadOpen && (
                <MenuUploadModal
                    menuType={activeTab}
                    onClose={() => setIsUploadOpen(false)}
                    onSave={handleCreate}
                />
            )}

            {editTarget && (
                <MenuEditModal
                    key={editTarget.menu_id}
                    menu={editTarget}
                    menuType={activeTab}
                    onClose={() => setEditTarget(null)}
                    onSave={handleUpdate}
                />
            )}

            {deleteTarget && (
                <MenuDeleteConfirm
                    label={describeMenu(deleteTarget, activeTab)}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={() => handleDelete(deleteTarget)}
                />
            )}
        </main>
    );
}

export default function Menu() {
    return (
        <MenuProvider>
            <MenuScheduleProvider>
                <MenuContent />
            </MenuScheduleProvider>
        </MenuProvider>
    );
}
