export default async function getDashboardDataApi() {
    try {
        const data = await fetch('https://4jzhg556-5000.inc1.devtunnels.ms/api/dashboard');
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
} 
export async function getDashboardOrdersWithComplianceApi() {
    try {
        const data = await fetch('https://4jzhg556-5000.inc1.devtunnels.ms/api/dashboard/orders');
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
} 