"use client";

import { DEFAULT_ROLE, isRole, type Role } from "@/Roles";
import type { RoleContextType } from "@/types/RoleContextType";
import {
    createContext,
    useContext,
    useSyncExternalStore,
} from "react";

const STORAGE_KEY = "canteen.role";

/**
 * Tiny external store for the picked role. Reading storage through
 * useSyncExternalStore — instead of mirroring it into state with an effect —
 * keeps the server-rendered default and the client value in sync with no
 * hydration mismatch and no cascading render.
 */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
    listeners.add(onStoreChange);
    window.addEventListener("storage", onStoreChange);

    return () => {
        listeners.delete(onStoreChange);
        window.removeEventListener("storage", onStoreChange);
    };
}

function getSnapshot(): Role {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return isRole(stored) ? stored : DEFAULT_ROLE;
    } catch {
        // Storage can be unavailable (private mode); fall back to the default.
        return DEFAULT_ROLE;
    }
}

function getServerSnapshot(): Role {
    return DEFAULT_ROLE;
}

function writeRole(role: Role): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, role);
    } catch {
        // Persisting is a nice-to-have, never a reason to fail a switch.
    }

    listeners.forEach((listener) => listener());
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

/**
 * Holds the active role for the whole app. Mounted in the root layout, so the
 * header picker, the sidebar and the route guard all read the same value and
 * can never disagree about who the user is.
 */
export default function RoleProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const role = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    const setRole = (next: Role) => {
        if (isRole(next)) writeRole(next);
    };

    return (
        <RoleContext.Provider value={{ role, setRole }}>
            {children}
        </RoleContext.Provider>
    );
}

export const useRoleContext = () => {
    const context = useContext(RoleContext);

    if (!context) {
        throw new Error("useRoleContext must be used within a RoleProvider");
    }

    return context;
};
