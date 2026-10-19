import type { GetTableTransactionDetailsItem } from "@/data/Cafeteria/type";

/**
 * What a table's earlier KOTs already sent to the kitchen.
 *
 * The GET /api/cafeteria/table response is cumulative — items_purchased holds
 * every order on the open tab, oldest first. The first KOT therefore prints
 * the whole tab, but every later KOT must print only what is NEW, so we keep
 * a snapshot of the quantities already printed and diff against it.
 *
 * Persisted in localStorage (keyed by the TBL-… table id) because the tab
 * outlives any single React tree and may be printed from more than one click
 * in a session. A settle clears it (see clearKotSnapshot) so the next
 * customer's tab starts a fresh KOT series.
 */
export interface KotSnapshot {
    /** 1-based KOT number within the current open tab. */
    kotNumber: number;
    /** item_id → quantity already printed on earlier KOTs for this tab. */
    printed: Record<string, number>;
}

const STORAGE_KEY = "cafeteria-kot-snapshots";

type SnapshotMap = Record<string, KotSnapshot>;

function readAll(): SnapshotMap {
    if (typeof window === "undefined") return {};

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};

        const parsed: unknown = JSON.parse(raw);
        if (parsed === null || typeof parsed !== "object") return {};

        return parsed as SnapshotMap;
    } catch {
        // Corrupt storage or a blocked localStorage — fall back to
        // "no snapshot", which simply prints the full tab again.
        return {};
    }
}

function writeAll(map: SnapshotMap): void {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
        // Storage full/unavailable — the KOT still prints, just without memory.
    }
}

/** The table's KOT snapshot, or null when no KOT has been printed yet. */
export function loadKotSnapshot(tableId: string): KotSnapshot | null {
    const snapshot = readAll()[tableId];
    if (!snapshot || typeof snapshot !== "object") return null;
    if (typeof snapshot.kotNumber !== "number") return null;

    return {
        kotNumber: snapshot.kotNumber,
        printed: snapshot.printed ?? {},
    };
}

/**
 * Records the tab as it stands after printing KOT `kotNumber`: the next KOT
 * diffs against these quantities. `items` is the FULL cumulative tab, not
 * just the lines that were printed.
 */
export function saveKotSnapshot(
    tableId: string,
    kotNumber: number,
    items: GetTableTransactionDetailsItem[]
): void {
    const printed: Record<string, number> = {};

    for (const item of items) {
        printed[item.item_id] = item.quantity;
    }

    const map = readAll();
    map[tableId] = { kotNumber, printed };
    writeAll(map);
}

/** Forgets a table's KOT history — call when the tab is settled/cleared. */
export function clearKotSnapshot(tableId: string): void {
    const map = readAll();
    if (!(tableId in map)) return;

    delete map[tableId];
    writeAll(map);
}

/**
 * The lines of `items` that have not been sent to the kitchen yet, with each
 * quantity reduced by whatever the snapshot already recorded.
 *
 * - No snapshot → the first KOT of the tab → the full list, unchanged.
 * - New item_id → printed in full.
 * - Already printed → only the excess quantity survives; items whose
 *   quantity did not grow (or were removed from the tab) drop out entirely.
 */
export function diffKotItems(
    snapshot: KotSnapshot | null,
    items: GetTableTransactionDetailsItem[]
): GetTableTransactionDetailsItem[] {
    if (!snapshot) return items;

    return items
        .map((item) => {
            const alreadyPrinted = snapshot.printed[item.item_id] ?? 0;
            const delta = item.quantity - alreadyPrinted;

            if (delta <= 0) return null;

            return { ...item, quantity: delta };
        })
        .filter((item): item is GetTableTransactionDetailsItem => item !== null);
}
