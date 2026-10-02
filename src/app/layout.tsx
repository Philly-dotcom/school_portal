import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "School Portal", template: "%s · School Portal" },
  description: "A connected school workspace for administrators, teachers, learners and families.",
  robots: { index: false, follow: false },
};

// Rendering every page per request lets Next.js attach the CSP nonce (set in src/proxy.ts) to its scripts.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
