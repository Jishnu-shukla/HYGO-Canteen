"use client";

import { useAccessControl } from "@/context/AccessControlContext";
import { useRoleContext } from "@/context/RoleContext";
import { SETTINGS_PATH } from "@/routes";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Blocks a route the active role may not open. Wrapping `children` in the root
 * layout means the sidebar and the guard always agree, and a screen the role may
 * not open is replaced with a clear explanation instead of leaving a page it
 * shouldn't see.
 *
 * The answer comes from the live matrix — the backend's matrix, or the
 * built-in one until it answers — so a screen withdrawn on the Settings screen
 * is closed here too, without a redeploy.
 *
 * One exception: when the matrix could not be read at all, the Settings screen
 * stays open so it can say so. The fallback has no grant for it, and closing
 * the only screen that explains the refusal would leave the admin staring at
 * "No access" with no reason.
 */
export default function RoleGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname() ?? "/";
    const { canAccessPath, status } = useAccessControl();
    const { role } = useRoleContext();

    // The settings screen is the one place that can explain a matrix the app
    // could not read. When the access-control API refuses this role or is
    // unreachable, the fallback matrix has no grants in it, so the guard would
    // close the very screen that says why. It stays open, read-only, for that
    // case only.
    const explainsUnavailableMatrix =
        pathname === SETTINGS_PATH && status === "error";

    if (canAccessPath(pathname) || explainsUnavailableMatrix) {
        return <>{children}</>;
    }

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
                    This screen is not part of the {role} role. Sign in as a
                    role that may open it, or head back to the dashboard.
                </p>

                {status === "error" && (
                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">
                        <span className="font-semibold">
                            This answer may be stale.
                        </span>{" "}
                        The access list could not be loaded, so the app is
                        checking its built-in defaults rather than the access an
                        admin saved. Ask an admin to confirm your access.
                    </p>
                )}

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
