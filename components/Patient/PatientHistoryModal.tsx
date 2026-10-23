"use client";

import {
    SEVERITY_BADGE,
    SEVERITY_LABEL,
    UNKNOWN_SEVERITY_BADGE,
} from "@/components/AllergyPref/allergyPrefLabels";
import {
    CONSISTENCY_LABEL,
    DIET_TYPE_LABEL,
    PLAN_STATUS_BADGE,
    PLAN_STATUS_LABEL,
    TEXTURE_LABEL,
    UNKNOWN_STATUS_BADGE,
} from "@/components/DietPlan/dietPlanLabels";
import {
    STATUS_BADGE,
    STATUS_LABEL,
    mealBadge,
} from "@/components/DietOrder/orderStatus";
import { getPatientHistoryApi } from "@/data/Patient/api";
import { AT_RISK_THRESHOLD } from "@/data/Assessment/type";
import type {
    GetPatientHistoryResponse,
    PatientDietOrderHistoryItem,
    PatientHistoryRecipe,
    PatientMealOrderHistoryItem,
    PatientPlateWasteHistoryItem,
} from "@/data/Patient/type";
import { RefreshCw, Utensils, X } from "lucide-react";
import { useEffect, useState } from "react";

const DASH = "—";

/**
 * Full clinical and catering timeline for one patient.
 *
 * Opened from a row of PatientTable and fed GET /api/patients/:uhid, which
 * returns every section already scoped to the patient and ordered newest
 * first. The modal keeps the contract's order — orders, plans, allergies,
 * assessments, plate waste — so the most operational records read first.
 */
