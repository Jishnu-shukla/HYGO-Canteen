import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RoleProvider from "@/context/RoleContext";
import NumberInputWheelGuard from "@/components/NumberInput/NumberInputWheelGuard";
import ToastProvider from "@/components/Toast/ToastProvider";

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

/**
 * Root layout: html, fonts and the global providers only. The signed-in
 * launcher shell (sidebar, header, role guard) lives in `app/(app)/layout.tsx`
 * so routes outside that group — like `/login` — render full-screen.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <RoleProvider>
        <body className="min-h-full flex flex-col">
          {children}

          {/* Number fields must not step on scroll, anywhere in the app. */}
          <NumberInputWheelGuard />

          {/* Global toast stack, fed by the API error interceptor. */}
          <ToastProvider />
        </body>
      </RoleProvider>
    </html>
  );
}
