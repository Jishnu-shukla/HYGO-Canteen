"use client";

import { installApiErrorToasts } from "@/utils/apiErrorToasts";
import {
    dismissToast,
    getToastsServerSnapshot,
    getToastsSnapshot,
    subscribeToToasts,
    type Toast,
    type ToastVariant,
} from "@/utils/toast";
import { CircleAlert, CircleCheck, Info, X, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

// Defensive fallback for the unlikely case `instrumentation-client` did not run:
// this module is part of the root bundle, so its top-level code executes before
// any screen's effect fires a request. Idempotent with the instrumentation call.
installApiErrorToasts();

const VARIANT_STYLES: Record<
    ToastVariant,
    { card: string; icon: string; Icon: LucideIcon }
> = {
    error: {
        card: "border-red-200 bg-red-50 text-red-700",
        icon: "text-red-500",
        Icon: CircleAlert,
    },
    success: {
        card: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: "text-emerald-600",
        Icon: CircleCheck,
    },
    info: {
        card: "border-slate-200 bg-white text-slate-700",
        icon: "text-slate-400",
        Icon: Info,
    },
};

/**
 * Renders the global toast stack in the top-right corner. It owns no React
 * context — the store lives outside React so non-component code (the API error
 * interceptor) can push toasts. Mounted once from the root layout; optional
 * children let it also wrap the tree, though nothing reads from it.
 */
export default function ToastProvider({
    children,
}: {
    children?: React.ReactNode;
}) {
    const toasts = useSyncExternalStore(
        subscribeToToasts,
        getToastsSnapshot,
        getToastsServerSnapshot
    );

    return (
        <>
            {children}

            <div
                aria-live="polite"
                aria-atomic="false"
                className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-4 sm:top-4"
            >
                {toasts.map((toast) => (
                    <ToastCard key={toast.id} toast={toast} />
                ))}
            </div>
        </>
    );
}

function ToastCard({ toast }: { toast: Toast }) {
    const { card, icon, Icon } = VARIANT_STYLES[toast.variant];

    return (
        <div
            role={toast.variant === "error" ? "alert" : "status"}
            className={`animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg ${card}`}
        >
            <Icon size={18} className={`mt-0.5 shrink-0 ${icon}`} />

            <p className="min-w-0 flex-1 break-words text-xs font-medium leading-relaxed">
                {toast.message}
            </p>

            <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-60 transition hover:bg-black/5 hover:opacity-100"
            >
                <X size={14} />
            </button>
        </div>
    );
}
