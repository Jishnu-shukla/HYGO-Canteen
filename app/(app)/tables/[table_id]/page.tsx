"use client";

import { TableOrderForm } from "@/components/Tables/TableOrderForm";
import { Table2 } from "lucide-react";
import { use } from "react";

/**
 * Tables order screen for one table. The table id comes from the URL path
 * (/tables/<table_id>) — the same link a table's QR code opens — so the form
 * never asks for it. Payment happens later at the counter, so there is
 * nothing to settle here; the order is filed as Pending by the service.
 */
export default function TableOrderPage({
    params,
}: {
    params: Promise<{ table_id: string }>;
}) {
    const { table_id } = use(params);

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
                                Table Order
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                SERVICE
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        Take an order for the customer seated here — paid later
                        at the counter.
                    </p>
                </div>
            </section>

            <TableOrderForm tableId={table_id} />
        </main>
    );
}
