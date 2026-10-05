interface Idashboard {
    pending_orders: number,
    orders_dispatched_today: number,
    today_meal_orders: number,
    low_intake_patients: number,
    fssai_hygiene: number,
    cafeteria_sales: number,
    kitchen_alerts: {
      pending_orders: number,
      special_orders: number,
      low_intake_patients: number
    }
}

interface IdashboardOrders {
    meal_orders: dashboardOrder[],
    diet_types: {
        label: string,
        value: number
    }
    fssai_compliance: dashboardFssaiCompliance[] 
}

interface dashboardOrder {
    order_id: string,
    patient_id: {
        name: string,
    }
    ward_name: {
        label: string,
        value: number
    },
    meal_type: {
        label: string,
        value: number
    },
    status: string,
}

interface dashboardFssaiCompliance{
    hygine_score: number,
    pest_control_checked: string,
    water_potability_tested: string,
    staff_hygine_compliance: string
}