"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Let’s get back on track.</h1>
      <p>Your saved railway stays on this device.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
