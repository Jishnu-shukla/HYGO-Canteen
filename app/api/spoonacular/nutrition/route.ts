import { NextResponse } from "next/server";

/**
 * Server-side proxy for Spoonacular's nutrition widget.
 *
 * GET /recipes/{id}/nutritionWidget.json reports amounts per the recipe's
 * serving, with the values the form's fields need spread across a `nutrients`
 * array. They are mapped by name here and rounded to whole numbers — the
 * form's <input type="number"> steps by 1, so a 6.2 would fail validation.
 * The API key stays on the server (see the search proxy for why).
 */

const SPOONACULAR_BASE = "https://api.spoonacular.com";

type Nutrient = {
    name: string;
    amount: number;
};

/** Whole-number amount for a named nutrient, or 0 when it is absent. */
function nutrientAmount(nutrients: Nutrient[], name: string): number {
    const match = nutrients.find(
        (nutrient) => nutrient.name.toLowerCase() === name.toLowerCase()
    );

    return match ? Math.round(match.amount) : 0;
}

export async function GET(request: Request) {
    const apiKey = process.env.SPOONACULAR_API_KEY;
    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";

    if (!apiKey) {
        return NextResponse.json(
            { error: "SPOONACULAR_API_KEY is not configured." },
            { status: 500 }
        );
    }

    if (!/^\d+$/.test(id)) {
        return NextResponse.json(
            { error: "A numeric Spoonacular recipe id is required." },
            { status: 400 }
        );
    }

    const url = new URL(`${SPOONACULAR_BASE}/recipes/${id}/nutritionWidget.json`);
    url.searchParams.set("apiKey", apiKey);

    try {
        const response = await fetch(url, { cache: "no-store" });
        const text = await response.text();

        if (!response.ok) {
            console.log(
                `spoonacular nutrition failed: ${response.status} ${response.statusText}`,
                text
            );
            return NextResponse.json(
                { error: `Spoonacular nutrition failed (${response.status}).` },
                { status: response.status }
            );
        }

        const parsed = JSON.parse(text) as {
            calories?: number | string;
            nutrients?: Nutrient[];
        };

        const nutrients = parsed.nutrients ?? [];

        // Fall back to the top-level calories figure when the nutrient list is
        // missing; it is the one top-level value that is already a plain number.
        const calories = nutrients.length
            ? nutrientAmount(nutrients, "Calories")
            : Math.round(Number(parsed.calories) || 0);

        return NextResponse.json({
            nutrition: {
                calories,
                protein: nutrientAmount(nutrients, "Protein"),
                carbs: nutrientAmount(nutrients, "Carbohydrates"),
                fat: nutrientAmount(nutrients, "Fat"),
                fiber: nutrientAmount(nutrients, "Fiber"),
                sodium: nutrientAmount(nutrients, "Sodium"),
                sugar: nutrientAmount(nutrients, "Sugar"),
                // The backend field is spelled "cholestrol"; keep the mapping
                // in one place so the typo is deliberate, not repeated.
                cholestrol: nutrientAmount(nutrients, "Cholesterol"),
            },
        });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Could not reach Spoonacular." },
            { status: 502 }
        );
    }
}
