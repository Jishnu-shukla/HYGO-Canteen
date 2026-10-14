import { NextResponse } from "next/server";

/**
 * Server-side proxy for Spoonacular's recipe search.
 *
 * Spoonacular needs its API key on every call, and the key lives in
 * SPOONACULAR_API_KEY (.env) which Next.js only exposes on the server. So the
 * browser calls this route and the key is added here — it is never shipped to
 * the client. GET /recipes/complexSearch is the source; only id/title/image
 * are passed on, which is all the recipe-name dropdown needs.
 */

const SPOONACULAR_BASE = "https://api.spoonacular.com";

type ComplexSearchResult = {
    id: number;
    title: string;
    image?: string;
};

export async function GET(request: Request) {
    const apiKey = process.env.SPOONACULAR_API_KEY;
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    if (!apiKey) {
        return NextResponse.json(
            { error: "SPOONACULAR_API_KEY is not configured." },
            { status: 500 }
        );
    }

    // Two characters is the shortest search worth a round trip; the client
    // also waits for a debounce before calling.
    if (query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    const url = new URL(`${SPOONACULAR_BASE}/recipes/complexSearch`);
    url.searchParams.set("query", query);
    url.searchParams.set("number", "8");
    url.searchParams.set("apiKey", apiKey);

    try {
        const response = await fetch(url, { cache: "no-store" });
        const text = await response.text();

        if (!response.ok) {
            console.log(
                `spoonacular search failed: ${response.status} ${response.statusText}`,
                text
            );
            return NextResponse.json(
                { error: `Spoonacular search failed (${response.status}).` },
                { status: response.status }
            );
        }

        const parsed = JSON.parse(text) as {
            results?: ComplexSearchResult[];
        };

        return NextResponse.json({
            results: (parsed.results ?? []).map((result) => ({
                id: result.id,
                title: result.title,
                image: result.image ?? "",
            })),
        });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Could not reach Spoonacular." },
            { status: 502 }
        );
    }
}
