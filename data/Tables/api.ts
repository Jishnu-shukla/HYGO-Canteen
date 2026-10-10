import type { AddTableBody, AddTableResponse, TableDetails } from "./type";

const BASE_URL = "https://4jzhg556-5000.inc1.devtunnels.ms/api/table";

/**
 * Outcome of a table registration.
 *
 * A form must show WHY the backend refused — it names the reason, and a
 * duplicate table_number arrives as a 409 with one — so failures carry a
 * displayable message instead of collapsing to null.
 */
export type AddTableResult =
    | { ok: true; table: AddTableResponse }
    | { ok: false; error: string };

/**
 * Pulls the backend's own message out of a failed response. This route
 * answers errors as { message, data: null, status: false } (observed live),
 * not the { statusCode, message, success } envelope the other routes use —
 * either way `message` carries the reason. Non-JSON bodies fall back to the
 * status so the form never shows a blank error.
 */
function readErrorMessage(text: string, status: number): string {
    try {
        const parsed = JSON.parse(text) as { message?: unknown };

        if (typeof parsed.message === "string" && parsed.message !== "") {
            return parsed.message;
        }
    } catch {
        // Not JSON — the status fallback below carries the error.
    }

    return `Request failed with status ${status}.`;
}

/**
 * POST /api/table — register a table into the TableOrder collection.
 *
 * The contract defines the response's data object (AddTableResponse) but not
 * its envelope siblings, and the error side was observed as
 * { message, data, status } rather than the usual success flag. So this reads
 * `data` when it is an object and otherwise treats the body as the table
 * itself, then requires the two fields the QR screen cannot work without —
 * table_id and qrcodeurl — before calling it a success.
 */
export async function addTableApi(
    body: AddTableBody
): Promise<AddTableResult> {
    try {
        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();

        if (!response.ok) {
            console.log(
                `addTableApi failed: ${response.status} ${response.statusText}`
            );
            return { ok: false, error: readErrorMessage(text, response.status) };
        }

        const parsed = JSON.parse(text) as Record<string, unknown>;
        const payload = (
            typeof parsed.data === "object" && parsed.data !== null
                ? parsed.data
                : parsed
        ) as AddTableResponse;

        if (
            typeof payload.table_id !== "string" ||
            typeof payload.qrcodeurl !== "string"
        ) {
            console.log("addTableApi: unexpected success payload", text);
            return {
                ok: false,
                error: "The server answered, but without the QR link — the table may still have been registered.",
            };
        }

        return { ok: true, table: payload };
    } catch (error) {
        console.log(error);
        return {
            ok: false,
            error: "Could not reach the server — the table was not registered.",
        };
    }
}

export async function getTablesApi(): Promise<TableDetails[] | null> {
    try {
        const response = await fetch(BASE_URL);
        if (!response.ok) {
            console.log(
                `getTablesApi failed: ${response.status} ${response.statusText}`
            );
            return null;
        }
        const jsonData = await response.json();
        const payload = jsonData.data;
        if (Array.isArray(payload)) {
            return payload as TableDetails[];
        }
        if (payload && Array.isArray(payload.data)) {
            return payload.data as TableDetails[];
        }
        return payload as TableDetails[];
    } catch (error) {
        console.log(error);
        return null;
    }
}
