"use client";

import CreateDietOrderForm from "@/components/DietOrder/CreateDietOrderForm";
import { DietOrderBoard } from "@/components/DietOrder/DietOrderBoard";
import { DietOrderSummaryCard } from "@/components/DietOrder/DietOrderSummaryCard";
import { DietOrderTable } from "@/components/DietOrder/DietOrderTable";
import {
    DIET_ORDER_PAGE_SIZE,
    EMPTY_PAGINATION,
    createDietOrderApi,
    getDietOrdersApi,
    getDietOrderSummaryApi,
    getTodayDietOrdersApi,
} from "@/data/DietOrder/api";
import {
    CreateDietOrderBody,
    DietOrderListItem,
    DietOrderPagination,
    GetDietOrderSummaryResponse,
} from "@/data/DietOrder/type";
import { ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function DietOrdersPage() {
    const [summary, setSummary] = useState<GetDietOrderSummaryResponse | null>(
        null
    );

    // Board shows one unfiltered slice of today; the table holds its own page.
    const [boardOrders, setBoardOrders] = useState<DietOrderListItem[]>([]);
    const [tableOrders, setTableOrders] = useState<DietOrderListItem[]>([]);
    const [pagination, setPagination] = useState<DietOrderPagination>(
        EMPTY_PAGINATION
    );

    // All start true so the mount fetch needs no synchronous setState.
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [isBoardLoading, setIsBoardLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);

    const [page, setPage] = useState(1);

    const fetchSummary = useCallback(async () => {
        try {
            const data = await getDietOrderSummaryApi();
            setSummary(data);
        } catch (error) {
            console.log("Error fetching diet order summary:", error);
        } finally {
            setIsSummaryLoading(false);
        }
    }, []);

    const fetchBoard = useCallback(async () => {
        try {
            setBoardOrders(await getTodayDietOrdersApi());
        } catch (error) {
            console.log("Error fetching diet orders for board:", error);
        } finally {
            setIsBoardLoading(false);
        }
    }, []);

    // Returns the resolved pagination so the create handler can clamp the page.
    const fetchTable = useCallback(
        async (targetPage: number): Promise<DietOrderPagination> => {
            try {
                setIsTableLoading(true);

                const { data, pagination: meta } = await getDietOrdersApi({
                    page: targetPage,
                    limit: DIET_ORDER_PAGE_SIZE,
                });

                setTableOrders(data);
                setPagination(meta);

                return meta;
            } catch (error) {
                console.log("Error fetching diet orders:", error);

                return EMPTY_PAGINATION;
            } finally {
                setIsTableLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        // Inlined so setState sits behind an await inside the effect rather
        // than in a helper the effect calls.
        const load = async () => {
            const [summaryData, boardData, tableData] = await Promise.all([
                getDietOrderSummaryApi().catch((error) => {
                    console.log("Error fetching diet order summary:", error);
                    return null;
                }),
                getTodayDietOrdersApi().catch((error) => {
                    console.log("Error fetching diet orders for board:", error);
                    return [] as DietOrderListItem[];
                }),
                getDietOrdersApi({
                    page: 1,
                    limit: DIET_ORDER_PAGE_SIZE,
                }).catch((error) => {
                    console.log("Error fetching diet orders:", error);
                    return { data: [], pagination: EMPTY_PAGINATION };
                }),
            ]);

            setSummary(summaryData);
            setBoardOrders(boardData);
            setTableOrders(tableData.data);
            setPagination(tableData.pagination);
            setIsSummaryLoading(false);
            setIsBoardLoading(false);
            setIsTableLoading(false);
        };

        load();
    }, []);

    const handleCreateOrder = async (payload: CreateDietOrderBody) => {
        await createDietOrderApi(payload);

        // Refresh the cards, the board, and whichever table page is showing.
        const [, , tableMeta] = await Promise.all([
            fetchSummary(),
            fetchBoard(),
            fetchTable(page),
        ]);

        // Adding an order can leave the viewer past the last page.
        if (tableMeta.total_pages > 0 && page > tableMeta.total_pages) {
            const lastPage = tableMeta.total_pages;
            setPage(lastPage);
            fetchTable(lastPage);
        }
    };

    const handlePageChange = (nextPage: number) => {
        setPage(nextPage);
        fetchTable(nextPage);
    };

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <ShoppingBag size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Diet Orders
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                SERVICE
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Raise, approve and track diet orders across wards.
                    </p>
                </div>
            </section>

            {/* Summary cards */}
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <DietOrderSummaryCard
                    label="Total Orders"
                    value={summary?.total_orders ?? 0}
                    loading={isSummaryLoading}
                />

                <DietOrderSummaryCard
                    label="Pending Orders"
                    value={summary?.pending_orders ?? 0}
                    valueClassName="text-amber-600"
                    loading={isSummaryLoading}
                />

                <DietOrderSummaryCard
                    label="Special Orders"
                    value={summary?.special_orders ?? 0}
                    valueClassName="text-amber-600"
                    loading={isSummaryLoading}
                />
            </section>

            <CreateDietOrderForm onSubmit={handleCreateOrder} />

            <DietOrderBoard orders={boardOrders} loading={isBoardLoading} />

            <DietOrderTable
                orders={tableOrders}
                loading={isTableLoading}
                pagination={pagination}
                onPageChange={handlePageChange}
            />
        </main>
    );
}