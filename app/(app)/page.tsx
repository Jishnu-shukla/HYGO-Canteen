import Dashboard from "./dashboard/page";

/**
 * Home route ("/" -> "Dashboard" in SIDEBAR_ROUTES).
 *
 * The navigation hierarchy lives in `routes.ts` and the sidebar rail is
 * mounted once in `app/layout.tsx`, so every route shares the same nav.
 */
export default function App() {
    return <Dashboard />;
}