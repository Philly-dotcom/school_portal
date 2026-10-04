import Link from "next/link";
import { Brand } from "./portal-shell";

export function AccountPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="account-page">
      <Link href="/" className="brand-link">
        <Brand />
      </Link>
      <section className="content-panel">
        <p className="eyebrow">SCHOOL ACCOUNT</p>
        <h1>{title}</h1>
        {children}
        <Link href="/login" className="back-link" style={{ marginTop: 24 }}>
          Back to sign-in
        </Link>
      </section>
    </main>
  );
}
