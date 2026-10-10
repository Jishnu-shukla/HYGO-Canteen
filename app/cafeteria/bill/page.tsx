"use client";

import {
    getTableTransactionDetailsApi,
    updateTableTransactionApi,
} from "@/data/Cafeteria/api";
import type {
    CafeteriaCustomerType,
    CafeteriaItemPurchased,
    CafeteriaPaymentMode,
    CafeteriaPaymentStatus,
    CreateCafeteriaTransactionBody,
    GetTableTransactionDetails,
} from "@/data/Cafeteria/type";
import type { TableDetails } from "@/data/Tables/type";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

const labelClass =
    "mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500";

type OrderLine = {
    key: number;
    item_id: string;
    /** Display name from the GET response; "" on manually added lines. */
    recipe_name: string;
    quantity: string;
    price_at_sale: string;
};

type Banner = { kind: "success" | "error"; text: string } | null;

const emptyLine = (key: number): OrderLine => ({
    key,
    item_id: "",
    recipe_name: "",
    quantity: "1",
    price_at_sale: "",
});

const customerTypes: CafeteriaCustomerType[] = [
    "Staff",
    "Outpatient",
    "Visitor",
    "Relative",
];

const paymentModes: { label: string; value: CafeteriaPaymentMode }[] = [
    { label: "Cash", value: "Cash" },
    { label: "UPI", value: "UPI" },
    { label: "Credit Card", value: "Credit_Card" },
    { label: "Hospital Payroll Deduction", value: "Hospital_Payroll_Deduction" },
];

const paymentStatuses: CafeteriaPaymentStatus[] = ["Pending", "Paid", "Refunded", "Cancelled"];