export default function PatientHistoryModal({
    uhid,
    onClose,
}: {
    uhid: string;
    onClose: () => void;
}) {
    const [history, setHistory] = useState<GetPatientHistoryResponse | null>(
        null
    );

    // Starts true so the mount fetch needs no synchronous setState.
    const [isLoading, setIsLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    // Escape closes, matching the other modals in the app.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    useEffect(() => {
        // Only the async result path touches state, so the rule against
        // synchronous setState in an effect body stays satisfied.
        let active = true;

        const load = async () => {
            const data = await getPatientHistoryApi(uhid);

            if (!active) return;

            setHistory(data);
            setLoadFailed(data === null);
            setIsLoading(false);
        };

        load();

        return () => {
            active = false;
        };
    }, [uhid]);

    const handleRetry = async () => {
        setIsLoading(true);
        setLoadFailed(false);

        const data = await getPatientHistoryApi(uhid);

        setHistory(data);
        setLoadFailed(data === null);
        setIsLoading(false);
    };

    const patient = history?.patient;

    const stats = history
        ? [
              { label: "Diet orders", value: history.diet_orders.length },
              { label: "Meal orders", value: history.meal_orders.length },
              { label: "Diet plans", value: history.diet_plans.length },
              { label: "Allergy records", value: history.allergies.length },
              {
                  label: "Assessments",
                  value: history.nutritional_assessments.length,
              },
              {
                  label: "Plate waste",
                  value: history.plate_waste_analytics.length,
              },
          ]
        : [];

    const hasAnyHistory = stats.some((stat) => stat.value > 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="patient-history-title"
                className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-amber-50/70 px-5 py-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Patient History
                        </p>

                        <h2
                            id="patient-history-title"
                            className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-800"
                        >
                            <span className="truncate">
                                {patient?.name || "Patient"}
                            </span>

                            <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                {patient?.uhid || uhid}
                            </span>

                            {patient?.isDeleted && (
                                <span className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                    Deleted
                                </span>
                            )}
                        </h2>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <span>
                                {patient
                                    ? patient.age === null
                                        ? "Age not recorded"
                                        : `${patient.age} yrs`
                                    : DASH}
                            </span>

                            <span aria-hidden="true" className="text-slate-300">
                                •
                            </span>

                            <span>{patient?.gender || DASH}</span>

                            <span aria-hidden="true" className="text-slate-300">
                                •
                            </span>

                            <span>{patient?.bloodGroup || DASH}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close patient history"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-14 animate-pulse rounded-xl bg-slate-100"
                                />
                            ))}
                        </div>
                    ) : loadFailed || !history ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                            <p className="text-sm font-semibold text-slate-600">
                                Could not load this patient&apos;s history.
                            </p>

                            <p className="text-xs text-slate-400">
                                The record may have been removed, or the
                                server did not answer.
                            </p>

                            <button
                                type="button"
                                onClick={handleRetry}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                                <RefreshCw size={14} />
                                Try again
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Section counts, so the shape of the history is
                                visible before scrolling. */}
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                                {stats.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2"
                                    >
                                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                            {stat.label}
                                        </p>

                                        <p className="text-lg font-semibold text-slate-700">
                                            {stat.value}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {!hasAnyHistory ? (
                                <div className="flex flex-col items-center gap-1 py-14 text-center">
                                    <p className="text-sm font-semibold text-slate-600">
                                        No history recorded yet
                                    </p>

                                    <p className="text-xs text-slate-400">
                                        Orders, plans, allergies and
                                        assessments will appear here as they
                                        are filed.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <HistorySection
                                        title="Diet Orders"
                                        hint="Prescribed meals raised against a diet plan"
                                        count={history.diet_orders.length}
                                    >
                                        {history.diet_orders.length === 0 ? (
                                            <EmptyRow>
                                                No diet orders recorded.
                                            </EmptyRow>
                                        ) : (
                                            <MealBoard
                                                orders={history.diet_orders}
                                                renderOrder={(order) => (
                                                    <DietOrderCard
                                                        key={order.order_id}
                                                        order={order}
                                                    />
                                                )}
                                            />
                                        )}
                                    </HistorySection>

                                    <HistorySection
                                        title="Meal Orders"
                                        hint="Regular meal orders for patients without a diet plan"
                                        count={history.meal_orders.length}
                                    >
                                        {history.meal_orders.length === 0 ? (
                                            <EmptyRow>
                                                No meal orders recorded.
                                            </EmptyRow>
                                        ) : (
                                            <MealBoard
                                                orders={history.meal_orders}
                                                renderOrder={(order) => (
                                                    <MealOrderCard
                                                        key={
                                                            order.meal_order_id
                                                        }
                                                        order={order}
                                                    />
                                                )}
                                            />
                                        )}
                                    </HistorySection>

                                    <HistorySection
                                        title="Diet Plans"
                                        hint="Therapeutic prescriptions, newest first"
                                        count={history.diet_plans.length}
                                    >
                                        {history.diet_plans.length === 0 ? (
                                            <EmptyRow>
                                                No diet plans recorded.
                                            </EmptyRow>
                                        ) : (
                                            <ul className="space-y-2">
                                                {history.diet_plans.map(
                                                    (plan) => (
                                                        <DietPlanCard
                                                            key={
                                                                plan.diet_plan_id
                                                            }
                                                            plan={plan}
                                                        />
                                                    )
                                                )}
                                            </ul>
                                        )}
                                    </HistorySection>

                                    <HistorySection
                                        title="Allergies & Dietary Preferences"
                                        hint="Allergens with their recorded severity, plus intolerances"
                                        count={history.allergies.length}
                                    >
                                        {history.allergies.length === 0 ? (
                                            <EmptyRow>
                                                No allergy preferences recorded.
                                            </EmptyRow>
                                        ) : (
                                            <ul className="space-y-2">
                                                {history.allergies.map(
                                                    (pref) => (
                                                        <AllergyCard
                                                            key={
                                                                pref.allergy_preference_id
                                                            }
                                                            pref={pref}
                                                        />
                                                    )
                                                )}
                                            </ul>
                                        )}
                                    </HistorySection>

                                    <HistorySection
                                        title="Nutritional Assessments"
                                        hint="Screening scores and feeding targets"
                                        count={
                                            history.nutritional_assessments
                                                .length
                                        }
                                    >
                                        {history.nutritional_assessments
                                            .length === 0 ? (
                                            <EmptyRow>
                                                No nutritional assessments
                                                recorded.
                                            </EmptyRow>
                                        ) : (
                                            <ul className="space-y-2">
                                                {history.nutritional_assessments.map(
                                                    (assessment) => (
                                                        <AssessmentCard
                                                            key={
                                                                assessment.assessment_id
                                                            }
                                                            assessment={
                                                                assessment
                                                            }
                                                        />
                                                    )
                                                )}
                                            </ul>
                                        )}
                                    </HistorySection>

                                    <HistorySection
                                        title="Plate Waste"
                                        hint="How much of each served meal was eaten"
                                        count={
                                            history.plate_waste_analytics.length
                                        }
                                    >
                                        {history.plate_waste_analytics.length ===
                                        0 ? (
                                            <EmptyRow>
                                                No plate-waste logs recorded.
                                            </EmptyRow>
                                        ) : (
                                            <ul className="space-y-2">
                                                {history.plate_waste_analytics.map(
                                                    (log, index) => (
                                                        <PlateWasteCard
                                                            key={`${log.createdAt}-${index}`}
                                                            log={log}
                                                        />
                                                    )
                                                )}
                                            </ul>
                                        )}
                                    </HistorySection>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                    <p className="text-[11px] text-slate-400">
                        {isLoading
                            ? "Loading history..."
                            : history
                              ? "Every section ordered newest first"
                              : "History not loaded"}
                    </p>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ *
 * Section shell
 * ------------------------------------------------------------------ */

function HistorySection({
    title,
    hint,
    count,
    children,
}: {
    title: string;
    hint: string;
    count: number;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                <div>
                    <h3 className="text-sm font-semibold text-slate-700">
                        {title}
                    </h3>

                    <p className="text-[11px] text-slate-400">{hint}</p>
                </div>

                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                    {count}
                </span>
            </div>

            <div className="bg-white px-4 py-3">{children}</div>
        </section>
    );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
    return (
        <p className="py-2 text-center text-[11px] text-slate-400">
            {children}
        </p>
    );
}

/** Compact label/value pair for the metadata line under a card's heading. */
function Meta({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <span className="inline-flex items-baseline gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                {label}
            </span>

            <span className="text-[11px] text-slate-600">{children}</span>
        </span>
    );
}

/** The four meal-type columns, mirroring the dashboard's board treatment. */
const MEAL_BOARD_COLUMNS = ["Breakfast", "Lunch", "Snack", "Dinner"] as const;

type MealBoardColumn = (typeof MEAL_BOARD_COLUMNS)[number];

/**
 * The Ward Meal Board layout, columned by meal type instead of status.
 *
 * Four columns are always shown so the board keeps a stable shape even when a
 * patient has no order for that meal. Any unexpected meal type in the data is
 * appended as an extra column rather than being silently dropped.
 */
function MealBoard<T extends { meal_type: string }>({
    orders,
    renderOrder,
}: {
    orders: T[];
    renderOrder: (order: T) => React.ReactNode;
}) {
    const extras = Array.from(
        new Set(
            orders
                .map((order) => order.meal_type)
                .filter(
                    (meal) =>
                        meal !== "" &&
                        !MEAL_BOARD_COLUMNS.includes(meal as MealBoardColumn)
                )
        )
    );

    const columns: string[] = [...MEAL_BOARD_COLUMNS, ...extras];

    return (
        // One row, always: every meal type is its own column and the columns
        // share the available width instead of wrapping at narrow sizes. On a
        // small screen the row scrolls rather than stacking.
        <div className="grid auto-cols-[minmax(190px,1fr)] grid-flow-col gap-2 overflow-x-auto pb-1">
            {columns.map((meal) => {
                const rows = orders.filter(
                    (order) => order.meal_type === meal
                );

                return (
                    <div
                        key={meal}
                        className="min-h-[190px] overflow-hidden rounded-xl border border-blue-100 bg-slate-50"
                    >
                        <div className="border-b border-blue-100 bg-blue-50 px-3 py-2">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold tracking-wide text-amber-700">
                                    {meal.toUpperCase()}
                                </p>

                                <span className="text-[10px] font-semibold text-slate-500">
                                    ({rows.length})
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 p-2">
                            {rows.length === 0 ? (
                                <div className="flex min-h-[140px] items-center justify-center">
                                    <span className="text-xs text-slate-400">
                                        Empty
                                    </span>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {rows.map(renderOrder)}
                                </ul>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/** Resolved recipe lines; quantity is only shown when it is more than one. */
function ItemChips({ items }: { items: PatientHistoryRecipe[] }) {
    // The API normalizes this to an array; the guard keeps a malformed row
    // from crashing the whole modal.
    const entries = Array.isArray(items) ? items : [];

    if (entries.length === 0) {
        return (
            <p className="mt-1.5 text-[11px] text-slate-400">
                No items recorded.
            </p>
        );
    }

    return (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
            {entries.map((item) => (
                <span
                    key={item.master_item_id}
                    title={item.master_item_id}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-900 shadow-sm"
                >
                    <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                    />

                    {item.recipe_name || "Unnamed recipe"}

                    {item.quantity > 1 && (
                        <span className="rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-700">
                            ×{item.quantity}
                        </span>
                    )}
                </span>
            ))}
        </div>
    );
}

function StatusChip({ status }: { status: string }) {
    return (
        <span
            title={status}
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                STATUS_BADGE[status as keyof typeof STATUS_BADGE] ??
                "bg-slate-100 text-slate-700"
            }`}
        >
            {STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status}
        </span>
    );
}

/* ------------------------------------------------------------------ *
 * Cards, one per row type
 * ------------------------------------------------------------------ */

function DietOrderCard({ order }: { order: PatientDietOrderHistoryItem }) {
    const dietLabel = order.diet_type
        ? (DIET_TYPE_LABEL[
              order.diet_type as keyof typeof DIET_TYPE_LABEL
          ] ?? order.diet_type)
        : null;

    return (
        <li className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p
                        title={order.order_id}
                        className="truncate text-xs font-bold text-slate-800"
                    >
                        {order.order_id}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                        {order.ward_name || "Unknown Ward"} • Bed{" "}
                        {order.bed_number || DASH}
                    </p>
                </div>

                {order.is_special && (
                    <span className="shrink-0 rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-bold text-orange-600">
                        SPECIAL
                    </span>
                )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${mealBadge(
                        order.meal_type
                    )}`}
                >
                    {order.meal_type.toUpperCase()}
                </span>

                <StatusChip status={order.status} />

                <span className="text-[9px] text-slate-400">
                    {formatDate(order.scheduled_date)}
                </span>
            </div>

            {/* The food itself is the point of the record, so it gets the
                strongest colour on the card. */}
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-1.5">
                <p className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-emerald-700">
                    <Utensils size={10} />
                    Items served
                </p>

                <ItemChips items={order.items} />
            </div>

            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
                <Meta label="Source">{order.order_source || DASH}</Meta>

                {dietLabel && <Meta label="Diet">{dietLabel}</Meta>}
            </div>

            {order.special_instruction && (
                <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] leading-relaxed text-amber-800">
                    <span className="mr-1 text-[8px] font-bold uppercase tracking-wide">
                        Instruction
                    </span>

                    {order.special_instruction}
                </p>
            )}

            {order.status === "Cancelled_Order" &&
                order.cancellation_reason && (
                    <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[10px] leading-relaxed text-red-600">
                        <span className="mr-1 text-[8px] font-bold uppercase tracking-wide">
                            Cancelled
                        </span>

                        {order.cancellation_reason}
                    </p>
                )}
        </li>
    );
}

function MealOrderCard({ order }: { order: PatientMealOrderHistoryItem }) {
    return (
        <li className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p
                        title={order.meal_order_id}
                        className="truncate text-xs font-bold text-slate-800"
                    >
                        {order.meal_order_id}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                        {order.ward_name || "Unknown Ward"} • Bed{" "}
                        {order.bed_number || DASH}
                    </p>
                </div>

                {order.is_special && (
                    <span className="shrink-0 rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-bold text-orange-600">
                        SPECIAL
                    </span>
                )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${mealBadge(
                        order.meal_type
                    )}`}
                >
                    {order.meal_type.toUpperCase()}
                </span>

                <StatusChip status={order.status} />

                <span className="text-[9px] text-slate-400">
                    {formatDate(order.scheduled_date)}
                </span>
            </div>

            {/* The food itself is the point of the record, so it gets the
                strongest colour on the card. */}
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-1.5">
                <p className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-emerald-700">
                    <Utensils size={10} />
                    Items served
                </p>

                <ItemChips items={order.items} />
            </div>

            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
                <Meta label="Source">{order.order_source || DASH}</Meta>

                {order.delivered_at && (
                    <Meta label="Delivered">
                        {formatDateTime(order.delivered_at)}
                    </Meta>
                )}
            </div>

            {order.special_instruction && (
                <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] leading-relaxed text-amber-800">
                    <span className="mr-1 text-[8px] font-bold uppercase tracking-wide">
                        Instruction
                    </span>

                    {order.special_instruction}
                </p>
            )}

            {order.status === "Cancelled_Order" &&
                order.cancellation_reason && (
                    <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[10px] leading-relaxed text-red-600">
                        <span className="mr-1 text-[8px] font-bold uppercase tracking-wide">
                            Cancelled
                        </span>

                        {order.cancellation_reason}
                    </p>
                )}
        </li>
    );
}

function DietPlanCard({
    plan,
}: {
    plan: GetPatientHistoryResponse["diet_plans"][number];
}) {
    const status = plan.status;

    return (
        <li className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-700">
                        {plan.diet_plan_id}
                    </span>

                    <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            PLAN_STATUS_BADGE[status] ?? UNKNOWN_STATUS_BADGE
                        }`}
                    >
                        {PLAN_STATUS_LABEL[status] ?? status}
                    </span>
                </div>

                <span className="text-[11px] text-slate-500">
                    {formatDate(plan.start_date)}
                    {" → "}
                    {plan.end_date ? formatDate(plan.end_date) : "Open-ended"}
                </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <Meta label="Diet">
                    {DIET_TYPE_LABEL[plan.diet_type] ?? plan.diet_type}
                </Meta>

                <Meta label="Texture">
                    {TEXTURE_LABEL[plan.texture_modification] ??
                        plan.texture_modification}
                </Meta>

                <Meta label="Liquids">
                    {CONSISTENCY_LABEL[plan.consistencies_liquids] ??
                        plan.consistencies_liquids}
                </Meta>
            </div>
        </li>
    );
}

function AllergyCard({
    pref,
}: {
    pref: GetPatientHistoryResponse["allergies"][number];
}) {
    // Legacy rows can arrive with scalar allergies/intolerances. The API
    // normalizes them, but guarding here means one odd record degrades to
    // "no allergens recorded" instead of crashing the modal.
    const allergens = Array.isArray(pref.allergies) ? pref.allergies : [];
    const intolerances = Array.isArray(pref.intolerances)
        ? pref.intolerances
        : [];

    return (
        <li className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-700">
                    {pref.allergy_preference_id}
                </span>

                {pref.religious_dietary_restrictions && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                        {pref.religious_dietary_restrictions}
                    </span>
                )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
                {allergens.length === 0 ? (
                    <span className="text-[11px] text-slate-400">
                        No allergens recorded.
                    </span>
                ) : (
                    allergens.map((allergy, index) => (
                        <span
                            key={`${allergy.name}-${index}`}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600"
                        >
                            {allergy.name || "Unnamed allergen"}

                            <span
                                className={`rounded-full px-1.5 text-[9px] font-bold ${
                                    SEVERITY_BADGE[allergy.severity] ??
                                    UNKNOWN_SEVERITY_BADGE
                                }`}
                            >
                                {SEVERITY_LABEL[allergy.severity] ??
                                    allergy.severity}
                            </span>
                        </span>
                    ))
                )}
            </div>

            {intolerances.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {intolerances.map((intolerance, index) => (
                        <span
                            key={`${intolerance}-${index}`}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500"
                        >
                            {intolerance}
                        </span>
                    ))}
                </div>
            )}
        </li>
    );
}

function AssessmentCard({
    assessment,
}: {
    assessment: GetPatientHistoryResponse["nutritional_assessments"][number];
}) {
    const score = assessment.nutritional_risk_score;

    const risk =
        score === null
            ? "unscored"
            : score >= AT_RISK_THRESHOLD
              ? "at-risk"
              : "low";

    const riskBadge = {
        "at-risk": "bg-red-100 text-red-700",
        low: "bg-emerald-50 text-emerald-700",
        unscored: "bg-slate-100 text-slate-500",
    }[risk];

    return (
        <li className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-700">
                        {assessment.assessment_id}
                    </span>

                    <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${riskBadge}`}
                    >
                        NRS {score ?? DASH}
                    </span>
                </div>

                <span className="text-[11px] text-slate-500">
                    {formatDate(assessment.assessment_date)}
                </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <Meta label="BMI">{formatNumber(assessment.bmi, 2)}</Meta>

                <Meta label="Calories">
                    {formatNumber(assessment.daily_caloric_target_kcal)}
                </Meta>

                <Meta label="Route">
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {assessment.route_of_feeding}
                    </span>
                </Meta>
            </div>

            {assessment.clinical_notes && (
                <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                    {assessment.clinical_notes}
                </p>
            )}
        </li>
    );
}

function PlateWasteCard({ log }: { log: PatientPlateWasteHistoryItem }) {
    const tone =
        log.intake_percentage >= 75
            ? { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" }
            : log.intake_percentage >= 50
              ? { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700" }
              : { bar: "bg-red-500", badge: "bg-red-50 text-red-700" };

    const width = Math.min(100, Math.max(0, log.intake_percentage));

    return (
        <li className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}
                >
                    {log.intake_percentage}% intake
                </span>

                <span className="text-[11px] text-slate-500">
                    {formatDateTime(log.createdAt)}
                </span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full ${tone.bar}`}
                    style={{ width: `${width}%` }}
                />
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <Meta label="Ward">{log.ward_name || DASH}</Meta>
                <Meta label="Reason">{log.rejection_reason || DASH}</Meta>
            </div>

            {log.notes && (
                <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                    {log.notes}
                </p>
            )}
        </li>
    );
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

/** "2026-10-02T00:00:00.000Z" -> "02 Oct 2026". Falls back to the raw string. */
function formatDate(value: string | null | undefined) {
    if (!value) return DASH;

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

/** ISO timestamp -> "02 Oct 2026, 14:05". Falls back to the raw string. */
function formatDateTime(value: string | null | undefined) {
    if (!value) return DASH;

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Null is missing data, not zero, so it renders as a dash. `digits` is used
 * for BMI, which the assessments table also shows to two decimals.
 */
function formatNumber(value: number | null, digits = 0) {
    return value === null
        ? DASH
        : value.toLocaleString(undefined, {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
          });
}
