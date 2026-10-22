"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "@/utils/authSession";

/**
 * Sends signed-out visitors to /login.
 *
 * Mounted inside the (app) shell layout, so every launcher screen sits behind
 * it while /login itself stays open. It renders children either way — the
 * redirect happens in an effect, which avoids a blank frame on a cold load.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        if (!getAuthSession()) {
            router.replace("/login");
        }
    }, [router]);

    return <>{children}</>;
}
