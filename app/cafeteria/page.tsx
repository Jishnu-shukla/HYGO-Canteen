"use client";

import { CafeteriaSummaryCards } from "@/components/Cafeteria/CafeteriaSummaryCards";
import { CafeteriaTransactionForm } from "@/components/Cafeteria/CafeteriaTransactionForm";
import { TableCards } from "@/components/Cafeteria/TableCards";
import { AddTableForm } from "@/components/Tables/AddTableForm";
import { getCafeteriaSummaryApi } from "@/data/Cafeteria/api";
import type { CafeteriaSummary } from "@/data/Cafeteria/type";
import { getTablesApi } from "@/data/Tables/api";
import type { TableDetails } from "@/data/Tables/type";
import { HandPlatter, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function CafeteriaPage() {
    const [summary, setSummary] = useState<CafeteriaSummary | null>(null);
    const [tables, setTables] = useState<TableDetails[]>([]);

    // Start true so the mount fetch needs no synchronous setState.
    const [loading, setLoading] = useState(true);

    // "Add table" opens the registration form below the header.
    const [showAddTable, setShowAddTable] = useState(false);

    // The table the transaction form is working on, picked from the grid
    // below. formKey remounts the form so clicking a table reloads its tab
    // even when the same table is chosen twice.
    const [selectedTable, setSelectedTable] = useState<TableDetails | null>(null);
    const [formKey, setFormKey] = useState(0);

    useEffect(() => {
        // Inlined rather than calling a helper: the set-state-in-effect rule
        // cannot see that the helper awaits before touching state, and a few
        // lines here is cheaper than a disable comment.
        const load = async () => {
            const data = await getCafeteriaSummaryApi().catch((error) => {
                console.log("Error fetching cafeteria summary:", error);
                return null;
            });
            const tablesData = await getTablesApi().catch((error) => {
                console.log("Error fetching tables:", error);
                return null;
            });

            setSummary(data);
            setTables(Array.isArray(tablesData) ? tablesData : []);
            setLoading(false);
        };

        load();
    }, []);

    // A registered table lands as "Available", so available_tables moves —
    // refresh the cards from the event handler, where setState is welcome.
    // Deliberately not the effect's load: sharing it would put the helper
    // call the set-state-in-effect rule cannot see through back in an effect.
    async function refreshSummary() {
        const data = await getCafeteriaSummaryApi().catch((error) => {
            console.log("Error refreshing cafeteria summary:", error);
            return null;
        });
        const tablesData = await getTablesApi().catch((error) => {
            console.log("Error refreshing tables:", error);
            return null;
        });

        setSummary(data);
        setTables(Array.isArray(tablesData) ? tablesData : []);
    }

    function handleTableAdded() {
        refreshSummary();
    }

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <HandPlatter size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Cafeteria
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                SERVICE
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Today&apos;s POS run and free tables, on the
                        dashboard&apos;s day window.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowAddTable((previous) => !previous)}
                    aria-expanded={showAddTable}
                    className="inline-flex items-center gap-1.5 self-start rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 md:self-center"
                >
                    <Plus size={15} />
                    Add table
                </button>
            </section>

            {showAddTable && (
                <div className="mb-4">
                    <AddTableForm onTableAdded={handleTableAdded} />
                </div>
            )}

            <CafeteriaSummaryCards summary={summary} loading={loading} />

            {/* Picking an Occupied table hands it to the form below rather
                than routing away, so the tab is settled on this page. */}
            <TableCards
                tables={tables}
                onOccupiedSelect={(table) => {
                    setSelectedTable(table);
                    setFormKey((previous) => previous + 1);
                }}
            />

            <div className="mt-4">
                <CafeteriaTransactionForm
                    key={formKey}
                    initialTableNumber={selectedTable?.table_number ?? ""}
                    onUpdated={refreshSummary}
                />
            </div>
        </main>
    );
}
