"use client";

import type { CafeteriaDaySales } from "@/data/Cafeteria/type";
import { Line } from "react-chartjs-2";
import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from "chart.js";
import type { ChartOptions, TooltipItem } from "chart.js";

// Registration is idempotent, so being self-contained here is safe even though
// the dashboard charts already registered a subset of these elements on the
// shared ChartJS. Filler/Line/Point are only used by this chart.
ChartJS.register(
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    Filler,
    Tooltip
);

const EMERALD = "#059669";
const EMERALD_LIGHT = "#10b981";

/** YYYY-MM-DD, the contract's label spelling. Anything else is unplottable. */
const DAY_LABEL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const FULL_DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

const COMPACT_CURRENCY = new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
});

type DayPoint = {
    /** The contract label, kept for the tooltip's full date. */
    label: string;
    /** Local-midnight Date for that label — never shifted through UTC. */
    date: Date;
    /** Day of month, e.g. 1. */
    day: number;
    /** Short month name, e.g. "Oct". */
    month: string;
    value: number;
};

/**
 * Parses a YYYY-MM-DD label into a local Date.
 *
 * Built with the Date constructor from parts rather than Date.parse: an ISO
 * date-only string is read as UTC, which would display as the previous day in
 * any negative-offset timezone. Returns null for a malformed or impossible
 * date (2026-02-31), which the caller drops instead of plotting at a guess.
 */
function parseDayLabel(label: string): DayPoint | null {
    const match = DAY_LABEL_PATTERN.exec(label.trim());

    if (!match) return null;

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);

    if (monthIndex < 0 || monthIndex > 11) return null;

    const date = new Date(year, monthIndex, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== monthIndex ||
        date.getDate() !== day
    ) {
        return null;
    }

    return { label, date, day, month: MONTH_SHORT[monthIndex], value: 0 };
}

/**
 * ₹1,234 or ₹1,234.5 — the ledger stores amounts, so a fractional paisa is
 * shown when it is actually there rather than silently rounded away.
 */
function formatRupees(value: number) {
    return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/**
 * "1 – 31 Oct 2026" for a single month, or both full dates when the payload
 * spans months. Used as the x-axis title, so the range the axis covers is
 * stated even when the tick labels are thinned out.
 */
function formatRange(points: DayPoint[]) {
    if (points.length === 0) return "";
    if (points.length === 1) return FULL_DATE_FORMAT.format(points[0].date);

    const first = points[0];
    const last = points[points.length - 1];
    const sameMonth =
        first.date.getFullYear() === last.date.getFullYear() &&
        first.date.getMonth() === last.date.getMonth();

    if (sameMonth) {
        return `${first.day} – ${last.day} ${last.month} ${last.date.getFullYear()}`;
    }

    return `${FULL_DATE_FORMAT.format(first.date)} – ${FULL_DATE_FORMAT.format(
        last.date
    )}`;
}

/**
 * Line chart of daily cafeteria revenue for one month
 * (GET /api/cafeteria/days).
 *
 * The payload is already ordered and zero-filled by the server, so this
 * component plots it as-is: no reordering, no gap filling, no aggregation.
 * That is what keeps the x-axis continuous — a day with no paid sale is a real
 * point at 0, not a missing tick.
 *
 * Edge ticks carry the month ("1 Oct" … "31 Oct") and the interior is
 * thinned to every fifth day, so the axis states the month's first and last
 * date without 31 overlapping labels. The full range is also the axis title.
 *
 * Revenue is Paid-only by contract (Pending ignored, Refunded contributes 0),
 * so the y scale starts at zero and a fully refunded day sits at 0 rather than
 * dipping negative.
 */
export function CafeteriaRevenueChart({
    days,
    loading = false,
}: {
    days: CafeteriaDaySales[];
    loading?: boolean;
}) {
    const points: DayPoint[] = days
        .map((row) => {
            const point = parseDayLabel(row?.label ?? "");
            if (!point) return null;

            const value = Number(row?.value ?? 0);

            return { ...point, value: Number.isFinite(value) ? value : 0 };
        })
        .filter((point): point is DayPoint => point !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (loading) {
        return (
            <div className="flex h-full min-h-[300px] items-center justify-center">
                <p className="text-sm text-slate-400">Loading chart...</p>
            </div>
        );
    }

    if (points.length === 0) {
        return (
            <div className="flex h-full min-h-[300px] items-center justify-center">
                <p className="text-sm text-slate-400">
                    No cafeteria sales data for this month.
                </p>
            </div>
        );
    }

    const lastIndex = points.length - 1;
    const rangeLabel = formatRange(points);

    const chartData = {
        labels: points.map((point) => point.label),
        datasets: [
            {
                label: "Revenue",
                data: points.map((point) => point.value),
                borderColor: EMERALD,
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 2,
                pointHitRadius: 12,
                pointHoverRadius: 4,
                pointBackgroundColor: EMERALD,
                pointBorderColor: "#ffffff",
                pointBorderWidth: 1,
                pointHoverBackgroundColor: EMERALD_LIGHT,
            },
        ],
    };

    const chartOptions: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items: TooltipItem<"line">[]) => {
                        const point = points[items[0]?.dataIndex ?? 0];

                        return point ? FULL_DATE_FORMAT.format(point.date) : "";
                    },
                    label: (context: TooltipItem<"line">) =>
                        `Revenue: ${formatRupees(context.parsed.y ?? 0)}`,
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: rangeLabel,
                    color: "#64748b",
                    font: { size: 11, weight: "bold" },
                },
                ticks: {
                    color: "#64748b",
                    font: { size: 9 },
                    maxRotation: 0,
                    autoSkip: false,
                    // First and last day carry the month; the rest are thinned to
                    // every fifth day so the labels never collide.
                    callback: (_tickValue, index) => {
                        const point = points[index];
                        if (!point) return "";

                        if (index === 0 || index === lastIndex) {
                            return `${point.day} ${point.month}`;
                        }

                        return index % 5 === 0 ? String(point.day) : "";
                    },
                },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: "revenue",
                    color: "#64748b",
                    font: { size: 11, weight: "bold" },
                },
                ticks: {
                    color: "#64748b",
                    font: { size: 10 },
                    callback: (value: string | number) =>
                        `₹${COMPACT_CURRENCY.format(Number(value))}`,
                },
                grid: { color: "#e2e8f0" },
            },
        },
    };

    return (
        <div className="relative h-full w-full min-h-[300px]">
            <Line data={chartData} options={chartOptions} />
        </div>
    );
}
