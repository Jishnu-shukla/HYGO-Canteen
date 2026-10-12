"use client";

import { receiveBedSideDeliveryApi } from "@/data/BedSideDelivery/api";
import type {
    BedSideDeliveryOrder,
    ReceiveBedsideDeliveryResponse,
} from "@/data/BedSideDelivery/type";
import {
    BadgeCheck,
    CheckCircle2,
    LoaderCircle,
    TriangleAlert,
} from "lucide-react";
import { type FormEvent, useState } from "react";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-60";

/**
 * Confirms the bedside handover: pick the order, flip it to received.
 *
 * One of the two handover forms — the bare status write, paired with
 * CreateBedSideDeliveryForm which records the intake reading. PUT
 * /api/bedsidedelivery/:order_id takes no body, so there is nothing to fill in
 * beyond which order was handed over.
 */
export default function ReceiveBedSideDeliveryForm({
    orders,
    loadingOrders = false,
    onReceived,
}: {
    /** Picker options from GET /api/bedsidedelivery/orders. */
    orders: BedSideDeliveryOrder[];
    loadingOrders?: boolean;
    /** Called after a successful flip so the caller can refresh the cards. */
    onReceived?: (
        result: ReceiveBedsideDeliveryResponse
    ) => void | Promise<void>;
}) {
    const [orderId, setOrderId] = useState("");
    const [receiving, setReceiving] = useState(false);
    const [error, setError] = useState("");
    const [received, setReceived] =
        useState<ReceiveBedsideDeliveryResponse | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!orderId) {
            setError("Select an order before confirming.");
            return;
        }

        setReceiving(true);
        setError("");
        setReceived(null);

        try {
            const result = await receiveBedSideDeliveryApi(orderId);

            setReceived(result);
            // The order is now delivered, so it is no longer the pending pick.
            setOrderId("");

            await onReceived?.(result);
        } catch (err) {
            console.error("Error confirming bedside handover:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not confirm the handover. Please try again."
            );
        } finally {
            setReceiving(false);
        }
    };

    return (
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <BadgeCheck size={20} />
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                        Bedside Delivery
                    </h2>
                    <p className="text-xs text-slate-400">
                        Confirm the tray reached the patient and update the
                        order status.
                    </p>
                </div>
            </div>

            {received && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                    <CheckCircle2
                        size={16}
                        className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <p className="text-xs font-medium text-emerald-800">
                        <span className="font-bold">{received.order_id}</span> is
                        now <span className="font-bold">{received.status}</span>,
                        confirmed at{" "}
                        <span className="font-bold">
                            {new Date(received.delivered_at).toLocaleString()}
                        </span>
                        .
                    </p>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="flex flex-col item-center gap-4 sm:flex-row sm:items-center"
            >
                <label className="block flex-1">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Order<span className="ml-0.5 text-red-500">*</span>
                    </span>

                    <select
                        value={orderId}
                        disabled={receiving || loadingOrders}
                        onChange={(event) => setOrderId(event.target.value)}
                        className={`${inputClass} appearance-none`}
                    >
                        <option value="">
                            {loadingOrders
                                ? "Loading orders..."
                                : orders.length === 0
                                  ? "No orders available"
                                  : "Select an order"}
                        </option>

                        {orders.map((order) => (
                            <option key={order.order_id} value={order.order_id}>
                                {order.patient_name} ({order.uhid}) —{" "}
                                {order.order_id}
                            </option>
                        ))}
                    </select>

                    <span className="mt-1 block text-[10px] text-slate-400">
                        Order whose handover is being confirmed.
                    </span>
                </label>

                <button
                    type="submit"
                    disabled={!orderId || receiving}
                    className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {receiving ? (
                        <>
                            <LoaderCircle size={16} className="animate-spin" />
                            Confirming
                        </>
                    ) : (
                        <>
                            <BadgeCheck size={16} />
                            Mark Received
                        </>
                    )}
                </button>
            </form>

            {error && (
                <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    <TriangleAlert size={12} />
                    {error}
                </p>
            )}
        </section>
    );
}
