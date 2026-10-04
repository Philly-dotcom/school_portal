import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone-state">
      <span className="eyebrow">404</span>
      <h1>This page isn’t here.</h1>
      <p>Return to your school workspace to continue.</p>
      <Link className="button primary" href="/">
        Back to School Portal
      </Link>
    </main>
  );
}
