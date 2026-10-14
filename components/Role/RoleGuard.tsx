"use client";

import { canAccessPath } from "../../Roles";
import { useRoleContext } from "../../context/RoleContext";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Blocks a route the active role may not open. Wrapping `children` in the root
 * layout means switching role in the header filters the sidebar and, if the
 * current screen is off-limits, replaces it with a clear explanation instead of
 * leaving a page the role shouldn't see.
 */
export default function RoleGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname() ?? "/";
    const { role } = useRoleContext();

    if (canAccessPath(role, pathname)) return <>{children}</>;

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <ShieldAlert size={22} />
                </div>

                <h2 className="mt-4 text-base font-semibold text-slate-800">
                    No access for {role}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    This screen is not part of the {role} role. Switch role from
                    the header, or head back to the dashboard.
                </p>

                <Link
                    href="/"
                    className="mt-5 inline-flex items-center justify-center rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
}
