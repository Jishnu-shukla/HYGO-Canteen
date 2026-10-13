/**
 * Tiny external store for toast notifications.
 *
 * Deliberately kept outside React: the API layer is plain TypeScript with no
 * hooks, and `instrumentation-client.ts` raises toasts before the React tree has
 * even hydrated. Both sides talk to the same store, which is parked on
 * `globalThis` so it is shared even if the two entry points compile into
 * separate client bundles.
 */

export type ToastVariant = "error" | "success" | "info";

export interface Toast {
    id: number;
    variant: ToastVariant;
    message: string;
}

export interface ShowToastOptions {
    /** Defaults to "error" — the case the global handler raises. */
    variant?: ToastVariant;
    message: string;
    /** Auto-dismiss delay in ms; defaults to AUTO_DISMISS_MS. */
    durationMs?: number;
}

type Listener = () => void;

interface ToastStore {
    toasts: Toast[];
    listeners: Set<Listener>;
    nextId: number;
    timers: Map<number, ReturnType<typeof setTimeout>>;
}

/** Errors linger a little longer than a default because they carry detail. */
const AUTO_DISMISS_MS = 6000;

/** Cap on simultaneously visible toasts; older ones are dropped past this. */
const MAX_TOASTS = 4;

const STORE_KEY = "__canteenToastStore__";

/** Stable empty list for the server snapshot and for "nothing to show". */
const EMPTY_TOASTS: Toast[] = [];

function getStore(): ToastStore {
    const host = globalThis as unknown as Record<string, ToastStore | undefined>;
    const existing = host[STORE_KEY];

    if (existing) return existing;

    const created: ToastStore = {
        toasts: [],
        listeners: new Set(),
        nextId: 1,
        timers: new Map(),
    };

    host[STORE_KEY] = created;

    return created;
}

function emit(store: ToastStore): void {
    for (const listener of store.listeners) {
        listener();
    }
}

/** Raises a toast, auto-dismissing it after `durationMs`. Returns its id. */
export function showToast({
    variant = "error",
    message,
    durationMs = AUTO_DISMISS_MS,
}: ShowToastOptions): number {
    const store = getStore();

    // Collapse an identical toast that is already on screen: refresh its timer
    // instead of stacking a duplicate. Several failing endpoints on one page
    // load would otherwise raise several identical cards.
    const existing = store.toasts.find(
        (toast) => toast.variant === variant && toast.message === message
    );

    if (existing) {
        const previousTimer = store.timers.get(existing.id);

        if (previousTimer !== undefined) clearTimeout(previousTimer);

        store.timers.set(
            existing.id,
            setTimeout(() => dismissToast(existing.id), durationMs)
        );

        return existing.id;
    }

    const id = store.nextId++;

    let nextToasts = [...store.toasts, { id, variant, message }];

    // Keep the stack readable: retire the oldest cards once the cap is reached.
    while (nextToasts.length > MAX_TOASTS) {
        const oldest = nextToasts[0];
        const oldestTimer = store.timers.get(oldest.id);

        if (oldestTimer !== undefined) {
            clearTimeout(oldestTimer);
            store.timers.delete(oldest.id);
        }

        nextToasts = nextToasts.slice(1);
    }

    store.toasts = nextToasts;
    emit(store);

    store.timers.set(
        id,
        setTimeout(() => dismissToast(id), durationMs)
    );

    return id;
}

/** Convenience wrapper for the global API-error path. */
export function showErrorToast(message: string): number {
    return showToast({ variant: "error", message });
}

/** Removes one toast and cancels its dismiss timer. Safe to call twice. */
export function dismissToast(id: number): void {
    const store = getStore();

    const timer = store.timers.get(id);

    if (timer !== undefined) {
        clearTimeout(timer);
        store.timers.delete(id);
    }

    const remaining = store.toasts.filter((toast) => toast.id !== id);

    if (remaining.length === store.toasts.length) return;

    store.toasts = remaining;
    emit(store);
}

/** `useSyncExternalStore` subscription. */
export function subscribeToToasts(listener: Listener): () => void {
    const store = getStore();

    store.listeners.add(listener);

    return () => {
        store.listeners.delete(listener);
    };
}

/** Stable reference between mutations, as `useSyncExternalStore` requires. */
export function getToastsSnapshot(): Toast[] {
    return getStore().toasts;
}

/** Server render has no toasts yet. */
export function getToastsServerSnapshot(): Toast[] {
    return EMPTY_TOASTS;
}
