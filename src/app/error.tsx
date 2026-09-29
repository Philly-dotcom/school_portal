"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="standalone-state"><h1>We couldn’t open this page.</h1><p>Your request could not be completed. Try again or contact your school administrator.</p><button className="button primary" onClick={reset}>Try again</button></main>;
}
