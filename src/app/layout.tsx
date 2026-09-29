import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "School Portal", template: "%s · School Portal" },
  description: "A connected school workspace for administrators, teachers, learners and families.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
