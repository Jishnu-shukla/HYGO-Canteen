"use client";

import { TableOrderForm } from "@/components/Tables/TableOrderForm";
import { Table2 } from "lucide-react";

/**
 * Tables screen — one form: a customer at a table places an order via
 * POST /api/cafeteria/table. Payment happens later at the counter, so there
 * is nothing to settle here; the order is filed as Pending by the service.
 */
export default function TablesPage() {
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
                        Take an order for a customer seated at a table — paid
                        later at the counter.
                    </p>
                </div>
            </section>

            <TableOrderForm />
        </main>
    );
}
