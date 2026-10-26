"use client";

import { CafeteriaBillModal } from "@/components/Cafeteria/CafeteriaBillModal";
import { CafeteriaRevenueChart } from "@/components/Cafeteria/CafeteriaRevenueChart";
import { CafeteriaSummaryCards } from "@/components/Cafeteria/CafeteriaSummaryCards";
import { CafeteriaTransactionForm } from "@/components/Cafeteria/CafeteriaTransactionForm";
import { CafeteriaTransactionsTable } from "@/components/Cafeteria/CafeteriaTransactionsTable";
import { TableCards } from "@/components/Cafeteria/TableCards";
import { AddTableForm } from "@/components/Tables/AddTableForm";
import {
    CAFETERIA_PAGE_SIZE,
    EMPTY_CAFETERIA_PAGINATION,
    getCafeteriaApi,
    getCafeteriaDaysApi,
    getCafeteriaSummaryApi,
} from "@/data/Cafeteria/api";
import type {
    CafeteriaDaySales,
    CafeteriaPagination,
    CafeteriaSummary,
    CafeteriaTransactionListItem,
} from "@/data/Cafeteria/type";
import { getTablesApi } from "@/data/Tables/api";
import type { TableDetails } from "@/data/Tables/type";
import { HandPlatter } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function CafeteriaPage() {
    const [summary, setSummary] = useState<CafeteriaSummary | null>(null);
    const [days, setDays] = useState<CafeteriaDaySales[]>([]);
    const [tables, setTables] = useState<TableDetails[]>([]);

    // The ledger page lives in `pagination`, which the table reads from, so no
    // separate page state is needed here.
    const [transactions, setTransactions] = useState<
        CafeteriaTransactionListItem[]
    >([]);
    const [pagination, setPagination] = useState<CafeteriaPagination>(
        EMPTY_CAFETERIA_PAGINATION
    );

    // Start true so the mount fetch needs no synchronous setState.
    const [loading, setLoading] = useState(true);
    const [isChartLoading, setIsChartLoading] = useState(true);
    const [isLedgerLoading, setIsLedgerLoading] = useState(true);

    // "Add table" opens the registration form below the header.
    const [showAddTable, setShowAddTable] = useState(false);

    // The table the transaction form is working on, picked from the grid
    // below. formKey remounts the form so clicking a table reloads its tab
    // even when the same table is chosen twice.
    const [selectedTable, setSelectedTable] = useState<TableDetails | null>(null);
    const [formKey, setFormKey] = useState(0);

    // TX-… id of the ledger row whose bill is open, or null when none is.
    const [billTransactionId, setBillTransactionId] = useState<string | null>(
        null
    );

    useEffect(() => {
        // Inlined rather than calling a helper: the set-state-in-effect rule
        // cannot see that the helper awaits before touching state, and a few
        // lines here is cheaper than a disable comment.
        const load = async () => {
            const data = await getCafeteriaSummaryApi().catch((error) => {
                console.log("Error fetching cafeteria summary:", error);
                return null;
            });
            // No month query: the endpoint defaults to the current local month,
            // which is the month the chart is meant to show on first load.
            const daysData = await getCafeteriaDaysApi().catch((error) => {
                console.log("Error fetching cafeteria days:", error);
                return [] as CafeteriaDaySales[];
            });
            const tablesData = await getTablesApi().catch((error) => {
                console.log("Error fetching tables:", error);
                return null;
            });
            const ledger = await getCafeteriaApi({
                page: 1,
                limit: CAFETERIA_PAGE_SIZE,
            }).catch((error) => {
                console.log("Error fetching cafeteria transactions:", error);
                return {
                    data: [] as CafeteriaTransactionListItem[],
                    pagination: EMPTY_CAFETERIA_PAGINATION,
                };
            });

            setSummary(data);
            setDays(daysData);
            setTables(Array.isArray(tablesData) ? tablesData : []);
            setTransactions(ledger.data);
            setPagination(ledger.pagination);
            setLoading(false);
            setIsChartLoading(false);
            setIsLedgerLoading(false);
        };

        load();
    }, []);

    const fetchTransactions = useCallback(async (targetPage: number) => {
        try {
            setIsLedgerLoading(true);

            const { data, pagination: meta } = await getCafeteriaApi({
                page: targetPage,
                limit: CAFETERIA_PAGE_SIZE,
            });

            setTransactions(data);
            setPagination(meta);
        } catch (error) {
            console.log("Error fetching cafeteria transactions:", error);
        } finally {
            setIsLedgerLoading(false);
        }
    }, []);

    // A registered table lands as "Available", so available_tables moves —
    // refresh the cards from the event handler, where setState is welcome.
    // Deliberately not the effect's load: sharing it would put the helper
    // call the set-state-in-effect rule cannot see through back in an effect.
    //
    // Settling a tab also changes the current day's revenue, which is a point
    // on the month chart, and rewrites that row in the ledger, so both are
    // re-read alongside the cards.
    async function refreshSummary() {
        const data = await getCafeteriaSummaryApi().catch((error) => {
            console.log("Error refreshing cafeteria summary:", error);
            return null;
        });
        const daysData = await getCafeteriaDaysApi().catch((error) => {
            console.log("Error refreshing cafeteria days:", error);
            return [] as CafeteriaDaySales[];
        });
        const tablesData = await getTablesApi().catch((error) => {
            console.log("Error refreshing tables:", error);
            return null;
        });
        const ledger = await getCafeteriaApi({
            page: pagination.page,
            limit: CAFETERIA_PAGE_SIZE,
        }).catch((error) => {
            console.log("Error refreshing cafeteria transactions:", error);
            return null;
        });

        setSummary(data);
        setDays(daysData);
        setTables(Array.isArray(tablesData) ? tablesData : []);

        // Only replace the ledger when the re-read actually returned rows: the
        // api layer reports a failed fetch as an empty page, and blanking a
        // table the user is reading is worse than showing it a moment stale.
        if (ledger && ledger.data.length > 0) {
            setTransactions(ledger.data);
            setPagination(ledger.pagination);
        }
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
                    Add table
                </button>
            </section>

            {showAddTable && (
                <div className="mb-4">
                    <AddTableForm onTableAdded={handleTableAdded} />
                </div>
            )}

            <CafeteriaSummaryCards summary={summary} loading={loading} />

            {/* Picking an Occupied table opens its settle modal instead of
                routing away, so the tab is settled on this page. */}
            <TableCards
                tables={tables}
                onOccupiedSelect={(table) => {
                    setSelectedTable(table);
                    setFormKey((previous) => previous + 1);
                }}
            />

            {/* Month-to-date sales line, below the table grid so the seating
                state is the first thing on the page. The endpoint zero-fills
                every day of the month, so the x-axis runs 1st -> last date
                without gaps. */}
            <section className="mt-4 min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3">
                    <h2 className="text-base font-semibold text-slate-800">
                        Cafeteria Sales
                    </h2>

                    <p className="text-sm text-slate-500">
                        Daily paid revenue for the current month
                    </p>
                </div>

                <div className="h-[300px]">
                    <CafeteriaRevenueChart
                        days={days}
                        loading={isChartLoading}
                    />
                </div>

                <p className="mt-2 text-center text-[10px] text-slate-400">
                    Revenue counts Paid transactions only — pending orders have
                    not been collected and refunds contribute 0, so a day with
                    no paid sale plots at ₹0.
                </p>
            </section>

            <CafeteriaTransactionsTable
                transactions={transactions}
                loading={isLedgerLoading}
                pagination={pagination}
                onPageChange={fetchTransactions}
                onSelect={(transaction) =>
                    setBillTransactionId(transaction.transaction_id)
                }
            />

            {/* Remounted per id, so opening another row starts a fresh fetch
                instead of showing the previous bill for a frame. */}
            {billTransactionId && (
                <CafeteriaBillModal
                    key={billTransactionId}
                    transactionId={billTransactionId}
                    onClose={() => setBillTransactionId(null)}
                />
            )}

            {selectedTable && (
                <CafeteriaTransactionForm
                    key={formKey}
                    initialTableNumber={selectedTable.table_number}
                    onUpdated={refreshSummary}
                    onClose={() => setSelectedTable(null)}
                />
            )}
        </main>
    );
}
