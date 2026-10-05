"use client";

import { LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";
import { findRouteByPath } from "../../routes";
import { ICON_MAP } from "./Sidebar";

/**
 * Renders the sidebar icon for a route name. Kept as a plain helper (not a
 * component) so no component is created inside another component's render.
 */
function renderRouteIcon(name: string | undefined, size: number) {
    const Icon = ICON_MAP[name ?? ""] ?? LayoutDashboard;

    return <Icon size={size} />;
}

/**
 * Temporary landing screen for sidebar routes whose feature has not been
 * built yet. Reads its own title/description/icon from the active route so
 * every stub page stays a one-liner.
 */
export default function PlaceholderScreen() {
    const pathname = usePathname();
    const route = findRouteByPath(pathname ?? "");

    return (
        <main className="min-h-screen w-full bg-slate-50 p-3 md:p-4">
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            {renderRouteIcon(route?.name, 21)}
                        </div>

                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-medium text-amber-800 md:text-3xl">
                                {route?.name ?? "Coming soon"}
                            </h1>

                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                SERVICE
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-sm text-amber-800/70">
                        {route?.description ??
                            "This module is planned and will be available soon."}
                    </p>
                </div>

                <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                    Under construction
                </span>
            </section>

            <section className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    {renderRouteIcon(route?.name, 26)}
                </div>

                <p className="mt-4 text-base font-medium text-gray-900">
                    {route?.name ?? "This screen"} is being built
                </p>

                <p className="mt-1 max-w-md text-sm text-gray-500">
                    The navigation is wired up and ready. Replace this page with
                    the real feature when it lands.
                </p>
            </section>
        </main>
    );
}