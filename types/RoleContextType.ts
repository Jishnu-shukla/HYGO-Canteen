import type { Role } from "@/Roles";

export type RoleContextType = {
    /** Role currently selected in the header; drives sidebar + page access. */
    role: Role;
    /** Switches the active role. */
    setRole: (role: Role) => void;
};
