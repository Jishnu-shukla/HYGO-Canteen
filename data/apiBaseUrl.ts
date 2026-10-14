/**
 * Base URL for every backend request.
 *
 * Read from NEXT_PUBLIC_API_BASE_URL so a deployment can point at its own API
 * without touching the data layer. The NEXT_PUBLIC_ prefix is required: these
 * data modules are imported by client components, so the value has to be
 * inlined into the browser bundle at build time.
 *
 * The fallback (the shared dev tunnel) keeps local development working when no
 * .env is present. Production should always set the variable so the app never
 * silently talks to the tunnel.
 */
const DEV_FALLBACK = "https://4jzhg556-5000.inc1.devtunnels.ms/api";

const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

/** Includes the "/api" prefix; callers append "/<resource>". */
export const API_BASE_URL = (configured || DEV_FALLBACK).replace(/\/+$/, "");
