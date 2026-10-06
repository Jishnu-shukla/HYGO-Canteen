"use client";

import type { PlateWasteDietType } from "@/data/PlateWaste/type";
import { Bar } from "react-chartjs-2";
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    LinearScale,
    Tooltip,
} from "chart.js";
import type { ChartOptions, TooltipItem } from "chart.js";

// Registration is idempotent, so being self-contained here is safe even though
// the dashboard charts already registered these elements on the shared ChartJS.
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/**
 * 62.34 -> "62.34%", 62 -> "62%". Trailing fractional zeros (62.10) collapse
 * so the tooltip shows the mean at the precision it carries.
 */
function formatPercent(value: number) {
    return `${Number(value.toFixed(2)).toString()}%`;
}

const AMBER = "#d97706";
const AMBER_LIGHT = "#f59e0b";

/**
 * Vertical bar chart of mean intake per diet type (GET /api/platewaste/diettype).
 *
 * The server already computes the two-stage per-patient mean and sorts rows
 * worst-first, so this component renders the payload as-is — no reordering or
 * aggregation, which keeps the chart's order stable between calls.
 *
 * The y scale is clamped at 100 because the value is a percentage of a tray;
 * lifting the ceiling to hug some local maximum would visually exaggerate how
 * far short of a full plate the intake falls.
 */
export function PlateWasteDietTypeChart({
    dietTypes,
    loading = false,
}: {
    dietTypes: PlateWasteDietType[];
    loading?: boolean;
}) {
    const data = dietTypes.map((item) => ({
        label: item.label ?? "Unknown",
        value: Number(item.value ?? 0),
    }));

    if (loading) {
        return (
            <div className="flex h-full min-h-[300px] items-center justify-center">
                <p className="text-sm text-slate-400">Loading chart...</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex h-full min-h-[300px] items-center justify-center">
                <p className="text-sm text-slate-400">
                    No plate waste data yet.
                </p>
            </div>
        );
    }

    const chartData = {
        labels: data.map((item) => item.label),
        datasets: [
            {
                label: "Intake",
                data: data.map((item) => item.value),
                backgroundColor: AMBER,
                hoverBackgroundColor: AMBER_LIGHT,
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 40,
            },
        ],
    };

    const chartOptions: ChartOptions<"bar"> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<"bar">) =>
                        `Intake: ${formatPercent(context.parsed.y ?? 0)}`,
                },
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "diet type",
                    color: "#64748b",
                    font: { size: 11, weight: "bold" },
                },
                ticks: {
                    color: "#64748b",
                    font: { size: 9 },
                },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                max: 100,
                title: {
                    display: true,
                    text: "intake percentage",
                    color: "#64748b",
                    font: { size: 11, weight: "bold" },
                },
                ticks: {
                    color: "#64748b",
                    font: { size: 10 },
                    callback: (value: string | number) => `${value}%`,
                },
                grid: { color: "#e2e8f0" },
            },
        },
    };

    return (
        <div className="relative h-full w-full min-h-[300px]">
            <Bar data={chartData} options={chartOptions} />
        </div>
    );
}