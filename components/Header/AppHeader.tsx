"use client";

import { LogOut, Search, UserCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SIDEBAR_ROUTES } from "../../routes";

const DEFAULT_ROLE = "Dietician";

/**
 * Resolves the sidebar section + page for the current route, so the header
 * reads as "where am I" rather than repeating the brand that the sidebar
 * already shows. Falls back to the dashboard when the route is unknown.
 */
function findPageContext(pathname: string): {
    section: string;
    page: string;
} {
    for (const section of SIDEBAR_ROUTES) {
        const item = section.items.find((entry) => entry.path === pathname);

        if (item) return { section: section.section, page: item.name };
    }

    return { section: "Overview", page: "Dashboard" };
}

/**
 * Application-wide header shown on every route. The layout mounts this after
 * the mobile drawer toggle so it's always visible.
 */
export default function AppHeader() {
    const pathname = usePathname() ?? "/";
    const { section, page } = findPageContext(pathname);

    const [search, setSearch] = useState("");

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // TODO: Wire to patient/order lookup when backend is ready
    };

    const handleLogout = () => {
        // TODO: Wire logout flow when auth is integrated
    };

    return (
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 md:px-5 md:py-3">
                {/* Page context — a slim breadcrumb of where the user is. The
                    eyebrow is the sidebar section, the title the page name. */}
                <div className="flex min-w-0 flex-col">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        {section}
                    </span>

                    <h1 className="truncate text-sm font-semibold text-slate-800 sm:text-base">
                        {page}
                    </h1>
                </div>

                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 md:gap-3">
                    {/* Patient/order search */}
                    <form
                        onSubmit={handleSearchSubmit}
                        className="relative flex w-full max-w-[240px] items-center md:w-auto md:flex-1 md:max-w-[320px] lg:max-w-[380px]"
                    >
                        <label htmlFor="global-patient-search" className="sr-only">
                            Search patient details regarding orders
                        </label>
                        <Search
                            size={16}
                            className="absolute left-2.5 text-slate-400"
                        />
                        <input
                            id="global-patient-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search patient/order details..."
                            className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                    </form>

                    {/* User profile + role */}
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 sm:px-3">
                        <UserCircle size={20} className="text-orange-600 sm:size-5" />
                        <span className="hidden text-xs font-medium text-slate-600 sm:inline">
                            {DEFAULT_ROLE}
                        </span>
                        <span className="text-xs font-medium text-slate-600 sm:hidden">
                            Role
                        </span>
                    </div>

                    {/* Logout */}
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 sm:px-3"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </header>
    );
}