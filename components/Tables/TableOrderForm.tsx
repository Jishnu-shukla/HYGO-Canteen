"use client";

import { placeTableOrderApi } from "@/data/Cafeteria/api";
import type {
    AddTableOrderBody,
    CafeteriaItemPurchased,
} from "@/data/Cafeteria/type";
import { getMenusApi } from "@/data/Menu/api";
import type { GeneralMenu } from "@/data/Menu/type";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

const labelClass =
    "mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500";

/**
 * One order line as edited in the form. Quantity and price stay strings until
 * submit parses them — a controlled number input cannot hold a half-typed
 * value ("", "1.") any other way.
 */
type OrderLine = {
    key: number;
    item_id: string;
    quantity: string;
    price_at_sale: string;
};

/** An item flattened out of the general menus, ready to pick. */
type MenuOption = {
    master_item_id: string;
    label: string;
    selling_price: number;
};

type Banner = { kind: "success" | "error"; text: string } | null;

const emptyLine = (key: number): OrderLine => ({
    key,
    item_id: "",
    quantity: "1",
    price_at_sale: "",
});

/**
 * Flattens general menus into picker options.
 *
 * The same master item can appear on several menus at different selling
 * prices (live data does — one item sells at both ₹200 and ₹500), so each
 * priced line stays its own option: the customer saw one of them, and the
 * contract says the price is theirs to name, not the service's to re-derive.
 * Only exact id + label duplicates collapse.
 */
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
 * The single form on the Tables screen: a customer at a table places an
 * order via POST /api/cafeteria/table.
 *
 * The client sends exactly the three contract fields — table_id (validated
 * server-side against TableOrder, never persisted), customer_name
 * (display-only) and the order lines. Subtotal/total/payment_status are the
 * service's to compute, so the figure under the lines is labelled a preview
 * and nothing else on the document is guessed at.
 *
 * Item options come from GET /api/menu?type=general; if that list cannot be
 * loaded, each line falls back to a plain item-id input so the form still
 * works rather than blocking the screen on a menu read.
 */
export function TableOrderForm() {
    const [tableId, setTableId] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [lines, setLines] = useState<OrderLine[]>([emptyLine(0)]);

    const [options, setOptions] = useState<MenuOption[]>([]);
    const [menuLoaded, setMenuLoaded] = useState(false);

    const [banner, setBanner] = useState<Banner>(null);
    const [submitting, setSubmitting] = useState(false);

    // Monotonic React keys — line objects are replaced wholesale on edit, so
    // array indexes cannot double as identities.
    const keyRef = useRef(0);
    const nextKey = () => {
        keyRef.current += 1;
        return keyRef.current;
    };

    useEffect(() => {
        // Inlined rather than calling a helper: the set-state-in-effect rule
        // cannot see that the helper awaits before touching state.
        const load = async () => {
            // No is_available in the query: the server-side filter answers 0
            // rows for every value it is given (verified against live data —
            // both general menus are is_available: true), so the field is
            // filtered here where it can be read as the boolean it is.
            const data = await getMenusApi({ type: "general" });

            if (Array.isArray(data)) {
                const menus = (data as GeneralMenu[]).filter(
                    (menu) => menu.is_available !== false
                );

                setOptions(flattenMenuOptions(menus));
            }

            setMenuLoaded(true);
        };

        load();
    }, []);

    function updateLine(key: number, patch: Partial<OrderLine>) {
        setLines((previous) =>
            previous.map((line) =>
                line.key === key ? { ...line, ...patch } : line
            )
        );
    }

    function addLine() {
        setLines((previous) => [...previous, emptyLine(nextKey())]);
    }

    function removeLine(key: number) {
        setLines((previous) =>
            previous.length > 1
                ? previous.filter((line) => line.key !== key)
                : previous
        );
    }

    /** Σ quantity × price — a preview only; the service computes the real one. */
    const subtotal = lines.reduce((sum, line) => {
        const quantity = Number(line.quantity);
        const price = Number(line.price_at_sale);

        if (!Number.isFinite(quantity) || !Number.isFinite(price)) return sum;

        return sum + quantity * price;
    }, 0);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBanner(null);

        if (tableId.trim() === "") {
            setBanner({
                kind: "error",
                text: "Table id is required — e.g. T-001.",
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

        const body: AddTableOrderBody = {
            table_id: tableId.trim(),
            customer_name: customerName.trim(),
            items_purchased: items,
        };

        setSubmitting(true);

        const result = await placeTableOrderApi(body);

        setSubmitting(false);

        if (result.ok) {
            setBanner({
                kind: "success",
                text:
                    result.response.message ||
                    "Order placed — settled later at the counter.",
            });
            setTableId("");
            setCustomerName("");
            setLines([emptyLine(nextKey())]);
        } else {
            setBanner({ kind: "error", text: result.error });
        }
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-800">
                    New table order
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                    The order is taken at the table and settled later at the
                    counter — the service files it as Pending.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="table-id" className={labelClass}>
                            Table id
                        </label>

                        <input
                            id="table-id"
                            type="text"
                            required
                            value={tableId}
                            onChange={(event) => setTableId(event.target.value)}
                            placeholder="T-001"
                            className={inputClass}
                        />

                        <p className="mt-1 text-[10px] text-slate-400">
                            From the table&apos;s QR — checked against the
                            registered tables, never stored on the transaction.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="customer-name" className={labelClass}>
                            Customer name
                        </label>

                        <input
                            id="customer-name"
                            type="text"
                            value={customerName}
                            onChange={(event) =>
                                setCustomerName(event.target.value)
                            }
                            placeholder="Walk-in customer"
                            className={inputClass}
                        />

                        <p className="mt-1 text-[10px] text-slate-400">
                            Display only — echoed back for the row, never
                            persisted.
                        </p>
                    </div>
                </div>

                <div className="mt-5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className={labelClass}>Order items</span>

                        <span className="text-[11px] text-slate-500">
                            Subtotal{" "}
                            <span className="font-bold text-slate-700">
                                ₹{subtotal.toLocaleString("en-IN")}
                            </span>{" "}
                            <span className="text-slate-400">(preview)</span>
                        </span>
                    </div>

                    <div className="space-y-2">
                        {lines.map((line) => {
                            const selectedIndex = options.findIndex(
                                (option) =>
                                    option.master_item_id === line.item_id
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
                                                    item_id:
                                                        option.master_item_id,
                                                    price_at_sale: String(
                                                        option.selling_price
                                                        ),
                                                });
                                            }}
                                        >
                                            <option value="">
                                                Choose an item…
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
                                            value={line.item_id}
                                            onChange={(event) =>
                                                updateLine(line.key, {
                                                    item_id: event.target.value,
                                                })
                                            }
                                            placeholder="Item id (MST-000001)"
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
                                        title="Quantity"
                                        className={inputClass}
                                    />

                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        readOnly
                                        value={line.price_at_sale}
                                        onChange={(event) =>
                                            updateLine(line.key, {
                                                price_at_sale:
                                                    event.target.value,
                                            })
                                        }
                                        aria-label="Price at sale"
                                        title="Price at sale"
                                        placeholder="Price"
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

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] text-slate-400">
                        Subtotal and total are computed by the service — the
                        figure above is a preview.
                    </p>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {submitting ? "Placing order…" : "Place order"}
                    </button>
                </div>
            </form>
        </section>
    );
}
