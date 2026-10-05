export interface MasterMenuSummary {
    total_menu_items: number;
    approved_recipes: number;
    pending_approvals: number;
}

export interface MasterMenuItem {
    recipe_name: string;
    nutritional_info: {
        cal: number;
    };
    preparation_time: number;
    is_approved: boolean;
    approved_by: string | null;
    price: number;
    master_item_id: string;
    recipe_id: string;
}