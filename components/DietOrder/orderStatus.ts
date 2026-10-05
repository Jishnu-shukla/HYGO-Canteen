import type { OrderStatus } from "@/data/DietOrder/type";

/**
 * Board columns and display metadata for order status.
 *
 * `Cancelled_Order` and `Lost` are excluded from the board: they are
 * terminal states, so they belong in the table only. Keeping them off the
 * board stops cancelled trays looking like work still in progress.
 */
export const BOARD_COLUMNS: {
    key: OrderStatus;
    title: string;
}[] = [
    { key: "Ordered", title: "ORDERED" },
    { key: "Approved", title: "APPROVED" },
    { key: "Ready", title: "READY" },
    { key: "Dispatched", title: "DISPATCHED" },
    { key: "Recieved", title: "RECIEVED" },
];

/** Friendlier label for a wire status. */
export const STATUS_LABEL: Record<OrderStatus, string> = {
    Ordered: "Ordered",
    Approved: "Approved",
    Ready: "Ready",
    Dispatched: "Dispatched",
    Recieved: "Received",
    Cancelled_Order: "Cancelled",
    Lost: "Lost",
};

/** Tailwind classes per status, used by the table badge. */
export const STATUS_BADGE: Record<OrderStatus, string> = {
    Ordered: "bg-slate-100 text-slate-700",
    Approved: "bg-blue-50 text-blue-700",
    Ready: "bg-indigo-50 text-indigo-700",
    Dispatched: "bg-amber-50 text-amber-700",
    Recieved: "bg-emerald-50 text-emerald-700",
    Cancelled_Order: "bg-red-50 text-red-700",
    Lost: "bg-slate-200 text-slate-600",
};

/**
 * Keeps only orders created today.
 *
 * GET /api/dietorder documents itself as "orders created today" but currently
 * returns older seeded rows too, so the filter is applied client-side.
 * Uses local calendar day rather than UTC so "today" matches the user's clock.
 */
export function filterCreatedToday<T extends { createdAt: string }>(
    orders: T[]
): T[] {
    const now = new Date();
    const isToday = (value: string) => {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return false;

        return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
        );
    };

    return orders.filter((order) => isToday(order.createdAt));
}

const DIET_BADGE: { match: string; className: string }[] = [
    { match: "LIQUID", className: "bg-purple-50 text-purple-700" },
    { match: "SOFT", className: "bg-blue-50 text-blue-700" },
    { match: "DIABET", className: "bg-indigo-50 text-indigo-700" },
    { match: "RENAL", className: "bg-red-50 text-red-700" },
    { match: "NPO", className: "bg-slate-200 text-slate-600" },
];

const DEFAULT_BADGE = "bg-slate-100 text-slate-700";

/** Meal slot chip. Falls back to the diet type when the slot is "N/A". */
export function mealBadge(value: string | null | undefined) {
    const label = (value ?? "").toUpperCase();

    return (
        DIET_BADGE.find((entry) => label.includes(entry.match))?.className ??
        DEFAULT_BADGE
    );
}