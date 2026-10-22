/**
 * Base URL for the auth service (hms-auth-service), which runs on its own
 * port — it is not behind the canteen backend's /api prefix.
 *
 * Read from NEXT_PUBLIC_AUTH_API_BASE_URL so a deployment can point at its
 * own auth service without touching the data layer. The NEXT_PUBLIC_ prefix
 * is required: the login page is a client component, so the value has to be
 * inlined into the browser bundle at build time.
 */
const DEV_FALLBACK = "http://localhost:8091";

const configured = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.trim();

/** No "/api" prefix; callers append "/auth/<action>". */
export const AUTH_API_BASE_URL = (configured || DEV_FALLBACK).replace(
    /\/+$/,
    ""
);
