import { installApiErrorToasts } from "@/utils/apiErrorToasts";
import { installAuthFetch } from "@/utils/authFetchInterceptor";

/**
 * Next.js client instrumentation: runs after the document loads but before
 * React hydration, so the global fetch interceptors are in place before any
 * screen issues its first request.
 *
 * Install order matters. Auth goes first so it is the inner wrapper: the error
 * toasts wrap it, meaning a request whose 401 is transparently refreshed and
 * replayed returns a successful response to the toast layer and never raises a
 * spurious "token required" notification. Only a 401 that survives the retry
 * (a genuinely dead refresh token) reaches the toast layer.
 *
 * Synchronous top-level work only is guaranteed to complete before hydration,
 * which is exactly what the (synchronous) installs below are.
 */
installAuthFetch();
installApiErrorToasts();
