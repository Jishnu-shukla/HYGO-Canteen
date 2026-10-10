"use client";

import {
    ChartSpline,
    ChefHat,
    ClipboardList,
    HandPlatter,
    LayoutDashboard,
    ListOrdered,
    type LucideIcon,
    NotepadText,
    Package2,
    ShieldCheck,
    ShoppingBag,
    Soup,
    Table2,
    TriangleAlert,
    Truck,
    Utensils,
    Wrench,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_ROUTES, SIDEBAR_TOGGLE_ID, type RouteItem } from "../../routes";

// 1. Map route names to Lucide Icon components
export const ICON_MAP: Record<string, LucideIcon> = {
    "Dashboard": LayoutDashboard,
    "Nutritional Assessments": NotepadText,
    "Diet Plan Builder": Wrench,
    "Allergen & Preference": TriangleAlert,
    "Diet Orders": ShoppingBag,
    "Kitchen Schedule": ChefHat,
    "Meal Dispatch": Utensils,
    "Bedside Delivery": Truck,
    "Plate Waste Analytics": ChartSpline,
    "Inventory": Package2,
    "FSSAI Checklist": ShieldCheck,
    "Cafeteria": HandPlatter,
    "Tables": Table2,
    // Screens added on top of the reference list
    "Recipes": Soup,
    "Menu": ClipboardList,
    "Master Menu": ListOrdered,
};

interface SidebarProps {
    /**
     * Overrides the internally resolved pathname. Optional — the sidebar
     * reads `usePathname()` on its own when this is not provided.
     */
    activePath?: string;
    /** Optional imperative navigation hook, called after a link click. */
    onNavigate?: (path: string) => void;
    /** Hides the sidebar. Used when rendering a collapsed rail. */
    isOpen?: boolean;
    /**
     * Called when a nav item is clicked. Falls back to unchecking the
     * layout's toggle, which is what closes the CSS-driven mobile drawer.
     */
    onClose?: () => void;
}

export default function Sidebar({
    activePath,
    onNavigate,
    isOpen = true,
    onClose,
}: SidebarProps) {
    const pathname = usePathname();
    const currentPath = activePath ?? pathname ?? "/";

    const handleClose = () => {
        if (onClose) {
            onClose();
            return;
        }

        const toggle = document.getElementById(
            SIDEBAR_TOGGLE_ID
        ) as HTMLInputElement | null;

        if (toggle) toggle.checked = false;
    };

    const getListItemClass = (itemPath: string) => {
        const baseStyle =
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150";
        const activeStyle = "bg-orange-100/80 font-semibold text-orange-900";
        const inactiveStyle =
            "text-slate-600 hover:bg-orange-50 hover:text-orange-900";

        return `${baseStyle} ${
            currentPath === itemPath ? activeStyle : inactiveStyle
        }`;
    };

    return (
        <div
            className={`${isOpen ? "flex" : "hidden"} h-screen sticky top-0 no-scrollbar w-64 shrink-0 flex-col overflow-auto border-r border-slate-200 bg-white md:flex`}
        >
            {/* Brand header — the launcher back-arrow row is gone; this now
                matches the orange brand carried by the top app bar. */}
            <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-orange-100 bg-white px-4 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                    <Utensils size={18} />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-orange-900">
                        CANTEEN MANAGEMENT
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                        Kitchen &amp; Nutrition Hub
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close navigation"
                    className="ml-auto cursor-pointer text-slate-400 transition hover:text-slate-700 md:hidden"
                >
                    <X size={18} />
                </button>
            </header>

            <nav className="flex-1 pb-6">
                {SIDEBAR_ROUTES.map((section, sectionIndex) => (
                    <section key={section.section}>
                        <h3
                            className={`px-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 ${
                                sectionIndex === 0 ? "pt-2" : "pt-5"
                            }`}
                        >
                            {section.section}
                        </h3>

                        <ul>
                            {section.items.map((item: RouteItem) => {
                                // Dynamic Icon resolution falling back to
                                // LayoutDashboard if undefined
                                const IconComponent =
                                    ICON_MAP[item.name] || LayoutDashboard;

                                const isActive = currentPath === item.path;

                                return (
                                    <li key={item.path} className="px-2">
                                        <Link
                                            href={item.path}
                                            aria-current={
                                                isActive ? "page" : undefined
                                            }
                                            className={getListItemClass(
                                                item.path
                                            )}
                                            onClick={() => {
                                                onNavigate?.(item.path);
                                                handleClose();
                                            }}
                                        >
                                            <IconComponent
                                                size={17}
                                                className={
                                                    isActive
                                                        ? "text-orange-600"
                                                        : "text-slate-400"
                                                }
                                            />
                                            <span className="truncate">
                                                {item.name}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </nav>
        </div>
    );
}