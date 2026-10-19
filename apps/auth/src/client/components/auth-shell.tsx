import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";

// The frame every auth screen shares; each screen draws its own card, since the widths differ.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center border-b px-4 py-3 sm:px-7 sm:py-3.5">
        <Link
          className="inline-flex items-center gap-2 font-semibold text-[15px] tracking-wide"
          to="/sign-in"
        >
          <svg
            aria-hidden="true"
            className="size-5 text-primary"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.3"
            viewBox="0 0 24 24"
          >
            <path d="M5.5 3.5h9L19 8v12.5h-13.5V3.5Z" />
            <path d="M14.5 3.5V8H19" />
            <path d="M8.8 11.5h6.4M8.8 14.6h4.2" strokeLinecap="round" />
          </svg>
          karibari
        </Link>
      </header>
      <div className="grid flex-1 place-items-center px-4 py-5 sm:px-6 sm:py-8">{children}</div>
      <footer className="flex flex-col gap-0.5 border-t px-4 py-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-7">
        <span>karibari</span>
        <span className="font-mono">auth.karibari.com</span>
      </footer>
    </div>
  );
}
