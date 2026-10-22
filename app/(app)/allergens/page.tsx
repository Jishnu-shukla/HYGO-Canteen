"use client";

import { AllergyPrefSummaryCards } from "@/components/AllergyPref/AllergyPrefSummaryCards";
import { AllergyPrefTable } from "@/components/AllergyPref/AllergyPrefTable";
import CreateAllergyPrefForm from "@/components/AllergyPref/CreateAllergyPrefForm";
import DeleteAllergyPrefConfirmModal from "@/components/AllergyPref/DeleteAllergyPrefConfirmModal";
import EditAllergyPrefModal from "@/components/AllergyPref/EditAllergyPrefModal";
import {
    ALLERGY_PREF_PAGE_SIZE,
    EMPTY_ALLERGY_PREF_PAGINATION,
    createAllergyPrefApi,
    deleteAllergyPrefApi,
    getAllergyPrefSummaryApi,
    getAllergyPrefsApi,
    updateAllergyPrefApi,
} from "@/data/AllergyPref/api";
import type {
    AllergyPrefListItem,
    AllergyPrefPagination,
    AllergySeverity,
    CreateAllergyPrefBody,
    CreateAllergyPrefResponse,
    GetAllergyPrefSummaryResponse,
    UpdateAllergyPrefBody,
    UpdateAllergyPrefResponse,
} from "@/data/AllergyPref/type";
import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function AllergensPage() {
    const [summary, setSummary] =
        useState<GetAllergyPrefSummaryResponse | null>(null);

    const [prefs, setPrefs] = useState<AllergyPrefListItem[]>([]);
    const [pagination, setPagination] = useState<AllergyPrefPagination>(
        EMPTY_ALLERGY_PREF_PAGINATION
    );
    const [severityFilter, setSeverityFilter] = useState<
        AllergySeverity | "all"
    >("all");

    // Both start true so the mount fetches need no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);

    // The row under edit, or null when the modal is closed.
    const [editingPref, setEditingPref] = useState<AllergyPrefListItem | null>(
        null
    );

    // The row awaiting delete confirmation, or null when that modal is closed.
    const [prefToDelete, setPrefToDelete] = useState<AllergyPrefListItem | null>(
        null
    );

    const fetchSummary = useCallback(async () => {
        try {
            const data = await getAllergyPrefSummaryApi();
            setSummary(data);
        } catch (error) {
            console.log("Error fetching allergy preference summary:", error);
        } finally {
            setIsSummaryLoading(false);
        }
    }, []);

    // The visible page lives in `pagination`, which the table reads from, so
    // no separate page state is needed here.
    const fetchTable = useCallback(async (targetPage: number) => {
        try {
            setIsTableLoading(true);

            const { data, pagination: meta } = await getAllergyPrefsApi({
                page: targetPage,
                limit: ALLERGY_PREF_PAGE_SIZE,
            });

            setPrefs(data);
            setPagination(meta);
        } catch (error) {
            console.log("Error fetching allergy preferences:", error);
        } finally {
            setIsTableLoading(false);
        }
    }, []);

    useEffect(() => {
        // Inlined rather than calling fetchSummary: the set-state-in-effect
        // rule cannot see that fetchSummary awaits before touching state, and
        // duplicating three lines here is cheaper than a disable comment.
        const load = async () => {
            const [summaryData, tableData] = await Promise.all([
                getAllergyPrefSummaryApi().catch((error) => {
                    console.log(
                        "Error fetching allergy preference summary:",
                        error
                    );
                    return null;
                }),
                getAllergyPrefsApi({
                    page: 1,
                    limit: ALLERGY_PREF_PAGE_SIZE,
                }).catch((error) => {
                    console.log("Error fetching allergy preferences:", error);
                    return {
                        data: [] as AllergyPrefListItem[],
                        pagination: EMPTY_ALLERGY_PREF_PAGINATION,
                    };
                }),
            ]);

            setSummary(summaryData);
            setPrefs(tableData.data);
            setPagination(tableData.pagination);
            setIsSummaryLoading(false);
            setIsTableLoading(false);
        };

        load();
    }, []);

    // A new record moves both the cards and the table, and it is newest-first,
    // so jump back to page 1 to keep the new row visible.
    const handleCreate = async (
        body: CreateAllergyPrefBody
    ): Promise<CreateAllergyPrefResponse> => {
        const record = await createAllergyPrefApi(body);

        await Promise.all([fetchTable(1), fetchSummary()]);

        return record;
    };

    // An edit can flip with_allergens (clearing the last allergy) and the
    // severity mix, so the cards are refreshed alongside the table. Stay on the
    // current page: unlike a create, an edit does not reorder the list.
    const handleUpdate = async (
        pref: AllergyPrefListItem,
        payload: UpdateAllergyPrefBody
    ): Promise<UpdateAllergyPrefResponse> => {
        const updated = await updateAllergyPrefApi(
            pref.allergy_preference_id,
            payload
        );

        await Promise.all([fetchTable(pagination.page), fetchSummary()]);

        return updated;
    };

    // Rejects on failure so the confirm dialog can surface the reason and stay
    // open; closes the dialog only once the row is gone.
    const handleDelete = async () => {
        if (!prefToDelete) return;

        await deleteAllergyPrefApi(prefToDelete.allergy_preference_id);

        // Removing the last row on a page would leave it empty, so step back a
        // page in that case; otherwise reload the page we were on.
        const targetPage =
            prefs.length === 1 && pagination.page > 1
                ? pagination.page - 1
                : pagination.page;

        await Promise.all([fetchTable(targetPage), fetchSummary()]);

        setPrefToDelete(null);
    };

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <TriangleAlert size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Allergen &amp; Preference
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                CLINICAL
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Maintain allergen restrictions and patient food
                        preferences.
                    </p>
                </div>
            </section>

            {/* Summary cards */}
            <AllergyPrefSummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />

            <div className="mt-4">
                <CreateAllergyPrefForm onSubmit={handleCreate} />
            </div>

            <AllergyPrefTable
                prefs={prefs}
                loading={isTableLoading}
                pagination={pagination}
                severityFilter={severityFilter}
                onSeverityFilterChange={setSeverityFilter}
                onPageChange={fetchTable}
                onEdit={setEditingPref}
                onDelete={setPrefToDelete}
            />

            {editingPref && (
                <EditAllergyPrefModal
                    key={editingPref.allergy_preference_id}
                    pref={editingPref}
                    onSubmit={(payload) => handleUpdate(editingPref, payload)}
                    onClose={() => setEditingPref(null)}
                />
            )}

            {prefToDelete && (
                <DeleteAllergyPrefConfirmModal
                    prefId={prefToDelete.allergy_preference_id}
                    patientName={prefToDelete.patient_name}
                    onCancel={() => setPrefToDelete(null)}
                    onConfirm={handleDelete}
                />
            )}
        </main>
    );
}
