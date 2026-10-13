import { installApiErrorToasts } from "@/utils/apiErrorToasts";

/**
 * Next.js client instrumentation: runs after the document loads but before
 * React hydration, so the global API error interceptor is in place before any
 * screen issues its first request.
 *
 * Synchronous top-level work only is guaranteed to complete before hydration,
 * which is exactly what the (synchronous) install below is.
 */
installApiErrorToasts();
