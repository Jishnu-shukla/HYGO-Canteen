"use client";

import getDashboardDataApi, { getDashboardOrdersWithComplianceApi } from "@/data/Dashboard/api";
import { useEffect, useMemo, useState } from "react";
import DietTypeChart from "@/components/Dashboard/charts/DietTypeChart";
import OrdersByWardChart from "@/components/Dashboard/charts/OrdersByWardChart";
import { WardMealBoard } from "@/components/Dashboard/charts/WardMealBoard";

export default function Dashboard() {
    const [data, setData] = useState<Idashboard>();
    const [orders, setOrders] = useState<IdashboardOrders>();
    const [loading, setLoading] = useState(false);

    const getData = async () => {
        setLoading(true);

        try {
            const dashboardData = await getDashboardDataApi();
            setData(dashboardData);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getDashboardOrders = async () => {
        setLoading(true);

        try {
            const dashboardData = await getDashboardOrdersWithComplianceApi();
            setOrders(dashboardData);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getData();
        getDashboardOrders();
    }, []);

    // ---------------------------------------------------------
    // Dashboard values
    // ---------------------------------------------------------

    const mealData = orders?.diet_types ?? [];

    const totalMealOrders = data?.today_meal_orders ?? 0;
    const lowIntakeCount = data?.low_intake_patients ?? 0;
    const pendingOrders = data?.pending_orders ?? 0;
    const dispatchedToday = data?.orders_dispatched_today ?? 0;
    const cafeteriaSales = data?.cafeteria_sales ?? 0;
    const cafeteriaTransactions =
        data?.cafeteria_sales ?? 0;
    const fssaiScore = data?.fssai_hygiene ?? 0;

    // ---------------------------------------------------------
    // Meal chart data
    // ---------------------------------------------------------
    console.log(mealData)

    const normalizedMealData = useMemo(() => {
        if (!Array.isArray(mealData)) return [];

        return mealData.map((item: {label: string, value: number}) => ({
            label: item?.label ?? "Meal",
            value: Number(item?.value ?? 0),
        }));
    }, [mealData]);

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            {/* Header */}
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                            Kitchen & Nutrition Hub
                        </h1>

                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            SERVICE
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-amber-800/80">
                        Ward meal flow, diet mix, and FSSAI compliance for
                        inpatient catering.
                    </p>
                </div>

                <button
                    type="button"
                    className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                    New Diet Order
                </button>
            </section>

            {/* Summary cards */}
            <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <DashboardCard
                    title="PENDING ORDERS"
                    value={pendingOrders}
                    valueClassName="text-amber-600"
                />

                <DashboardCard
                    title="DISPATCHED TODAY"
                    value={dispatchedToday}
                    valueClassName="text-amber-600"
                    subtitle={`${totalMealOrders} active orders`}
                />

                <DashboardCard
                    title="LOW INTAKE"
                    value={lowIntakeCount}
                    valueClassName="text-amber-600"
                    subtitle="Review needed"
                    subtitleClassName="text-red-500"
                />

                <DashboardCard
                    title="FSSAI ISSUES"
                    value={fssaiScore}
                    valueClassName="text-amber-600"
                    subtitle={`${fssaiScore}% premises score`}
                    subtitleClassName="text-red-500"
                />

                <DashboardCard
                    title="CAFETERIA TODAY"
                    value={`₹${Number(cafeteriaSales).toLocaleString("en-IN")}`}
                    valueClassName="text-amber-600"
                    subtitle={`${cafeteriaTransactions} transactions`}
                />
            </section>

            {/* Charts */}
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3">
                        <h2 className="text-base font-semibold text-slate-800">
                            Meal Type Distribution
                        </h2>
                        <p className="text-sm text-slate-500">
                            Today's meal orders by meal slot
                        </p>
                    </div>

                    <div className="min-h-[320px]">
                        <DietTypeChart data={normalizedMealData} />
                    </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3">
                        <h2 className="text-base font-semibold text-slate-800">
                            Orders by Ward
                        </h2>
                        <p className="text-sm text-slate-500">
                            Ward-wise order distribution
                        </p>
                    </div>

                    <div className="min-h-80]">
                        <OrdersByWardChart
                            data={orders?.meal_orders ?? []}
                        />
                    </div>
                </div>
            </section>

            <section>
                {/* Ward Meal Board */}
                <WardMealBoard
                    orders={orders?.meal_orders ?? []}
                />
            </section>

            {loading && (
                <div className="mt-3 text-center text-xs text-slate-500">
                    Updating dashboard...
                </div>
            )}
        </main>
    );
}

type DashboardCardProps = {
    title: string;
    value: string | number;
    subtitle?: string;
    valueClassName?: string;
    subtitleClassName?: string;
};

function DashboardCard({
    title,
    value,
    subtitle,
    valueClassName = "text-slate-800",
    subtitleClassName = "text-slate-500",
}: DashboardCardProps) {
    return (
        <div className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
            <p className="text-[11px] font-semibold tracking-wide text-amber-700">
                {title}
            </p>

            <p
                className={`mt-1 text-2xl font-semibold leading-none ${valueClassName}`}
            >
                {value}
            </p>

            {subtitle && (
                <p className={`mt-2 text-xs font-medium ${subtitleClassName}`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}
