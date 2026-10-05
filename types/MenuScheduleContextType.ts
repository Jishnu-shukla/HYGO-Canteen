import { GeneralMenu, PatientMenu } from "@/data/Menu/type"

export type MenuScheduleContextType = {
    patientMenus: PatientMenu[];
    generalMenus: GeneralMenu[];
    loading: boolean;
    refresh: () => Promise<void>;
}
