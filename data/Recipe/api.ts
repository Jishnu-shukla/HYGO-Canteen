export async function getAllRecipesApi() {
    try {
        const data = await fetch('https://4jzhg556-5000.inc1.devtunnels.ms/api/recipe');
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
} 

export async function createRecipeApi(recipe: RecipeItem) {
    try {
        const data = await fetch('https://4jzhg556-5000.inc1.devtunnels.ms/api/recipe', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(recipe)
        });
        const jsonData = await data.json();
        console.log(jsonData);
        return jsonData.data;
    } catch (error) {
        console.log(error);
    }
}