"use client";

import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
} from "chart.js";

import { Doughnut} from "react-chartjs-2";

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement
);

interface WardData {
    ward?: string;
    ward_name?: string;
    name?: string;

    meal_slot?: string;

    count?: number;
    total?: number;
    orders?: number;
}

interface OrdersByWardChartProps {
    data?: dashboardOrder[];
}

export default function OrdersByWardChart({
    data = [],
}: OrdersByWardChartProps) {

    const normalizedData = data.map((item) => ({
        label:
            item.ward_name.label ??
            "Unknown",

        value:
            Number(
                item.ward_name.value ??
                0
            ),
    }));

    const chartData = {
        labels: normalizedData.map(
            (item) => item.label
        ),

        datasets: [
            {
                label: "Orders",

                data: normalizedData.map(
                    (item) => item.value
                ),

                backgroundColor: "#d97706",

                borderRadius: 5,

                borderSkipped: false,

                barThickness: 20,
            },
        ],
    };

    const chartOptions = {
        responsive: true,

        maintainAspectRatio: false,

        indexAxis: "y" as const,

        plugins: {
            legend: {
                display: false,
            },

            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        return ` Orders: ${context.raw}`;
                    },
                },
            },
        },

        scales: {
            x: {
                beginAtZero: true,

                ticks: {
                    precision: 0,

                    color: "#64748b",

                    font: {
                        size: 10,
                    },
                },

                grid: {
                    color: "#e2e8f0",
                },
            },

            y: {
                ticks: {
                    color: "#64748b",

                    font: {
                        size: 11,
                    },
                },

                grid: {
                    display: false,
                },
            },
        },
    };

    /* Empty state */

    if (normalizedData.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">

                <p className="text-sm text-slate-400">
                    No ward data available
                </p>

            </div>
        );
    }

    return (
        <div className="relative w-full h-[320px]">

            <Bar
                data={chartData}
                options={chartOptions}
            />

        </div>
    );
}