export default function CafeteriaBillPage() {
    const router = useRouter();
    const [tabData, setTabData] = useState<GetTableTransactionDetails | null>(null);
    const [table, setTable] = useState<TableDetails | null>(null);
    const [banner, setBanner] = useState<Banner>(null);
    const [submitting, setSubmitting] = useState(false);

    const [customerType, setCustomerType] = useState<CafeteriaCustomerType>("Visitor");
    const [customerName, setCustomerName] = useState("");
    const [lines, setLines] = useState<OrderLine[]>([emptyLine(Date.now())]);
    const [discountApplied, setDiscountApplied] = useState("0");
    const [paymentMode, setPaymentMode] = useState<CafeteriaPaymentMode>("Cash");
    const [paymentStatus, setPaymentStatus] = useState<CafeteriaPaymentStatus>("Pending");

    useEffect(() => {
        const stored = sessionStorage.getItem("cafeteria_table_bill");
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as {
                    tabData: GetTableTransactionDetails;
                    table: TableDetails;
                };
                setTabData(parsed.tabData);
                setTable(parsed.table);
                const loadedLines: OrderLine[] = [];
                if (parsed.tabData.items_purchased && parsed.tabData.items_purchased.length > 0) {
                    parsed.tabData.items_purchased.forEach((item, idx) => {
                        loadedLines.push({
                            key: Date.now() + idx,
                            item_id: item.item_id,
                            recipe_name: item.recipe_name,
                            quantity: String(item.quantity),
                            price_at_sale: String(item.price_at_sale),
                        });
                    });
                }
                if (loadedLines.length === 0) {
                    loadedLines.push({
                        key: Date.now(),
                        item_id: "",
                        recipe_name: "",
                        quantity: "1",
                        price_at_sale: "",
                    });
                }
                setLines(loadedLines);
            } catch (error) {
                console.log(error);
            }
        }
    }, []);

    function updateLine(key: number, patch: Partial<OrderLine>) {
        setLines((previous) =>
            previous.map((line) => (line.key === key ? { ...line, ...patch } : line))
        );
    }

    function addLine() {
        setLines((previous) => [...previous, emptyLine(Date.now())]);
    }

    function removeLine(key: number) {
        setLines((previous) =>
            previous.length > 1 ? previous.filter((line) => line.key !== key) : previous
        );
    }

    const subtotal = lines.reduce((sum, line) => {
        const quantity = Number(line.quantity);
        const price = Number(line.price_at_sale);
        if (!Number.isFinite(quantity) || !Number.isFinite(price)) return sum;
        return sum + quantity * price;
    }, 0);

    const discount = Number(discountApplied);
    const total = subtotal - (Number.isFinite(discount) ? discount : 0);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBanner(null);

        if (!tabData) {
            setBanner({
                kind: "error",
                text: "No table data found. Go back and select table again.",
            });
            return;
        }

        const items: CafeteriaItemPurchased[] = [];
        for (const line of lines) {
            const item_id = line.item_id.trim();
            const quantity = Number(line.quantity);
            const price_at_sale = Number(line.price_at_sale);

            if (item_id === "") {
                setBanner({
                    kind: "error",
                    text: "Pick an item for every order line.",
                });
                return;
            }
            if (!Number.isInteger(quantity) || quantity < 1) {
                setBanner({
                    kind: "error",
                    text: "Quantity must be a whole number of at least 1.",
                });
                return;
            }
            if (
                line.price_at_sale.trim() === "" ||
                !Number.isFinite(price_at_sale) ||
                price_at_sale < 0
            ) {
                setBanner({
                    kind: "error",
                    text: "Every line needs a price of 0 or more.",
                });
                return;
            }
            items.push({ item_id, quantity, price_at_sale });
        }

        if (!Number.isFinite(discount) || discount < 0) {
            setBanner({
                kind: "error",
                text: "Discount applied must be 0 or more.",
            });
            return;
        }

        const body: CreateCafeteriaTransactionBody = {
            customer_type: customerType,
            customer_name: customerName.trim() === "" ? null : customerName.trim(),
            items_purchased: items,
            table_id: tabData.table_number,
            subtotal_amount: subtotal,
            discount_applied: discount,
            total_amount: total,
            payment_mode: paymentMode,
            payment_status: paymentStatus,
        };

        setSubmitting(true);
        const result = await updateTableTransactionApi(body);
        setSubmitting(false);

        if (result.ok) {
            setBanner({
                kind: "success",
                text: "Transaction updated successfully.",
            });
        } else {
            setBanner({ kind: "error", text: result.error });
        }
    };

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            <section className="mb-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                    <ArrowLeft size={14} />
                    Back
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-slate-800">
                        Cafeteria Bill - Table {table?.table_number || tabData?.table_number}
                    </h1>
                    <p className="text-xs text-slate-500">
                        {table?.table_id} {table?.capacity ? `· ${table.capacity} seats` : ""}
                    </p>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <form onSubmit={handleSubmit} className="px-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="customer-type" className={labelClass}>
                                Customer type
                            </label>
                            <select
                                id="customer-type"
                                value={customerType}
                                onChange={(event) => setCustomerType(event.target.value as CafeteriaCustomerType)}
                                className={inputClass}
                            >
                                {customerTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="customer-name" className={labelClass}>
                                Customer name
                            </label>
                            <input
                                id="customer-name"
                                type="text"
                                value={customerName}
                                onChange={(event) => setCustomerName(event.target.value)}
                                placeholder="Customer name (optional)"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className={labelClass}>Order items</span>
                            <span className="text-[11px] text-slate-600">
                                Subtotal{" "}
                                <span className="font-semibold text-slate-900">
                                    ₹{subtotal.toLocaleString("en-IN")}
                                </span>
                            </span>
                        </div>

                        <div className="space-y-2">
                            {lines.map((line) => (
                                <div
                                    key={line.key}
                                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_7rem_2.25rem]"
                                >
                                    <input
                                        type="text"
                                        required
                                        value={line.recipe_name || line.item_id}
                                        onChange={(event) =>
                                            updateLine(line.key, {
                                                item_id: event.target.value,
                                                // Manual edit: the name no longer describes the id.
                                                recipe_name: "",
                                            })
                                        }
                                        placeholder="Item id"
                                        aria-label="Item id"
                                        className={inputClass}
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        required
                                        value={line.quantity}
                                        onChange={(event) =>
                                            updateLine(line.key, {
                                                quantity: event.target.value,
                                            })
                                        }
                                        aria-label="Quantity"
                                        className={inputClass}
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={line.price_at_sale}
                                        onChange={(event) =>
                                            updateLine(line.key, {
                                                price_at_sale: event.target.value,
                                            })
                                        }
                                        aria-label="Price at sale"
                                        className={inputClass}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeLine(line.key)}
                                        disabled={lines.length === 1}
                                        aria-label="Remove this line"
                                        className="flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addLine}
                            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            <Plus size={13} />
                            Add item
                        </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3 mt-4">
                        <div>
                            <label htmlFor="discount" className={labelClass}>
                                Discount applied
                            </label>
                            <input
                                id="discount"
                                type="number"
                                min={0}
                                step="any"
                                value={discountApplied}
                                onChange={(event) => setDiscountApplied(event.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <span className={labelClass}>Payment mode</span>
                            <div className="flex flex-wrap gap-2">
                                {paymentModes.map((mode) => (
                                    <button
                                        key={mode.value}
                                        type="button"
                                        onClick={() => setPaymentMode(mode.value)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                            paymentMode === mode.value
                                                ? "bg-amber-600 text-white"
                                                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="payment-status" className={labelClass}>
                                Payment status
                            </label>
                            <select
                                id="payment-status"
                                value={paymentStatus}
                                onChange={(event) => setPaymentStatus(event.target.value as CafeteriaPaymentStatus)}
                                className={inputClass}
                            >
                                {paymentStatuses.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
                        <div className="flex flex-wrap gap-4">
                            <span>
                                <span className="text-slate-500">Subtotal:</span>{" "}
                                <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString("en-IN")}</span>
                            </span>
                            <span>
                                <span className="text-slate-500">Discount:</span>{" "}
                                <span className="font-semibold text-amber-700">₹{discount.toLocaleString("en-IN")}</span>
                            </span>
                            <span>
                                <span className="text-slate-500">Total:</span>{" "}
                                <span className="font-semibold text-emerald-700">₹{total.toLocaleString("en-IN")}</span>
                            </span>
                        </div>
                    </div>

                    {banner && (
                        <p
                            className={`mt-4 rounded-lg border px-3 py-2 text-xs font-medium ${
                                banner.kind === "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-red-200 bg-red-50 text-red-700"
                            }`}
                            role="status"
                        >
                            {banner.text}
                        </p>
                    )}

                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting ? "Updating..." : "Complete Transaction"}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}
