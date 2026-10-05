"use client";

import { LogOut, Search, UserCircle } from "lucide-react";
import { useState } from "react";

const DEFAULT_ROLE = "Dietician";

/**
 * Application-wide header shown on every route. The layout mounts this after
 * the mobile drawer toggle so it's always visible.
 */
export default function AppHeader() {
    const [search, setSearch] = useState("");

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // TODO: Wire to patient/order lookup when backend is ready
    };

    const handleLogout = () => {
        // TODO: Wire logout flow when auth is integrated
    };

    return (
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 md:px-4 md:py-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden md:flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-orange-500/80">
                            Module Name
                        </span>
                        <h1 className="truncate text-base font-semibold text-orange-900 sm:text-lg">
                            CANTEEN MANAGEMENT
                        </h1>
                    </div>

                    {/* Mobile compact title */}
                    <div className="flex flex-col md:hidden">
                        <span className="text-[10px] uppercase tracking-wider text-orange-500/80">
                            Module
                        </span>
                        <h1 className="truncate text-sm font-semibold text-orange-900">
                            CANTEEN MANAGEMENT
                        </h1>
                    </div>
                </div>

                <div className="flex flex-1 flex-wrap items-center justify-end gap-2 md:gap-3">
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
                            className="absolute left-2.5 text-gray-400"
                        />
                        <input
                            id="global-patient-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search patient/order details..."
                            className="w-full rounded-full border border-gray-300 bg-gray-50 pl-8 pr-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </form>

                    {/* User profile + role */}
                    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-sm sm:px-3">
                        <UserCircle
                            size={20}
                            className="text-orange-700 sm:size-5"
                        />
                        <span className="hidden text-xs font-medium text-gray-700 sm:inline">
                            {DEFAULT_ROLE}
                        </span>
                        <span className="text-xs font-medium text-gray-700 sm:hidden">
                            Role
                        </span>
                    </div>

                    {/* Logout */}
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 sm:px-3"
                    >
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </header>
    );
}