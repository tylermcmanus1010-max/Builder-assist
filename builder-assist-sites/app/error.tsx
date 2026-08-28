"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The digest is safe to correlate; never render stack traces or raw server details.
    console.error("Builder Assist route failure", { digest: error.digest || "client-error", name: error.name });
  }, [error]);

  return <main className="app-failure" role="alert">
    <span aria-hidden="true">BA</span>
    <small>BUILDER ASSIST</small>
    <h1>This workspace could not finish loading</h1>
    <p>Your saved project data was not changed. Retry the route once. If the error returns, contact support with reference <strong>{error.digest || "client-error"}</strong>.</p>
    <div>
      <button type="button" onClick={reset}>Retry workspace</button>
      <Link href="/">Return to project home</Link>
    </div>
  </main>;
}
