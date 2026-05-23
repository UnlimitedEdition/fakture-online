"use client";

import { useEffect } from "react";

// global-error.tsx wraps the root layout — used only when the root layout
// itself crashes. Must include its own <html> + <body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/internal/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        digest: error.digest ?? null,
        message: error.message?.slice(0, 200) ?? "",
        path: window.location.pathname,
        ua: navigator.userAgent.slice(0, 256),
        fatal: true,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="sr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafaf9",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#1e293b",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.75rem" }}>
            Aplikacija je naišla na grešku
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 1.25rem" }}>
            Osvežite stranu — ako se greška ponavlja, javite nam i navedite ID
            ispod.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "0.75rem",
                color: "#94a3b8",
                margin: "0 0 1rem",
              }}
            >
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#0d9488",
              color: "white",
              padding: "0.6rem 1.25rem",
              border: "none",
              borderRadius: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              marginRight: "0.5rem",
            }}
          >
            Pokušaj ponovo
          </button>
          <a
            href={`mailto:podrska@faktureonline.rs?subject=${encodeURIComponent(
              "Fatalna greška" + (error.digest ? ` (ID ${error.digest})` : ""),
            )}`}
            style={{
              color: "#0d9488",
              textDecoration: "none",
              fontWeight: 500,
              fontSize: "0.875rem",
            }}
          >
            podrska@faktureonline.rs
          </a>
        </div>
      </body>
    </html>
  );
}
