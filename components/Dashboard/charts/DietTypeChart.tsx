"use client";

import { Doughnut } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
} from "chart.js";

import {  Bar } from "react-chartjs-2";

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement
);

interface MealData {
    label?: string;
    value?: number,
    // count?: number;
    // total?: number;
    // orders?: number;
}

interface DietTypeChartProps {
    data?: MealData[];
}

export default function DietTypeChart({
    data = [],
}: DietTypeChartProps) {

    const normalizedData = data.map((item) => ({
        label:
            item.label ??
            "Unknown",

        value:
            Number(
                item.value ??
                0
            ),
    }));

    const total = normalizedData.reduce(
        (sum, item) => sum + item.value,
        0
    );

    const chartData = {
        labels: normalizedData.map(
            (item) => item.label
        ),

        datasets: [
            {
                data: normalizedData.map(
                    (item) => item.value
                ),

                backgroundColor: [
                    "#123B9B",
                    "#8B5CF6",
                    "#3B82F6",
                    "#06B6D4",
                    "#1D4ED8",
                ],

                borderColor: "#ffffff",

                borderWidth: 3,

                hoverOffset: 6,
            },
        ],
    };

    const chartOptions = {
        responsive: true,

        maintainAspectRatio: false,

        cutout: "62%",

        plugins: {
            legend: {
                position: "bottom" as const,

                labels: {
                    usePointStyle: true,

                    pointStyle: "rect",

                    padding: 14,

                    font: {
                        size: 11,
                    },
                },
            },

            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        return ` ${context.label}: ${context.raw}`;
                    },
                },
            },
        },
    };

    /* Empty state */

    if (normalizedData.length === 0 || total === 0) {
        return (
            <div className="h-[260px] flex items-center justify-center">

                <div className="relative w-40 h-40">

                    <div className="w-full h-full rounded-full border-[28px] border-slate-100 flex items-center justify-center">

                        <div className="text-center">
                            <p className="text-xl font-bold text-slate-400">
                                0
                            </p>

                            <p className="text-xs text-slate-400">
                                Orders
                            </p>
                        </div>

                    </div>

                </div>

            </div>
        );
    }

    return (
        <div className="h-[260px] relative">

            <Doughnut
                data={chartData}
                options={chartOptions}
            />

            {/* Center text */}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                <div className="text-center">

                    <p className="text-2xl font-bold text-amber-950">
                        {total}
                    </p>

                    <p className="text-xs text-slate-500">
                        Orders
                    </p>

                </div>

            </div>

        </div>
    );
}