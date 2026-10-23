"use client";

import PatientHistoryModal from "@/components/Patient/PatientHistoryModal";
import { PatientSummaryCards } from "@/components/Patient/PatientSummaryCards";
import { PatientTable } from "@/components/Patient/PatientTable";
import {
    EMPTY_PATIENT_PAGINATION,
    PATIENT_PAGE_SIZE,
    getPatientSummaryApi,
    getPatientsApi,
} from "@/data/Patient/api";
import type {
    GetPatientResponseSummary,
    PatientListItem,
    PatientPagination,
} from "@/data/Patient/type";
import { UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function PatientsPage() {
    const [summary, setSummary] =
        useState<GetPatientResponseSummary | null>(null);

    const [patients, setPatients] = useState<PatientListItem[]>([]);
    const [pagination, setPagination] = useState<PatientPagination>(
        EMPTY_PATIENT_PAGINATION
    );
    const [statusFilter, setStatusFilter] = useState<
        "all" | "active" | "deleted"
    >("all");

    // Both start true so the mount fetches need no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);

    // UHID of the row whose history modal is open; null when none is.
    const [historyUhid, setHistoryUhid] = useState<string | null>(null);

    // The visible page lives in `pagination`, which the table reads from, so
    // no separate page state is needed here.
    const fetchTable = useCallback(async (targetPage: number) => {
        try {
            setIsTableLoading(true);

            const { data, pagination: meta } = await getPatientsApi({
                page: targetPage,
                limit: PATIENT_PAGE_SIZE,
            });

            setPatients(data);
            setPagination(meta);
        } catch (error) {
            console.log("Error fetching patients:", error);
        } finally {
            setIsTableLoading(false);
        }
    }, []);

    useEffect(() => {
        // Inlined rather than calling a fetch helper: the set-state-in-effect
        // rule cannot see that it awaits before touching state, and
        // duplicating these lines is cheaper than a disable comment.
        const load = async () => {
            const [summaryData, tableData] = await Promise.all([
                getPatientSummaryApi().catch((error) => {
                    console.log("Error fetching patient summary:", error);
                    return null;
                }),
                getPatientsApi({
                    page: 1,
                    limit: PATIENT_PAGE_SIZE,
                }).catch((error) => {
                    console.log("Error fetching patients:", error);
                    return {
                        data: [] as PatientListItem[],
                        pagination: EMPTY_PATIENT_PAGINATION,
                    };
                }),
            ]);

            setSummary(summaryData);
            setPatients(tableData.data);
            setPagination(tableData.pagination);
            setIsSummaryLoading(false);
            setIsTableLoading(false);
        };

        load();
    }, []);

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <UsersRound size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Patients
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                CLINICAL
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        The admitted-patient roster behind every diet, allergy
                        and delivery record.
                    </p>
                </div>
            </section>

            <PatientSummaryCards
                summary={summary}
                loading={isSummaryLoading}
            />

            <PatientTable
                patients={patients}
                loading={isTableLoading}
                pagination={pagination}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onPageChange={fetchTable}
                onRowClick={(patient) => setHistoryUhid(patient.uhid)}
            />

            {historyUhid && (
                <PatientHistoryModal
                    uhid={historyUhid}
                    onClose={() => setHistoryUhid(null)}
                />
            )}
        </main>
    );
}
