export async function getMasterMenuItemsApi() {
    try {
        const data = await fetch('https://4jzhg556-5000.inc1.devtunnels.ms/api/mastermenu');
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}

// Only price and approval are editable; the rest of MasterMenuItem is read-only.
export type UpdateMasterMenuItem = {
    price: number;
    is_approved: boolean;
};

export async function updateMasterMenuItemApi(
    master_item_id: string,
    payload: UpdateMasterMenuItem
) {
    try {
        const data = await fetch(
            `https://4jzhg556-5000.inc1.devtunnels.ms/api/mastermenu/${master_item_id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}
