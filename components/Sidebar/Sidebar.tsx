"use client";

import {
    ArrowLeftIcon,
    Bell,
    ChartSpline,
    ChefHat,
    ClipboardList,
    Droplets,
    HandPlatter,
    LayoutDashboard,
    ListOrdered,
    type LucideIcon,
    NotepadText,
    Package2,
    ShieldCheck,
    ShoppingBag,
    Soup,
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
    "Enteral / Parenteral": Droplets,
    "Diet Re-evaluation": Bell,
    "Diet Orders": ShoppingBag,
    "Kitchen Schedule": ChefHat,
    "Meal Dispatch": Utensils,
    "Bedside Delivery": Truck,
    "Plate Waste Analytics": ChartSpline,
    "Inventory": Package2,
    "FSSAI Checklist": ShieldCheck,
    "Cafeteria": HandPlatter,
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
            "flex items-center gap-2 p-3 cursor-pointer transition-colors duration-150 w-full text-left text-sm";
        const activeStyle =
            "bg-blue-500 text-white rounded-2xl font-medium border-r-4 border-gray-700";
        const inactiveStyle =
            "text-orange-900 hover:bg-orange-100 hover:text-gray-900";

        return `${baseStyle} ${currentPath === itemPath ? activeStyle : inactiveStyle}`;
    };

    return (
        <div
            className={`${isOpen ? "flex" : "hidden"} h-screen sticky top-0 no-scrollbar w-64 shrink-0 flex-col overflow-auto border-r border-gray-200 bg-white md:flex`}
        >
            <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-300 bg-white p-4">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    aria-label="Go back"
                    className="cursor-pointer text-gray-600 transition hover:text-gray-900"
                >
                    <ArrowLeftIcon size={18} />
                </button>

                <span className="font-medium text-orange-800">Launcher</span>

                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close navigation"
                    className="ml-auto cursor-pointer text-gray-500 transition hover:text-gray-900 md:hidden"
                >
                    <X size={18} />
                </button>
            </header>

            <nav className="flex-1 pb-6">
                {SIDEBAR_ROUTES.map((section) => (
                    <section key={section.section}>
                        <h3 className="p-4 text-xs font-semibold tracking-wider text-orange-400">
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
                                            className={getListItemClass(item.path)}
                                            onClick={() => {
                                                onNavigate?.(item.path);
                                                handleClose();
                                            }}
                                        >
                                            <IconComponent size={18} />
                                            <span>{item.name}</span>
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