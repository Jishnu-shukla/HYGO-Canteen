import { MasterMenuItem } from "@/data/MasterMenu/type"

export type MenuContextType = {
    items: MasterMenuItem[];
    setItems: React.Dispatch<React.SetStateAction<MasterMenuItem[]>>;
    loading: boolean;
    refresh: () => Promise<void>;
}
