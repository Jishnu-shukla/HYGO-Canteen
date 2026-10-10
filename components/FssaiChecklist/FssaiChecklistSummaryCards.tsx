import type { FssaichecklistSummary } from "@/data/FssaiChecklist/type";
import { BadgeCheck, ShieldCheck, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type SummaryCardProps = {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    value: number;
    helper: string;
    loading?: boolean;
    valueClassName?: string;
    children?: ReactNode;
};

function SummaryCard({
    icon: Icon,
    label,
    value,
    helper,
    loading = false,
    valueClassName = "text-slate-800",
    children,
}: SummaryCardProps) {
    return (
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Icon size={19} />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                    Audit
                </span>
            </div>

            <p
                className={`mt-4 text-2xl font-semibold leading-none ${valueClassName}`}
            >
                {loading ? "-" : value.toLocaleString()}
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>

            <p className="mt-0.5 text-[10px] text-slate-400">{helper}</p>

            {children}
        </div>
    );
}

/**
 * Formats the hygiene score's helper text.
 *
 * 0 carries two readings by contract — a genuine score of zero, or "no
 * checklist filed yet" — and nothing in the payload distinguishes them, so
 * the card says so instead of claiming to know which.
 */
function formatScoreHelper(score: number, loading: boolean): string {
    if (loading) return "Latest audit score";

    if (score === 0) {
        return "0 = a real score of zero, or no audit filed yet";
    }

    return "Latest audit score, most recent checklist";
}

/**
 * Share of all checks recorded, or null when nothing has been filed.
 * Null rather than 0 so an empty denominator never renders as a real 0%.
 */
function shareOf(part: number, whole: number) {
    if (!whole) return null;

    return Math.round((part / whole) * 100);
}

/**
 * Slim bar under a subset card, showing the count as a share of all checks.
 * passed and failed nest in the contract's own invariant
 * (passed + failed = 5 × checklists), so the two bars share the same
 * denominator and always sum to ~100%.
 */
function ShareBar({
    percent,
    tone,
}: {
    percent: number | null;
    tone: string;
}) {
    return (
        <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="presentation"
        >
            {percent !== null && percent > 0 && (
                <div
                    className={`h-full rounded-full ${tone}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            )}
        </div>
    );
}

/**
 * The three headline cards for GET /api/fssaichecklist/summary.
 *
 * hygiene_score is the standalone current standing and gets no bar, while the
 * two category counts share one denominator — the contract's 5-check-per-audit
 * invariant — so each is drawn as a slice of that total. Shares round
 * independently, which is why the footnote states the exact invariant rather
 * than "pairs sum to 100%".
 */
export function FssaiChecklistSummaryCards({
    summary,
    loading = false,
}: {
    summary: FssaichecklistSummary | null;
    loading?: boolean;
}) {
    const score = summary?.hygiene_score ?? 0;
    const passed = summary?.passed_categories ?? 0;
    const failed = summary?.failed_categories ?? 0;

    const totalChecks = passed + failed;
    const passedShare = shareOf(passed, totalChecks);
    const failedShare = shareOf(failed, totalChecks);

    return (
        <section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <SummaryCard
                    icon={ShieldCheck}
                    label="Hygiene Score"
                    value={score}
                    helper={formatScoreHelper(score, loading)}
                    loading={loading}
                />

                <SummaryCard
                    icon={BadgeCheck}
                    label="Checks Passed"
                    value={passed}
                    valueClassName="text-emerald-600"
                    helper={
                        loading
                            ? "Checks passed across every audit"
                            : passedShare === null
                              ? "No audits filed yet."
                              : `${passedShare}% of all checks passed`
                    }
                    loading={loading}
                >
                    <ShareBar percent={passedShare} tone="bg-emerald-500" />
                </SummaryCard>

                <SummaryCard
                    icon={TriangleAlert}
                    label="Checks Failed"
                    value={failed}
                    valueClassName="text-red-500"
                    helper={
                        loading
                            ? "Checks failed across every audit"
                            : failedShare === null
                              ? "No audits filed yet."
                              : `${failedShare}% of all checks failed`
                    }
                    loading={loading}
                >
                    <ShareBar percent={failedShare} tone="bg-red-500" />
                </SummaryCard>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-400">
                Passed + failed = 5 checks per audit, across every checklist
                filed.
            </p>
        </section>
    );
}