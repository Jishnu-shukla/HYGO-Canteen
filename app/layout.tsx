import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FoodItemProvider from "@/context/FoodItemContext";
import Sidebar from "@/components/Sidebar/Sidebar";
import AppHeader from "@/components/Header/AppHeader";
import { SIDEBAR_TOGGLE_ID } from "@/routes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kitchen & Nutrition Hub",
  description: "Inpatient catering, diet orders and kitchen management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <FoodItemProvider>
        <body className="min-h-full flex flex-col">
          {/* Launcher rail on every route. The checkbox below drives the
              mobile drawer via peer-checked, so no client state is needed. */}
          <div className="relative flex min-h-screen bg-slate-50">
            <input
              type="checkbox"
              id={SIDEBAR_TOGGLE_ID}
              className="peer sr-only"
            />

            {/* Desktop sidebar */}
            <div className="hidden md:flex">
              <Sidebar />
            </div>

            {/* Mobile drawer */}
            <div
              className={`fixed inset-y-0 left-0 z-40 flex -translate-x-full transition-transform peer-checked:translate-x-0 md:hidden`}
            >
              <Sidebar />
            </div>

            {/* Mobile backdrop — a label so tapping it closes the drawer.
                `md:hidden!` is important so the desktop layout always wins
                if the drawer was left open during a resize. */}
            <label
              htmlFor={SIDEBAR_TOGGLE_ID}
              aria-label="Close navigation"
              className="fixed inset-0 z-30 hidden cursor-default bg-black/40 peer-checked:block md:hidden!"
            />

            <div className="flex min-w-0 flex-1 flex-col">
              {/* Mobile top bar */}
              <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
                <label
                  htmlFor={SIDEBAR_TOGGLE_ID}
                  aria-label="Open navigation"
                  className="cursor-pointer text-gray-600 transition hover:text-gray-900"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                </label>

                <span className="truncate text-sm font-medium text-orange-800">
                  CANTEEN MANAGEMENT
                </span>
              </div>

              <AppHeader />

              {children}
            </div>
          </div>
        </body>
      </FoodItemProvider>
    </html>
  );
}