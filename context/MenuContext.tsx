"use client";

import { getMasterMenuItemsApi } from "@/data/MasterMenu/api";
import { MasterMenuItem } from "@/data/MasterMenu/type";
import { MenuContextType } from "@/types/MenuContextType";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export default function MenuProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<MasterMenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Declared inside the effect on purpose: the React Compiler lint rule
    // (react-hooks/set-state-in-effect) flags a module/component-level loader
    // that closes over setState being invoked from the effect body.
    useEffect(() => {
        const load = async () => {
            try {
                const data = await getMasterMenuItemsApi();
                // The api helper returns undefined on failure, so never hand that to setState.
                setItems(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching master menu items:", error);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getMasterMenuItemsApi();
            setItems(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching master menu items:", error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const MenuContextValue: MenuContextType = {
        items,
        setItems,
        loading,
        refresh
    };

    return (
        <MenuContext.Provider value={MenuContextValue}>
            {children}
        </MenuContext.Provider>
    );
}

export const useMenuContext = () => {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error("useMenuContext must be used within a MenuProvider");
    }

    return context;
};
