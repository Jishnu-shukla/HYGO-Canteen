"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import loginApi, { AuthApiError } from "@/data/Auth/api";
import { getAuthSession, saveAuthSession } from "@/utils/authSession";
import { useRoleContext } from "@/context/RoleContext";

/**
 * Full-screen sign-in (`/login`).
 *
 * Lives outside the `(app)` route group, so it renders without the launcher
 * shell (sidebar, header, role guard). Submitting authenticates against
 * hms-auth-service, stores the tokens + role, mirrors the role into the
 * RoleContext (which the sidebar and RoleGuard already read) and navigates
 * to the dashboard at "/".
 *
 * A visitor who already holds a session never sees the form: an effect on
 * mount sends them straight to the dashboard. This mirrors AuthGate, which
 * sends signed-out visitors away from the app screens, so /login and the
 * (app) group are exact opposites.
 */
export default function LoginPage() {
    const router = useRouter();
    const { setRole } = useRoleContext();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Already signed in? Leave before rendering the form. An effect (not a
    // render-time check) so the server snapshot and first client render agree.
    useEffect(() => {
        if (getAuthSession()) {
            router.replace("/");
        }
    }, [router]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!email.trim() || !password) {
            setError("Enter both your email and password to continue.");
            return;
        }

        setError(null);
        setSubmitting(true);

        try {
            const session = await loginApi(email.trim(), password);

            saveAuthSession(session);
            // Mirrors the session role into canteen.role — the single source
            // of truth the header, sidebar and RoleGuard already read — then
            // moves on to the dashboard.
            setRole(session.role);
            router.push("/");
        } catch (err) {
            const message =
                err instanceof AuthApiError
                    ? err.message
                    : "Login failed. Please try again.";
            setError(message);
            setSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <div className="login-card w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <ShieldCheck size={22} aria-hidden="true" />
                </div>

                <h1 className="mt-4 text-2xl font-semibold text-slate-800">
                    Kitchen &amp; Nutrition Hub
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Sign in to manage ward meals, diet orders and the cafeteria.
                </p>

                <form onSubmit={handleSubmit} noValidate className="mt-6">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-slate-700"
                        >
                            Email
                        </label>

                        <div className="relative mt-1.5">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="username"
                                autoFocus
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                aria-invalid={error ? true : undefined}
                                aria-describedby={
                                    error ? "login-error" : undefined
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                                placeholder="you@hygo.health"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-slate-700"
                        >
                            Password
                        </label>

                        <div className="relative mt-1.5">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                aria-invalid={error ? true : undefined}
                                aria-describedby={
                                    error ? "login-error" : undefined
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                                placeholder="Your password"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword((visible) => !visible)
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-100"
                            >
                                {showPassword ? (
                                    <EyeOff size={16} aria-hidden="true" />
                                ) : (
                                    <Eye size={16} aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p
                            id="login-error"
                            role="alert"
                            className="mt-3 text-sm font-medium text-red-600"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="mt-6 w-full rounded-full bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? "Signing in…" : "Sign in"}
                    </button>
                </form>

                <p className="mt-5 text-center text-xs text-slate-400">
                    Hospital foodservice staff access only
                </p>
            </div>
        </main>
    );
}
