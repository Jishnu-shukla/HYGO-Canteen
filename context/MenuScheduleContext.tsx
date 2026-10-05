"use client";

import { getMenusApi } from "@/data/Menu/api";
import { GeneralMenu, PatientMenu } from "@/data/Menu/type";
import { MenuScheduleContextType } from "@/types/MenuScheduleContextType";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const MenuScheduleContext = createContext<MenuScheduleContextType | undefined>(undefined);

export default function MenuScheduleProvider({ children }: { children: React.ReactNode }) {
    const [patientMenus, setPatientMenus] = useState<PatientMenu[]>([]);
    const [generalMenus, setGeneralMenus] = useState<GeneralMenu[]>([]);
    const [loading, setLoading] = useState(true);

    // Declared inside the effect on purpose: the React Compiler lint rule
    // (react-hooks/set-state-in-effect) flags a component-level loader that
    // closes over setState being invoked from the effect body.
    useEffect(() => {
        const load = async () => {
            try {
                const [patientData, generalData] = await Promise.all([
                    getMenusApi({ type: "patient" }),
                    getMenusApi({ type: "general" }),
                ]);

                setPatientMenus(Array.isArray(patientData) ? patientData : []);
                setGeneralMenus(Array.isArray(generalData) ? generalData : []);
            } catch (error) {
                console.error("Error fetching menus:", error);
                setPatientMenus([]);
                setGeneralMenus([]);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [patientData, generalData] = await Promise.all([
                getMenusApi({ type: "patient" }),
                getMenusApi({ type: "general" }),
            ]);

            setPatientMenus(Array.isArray(patientData) ? patientData : []);
            setGeneralMenus(Array.isArray(generalData) ? generalData : []);
        } catch (error) {
            console.error("Error fetching menus:", error);
            setPatientMenus([]);
            setGeneralMenus([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const MenuScheduleContextValue: MenuScheduleContextType = {
        patientMenus,
        generalMenus,
        loading,
        refresh
    };

    return (
        <MenuScheduleContext.Provider value={MenuScheduleContextValue}>
            {children}
        </MenuScheduleContext.Provider>
    );
}

export const useMenuScheduleContext = () => {
    const context = useContext(MenuScheduleContext);
    if (!context) {
        throw new Error("useMenuScheduleContext must be used within a MenuScheduleProvider");
    }

    return context;
};
