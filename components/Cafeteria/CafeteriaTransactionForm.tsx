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
import { getMenusApi } from "@/data/Menu/api";
import type { GeneralMenu } from "@/data/Menu/type";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

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

type MenuOption = {
    master_item_id: string;
    label: string;
    selling_price: number;
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

function flattenMenuOptions(menus: GeneralMenu[]): MenuOption[] {
    const seen = new Set<string>();
    const options: MenuOption[] = [];

    for (const menu of menus) {
        for (const item of menu.items) {
            const label = `${item.recipe_name} · ${menu.meal_slot} · ₹${item.selling_price}`;
            const key = `${item.master_item_id}|${label}`;

            if (seen.has(key)) continue;

            seen.add(key);
            options.push({
                master_item_id: item.master_item_id,
                label,
                selling_price: item.selling_price,
            });
        }
    }

    return options;
}

/**
 * The tab's stored lines as editable form state. A tab with nothing on it
 * still yields one blank line so the counter has somewhere to type.
 */
function linesFromTab(data: GetTableTransactionDetails): OrderLine[] {
    const items = data.items_purchased ?? [];

    if (items.length > 0) {
        return items.map((item, idx) => ({
            key: Date.now() + idx,
            item_id: item.item_id,
            recipe_name: item.recipe_name,
            quantity: String(item.quantity),
            price_at_sale: String(item.price_at_sale),
        }));
    }

    return [
        {
            key: Date.now(),
            item_id: "",
            recipe_name: "",
            quantity: "1",
            price_at_sale: "",
        },
    ];
}

export function CafeteriaTransactionForm({
    initialTableNumber = "",
    onUpdated,
}: {
    /** A table picked from the grid outside; its open tab is loaded on mount. */
    initialTableNumber?: string;
    onUpdated?: () => void;
}) {
    const [tableNumber, setTableNumber] = useState(initialTableNumber);
    const [loadingTab, setLoadingTab] = useState(false);
    const [tabData, setTabData] = useState<GetTableTransactionDetails | null>(null);
    const [banner, setBanner] = useState<Banner>(null);

    const [customerType, setCustomerType] = useState<CafeteriaCustomerType>("Visitor");
    const [customerName, setCustomerName] = useState("");
    const [lines, setLines] = useState<OrderLine[]>([emptyLine(0)]);
    const [discountApplied, setDiscountApplied] = useState("0");
    const [paymentMode, setPaymentMode] = useState<CafeteriaPaymentMode>("Cash");
    const [paymentStatus, setPaymentStatus] = useState<CafeteriaPaymentStatus>("Pending");

    const [options, setOptions] = useState<MenuOption[]>([]);
    const [menuLoaded, setMenuLoaded] = useState(false);

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const loadMenu = async () => {
            const data = await getMenusApi({ type: "general" });
            if (Array.isArray(data)) {
                const menus = (data as GeneralMenu[]).filter(
                    (menu) => menu.is_available !== false
                );
                setOptions(flattenMenuOptions(menus));
            }
            setMenuLoaded(true);
        };
        loadMenu();
    }, []);

    useEffect(() => {
        if (initialTableNumber === "") return;

        // The grid outside picked this table, so load its open tab on mount:
        // the counter should not have to retype the number it just clicked.
        // Inlined rather than a shared helper so the lint rules see the
        // awaits before any setState.
        const load = async () => {
            setLoadingTab(true);
            const data = await getTableTransactionDetailsApi({
                table_number: initialTableNumber,
            });
            setLoadingTab(false);
            if (!data) {
                setBanner({
                    kind: "error",
                    text: "Could not fetch table transaction details.",
                });
                return;
            }
            setTabData(data);
            setLines(linesFromTab(data));
        };

        load();
    }, [initialTableNumber]);

    const handleFetchTab = async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        setBanner(null);
        const tn = tableNumber.trim();
        if (tn === "") {
            setBanner({
                kind: "error",
                text: "Table number is required — e.g. T-001.",
            });
            return;
        }
        setLoadingTab(true);
        const data = await getTableTransactionDetailsApi({ table_number: tn });
        setLoadingTab(false);
        if (!data) {
            setTabData(null);
            setBanner({
                kind: "error",
                text: "Could not fetch table transaction details.",
            });
            return;
        }
        setTabData(data);
        setLines(linesFromTab(data));
    };

    function updateLine(key: number, patch: Partial<OrderLine>) {
        console.log("UPDATELINE() ", key, patch)
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
                text: "Fetch the table's open tab first.",
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
            onUpdated?.();
        } else {
            setBanner({ kind: "error", text: result.error });
        }
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-800">
                    Create/Update Cafeteria Transaction
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                    Fetch table by number, review/edit the open tab, then update via PUT /api/cafeteria/table.
                </p>
            </div>

            {/* <form onSubmit={handleFetchTab} className="px-4 py-3 border-b border-slate-100">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[200px]">
                        <label htmlFor="table-number-fetch" className={labelClass}>
                            Table number
                        </label>
                        <input
                            id="table-number-fetch"
                            type="text"
                            value={tableNumber}
                            onChange={(event) => setTableNumber(event.target.value)}
                            placeholder="e.g. 20 or T-001"
                            className={inputClass}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loadingTab}
                        className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {loadingTab ? "Fetching..." : "Fetch Table"}
                    </button>
                </div>
            </form> */}

            {tabData && (
                <form onSubmit={handleSubmit} className="px-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2 mb-4">
                        <div>
                            <p className="text-xs text-slate-600">
                                <span className="text-slate-500">Table:</span> <span className="font-medium">{tabData.table_number}</span> ({tabData.table_id})
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                                <span className="text-slate-500">Open tab subtotal:</span>{" "}
                                <span className="font-semibold text-slate-900">₹{tabData.subtotal_amount.toLocaleString("en-IN")}</span>
                            </p>
                        </div>
                    </div>

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
                            {lines.map((line) => {
                                const selectedIndex = options.findIndex(
                                    (option) => option.master_item_id === line.item_id
                                );

                                return (
                                    <div
                                        key={line.key}
                                        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_7rem_2.25rem]"
                                    >
                                        {!menuLoaded ? (
                                            <select
                                                className={inputClass}
                                                disabled
                                                aria-label="Item"
                                            >
                                                <option>Loading menu…</option>
                                            </select>
                                        ) : options.length > 0 ? (
                                            <select
                                                className={inputClass}
                                                aria-label="Item"
                                                value={
                                                    selectedIndex === -1
                                                        ? ""
                                                        : String(selectedIndex)
                                                }
                                                onChange={(event) => {
                                                    const option =
                                                        options[
                                                            Number(
                                                                event.target.value
                                                            )
                                                        ];
                                                    if (!option) return;
                                                    updateLine(line.key, {
                                                        item_id: option.master_item_id,
                                                        price_at_sale: String(
                                                            option.selling_price
                                                        ),
                                                    });
                                                }}
                                            >
                                                <option value="">
                                                    {line.recipe_name ||
                                                        line.item_id ||
                                                        "Choose an item…"}
                                                </option>
                                                {options.map((option, index) => (
                                                    <option
                                                        key={`${option.master_item_id}-${index}`}
                                                        value={String(index)}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
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
                                        )}

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
                                );
                            })}
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
            )}
        </section>
    );
}
