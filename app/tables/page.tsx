"use client";

import { getTablesApi } from "@/data/Tables/api";
import type { TableDetails } from "@/data/Tables/type";
import { Armchair, LoaderCircle, Table2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusStyles: Record<string, string> = {
    Available: "border-emerald-200 bg-emerald-50",
    Occupied: "border-amber-200 bg-amber-50",
};

const statusText: Record<string, string> = {
    Available: "text-emerald-700",
    Occupied: "text-amber-700",
};

/**
 * Tables screen — lists the registered tables; picking one opens its order
 * page at /tables/<table_id>, the same link the table's QR code carries so a
 * customer can scan straight into an order.
 */
export default function TablesPage() {
    const [tables, setTables] = useState<TableDetails[]>([]);

    // Start true so the mount fetch needs no synchronous setState.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Inlined rather than calling a helper: the set-state-in-effect rule
        // cannot see that the helper awaits before touching state.
        const load = async () => {
            const data = await getTablesApi().catch((error) => {
                console.log("Error fetching tables:", error);
                return null;
            });

            setTables(Array.isArray(data) ? data : []);
            setLoading(false);
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
                            <Table2 size={21} />
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                Tables
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                SERVICE
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Pick a table to take its order, or scan the QR code on
                        the table to open it directly.
                    </p>
                </div>
            </section>

            {loading ? (
                <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-slate-400">
                    <LoaderCircle size={22} className="animate-spin" />
                </div>
            ) : tables.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
                    <p className="text-sm font-medium text-gray-900">
                        No tables registered yet
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                        Add a table from the Cafeteria screen to mint its QR
                        code.
                    </p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                    {tables.map((table) => (
                        <Link
                            key={table.table_id}
                            href={`/tables/${encodeURIComponent(table.table_id)}`}
                            className={`relative block rounded-2xl border p-3 text-left shadow-sm transition hover:shadow-md ${
                                statusStyles[table.current_status] ||
                                "border-slate-200 bg-white"
                            }`}
                        >
                            <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                                {table.capacity} seats
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-700">
                                <Armchair size={18} />
                            </div>

                            <p className="mt-3 text-lg font-semibold text-slate-800">
                                {table.table_number}
                            </p>

                            <p className="font-mono text-[10px] text-slate-500">
                                {table.table_id}
                            </p>

                            <p
                                className={`mt-1 text-xs font-medium ${
                                    statusText[table.current_status] ||
                                    "text-slate-600"
                                }`}
                            >
                                {table.current_status}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}
