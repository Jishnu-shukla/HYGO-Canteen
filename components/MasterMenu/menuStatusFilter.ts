import { MasterMenuItem } from "@/data/MasterMenu/type";

// Local to the filter UI — MasterMenuItem models approval as a boolean, so the
// filter keys are derived here rather than in data/MasterMenu/type.ts.
export type MenuStatusFilter = "all" | "approved" | "pending";

export const MENU_STATUS_FILTERS: {
    key: MenuStatusFilter;
    label: string;
    matches: (item: MasterMenuItem) => boolean;
}[] = [
    { key: "all", label: "All", matches: () => true },
    { key: "approved", label: "Approved", matches: (item) => item.is_approved },
    { key: "pending", label: "Pending", matches: (item) => !item.is_approved },
];

export function matchesMenuStatus(
    item: MasterMenuItem,
    filter: MenuStatusFilter
): boolean {
    return MENU_STATUS_FILTERS.find((f) => f.key === filter)!.matches(item);
}
