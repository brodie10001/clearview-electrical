"use client";

import { useEffect } from "react";

// Only fires if the root layout itself throws (fonts, providers, etc.) --
// error.tsx can't catch that since it renders inside the layout it's meant
// to protect. Next.js requires this file to render its own <html>/<body>
// since it fully replaces the root layout when it's active.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
          <h1 className="text-lg font-semibold text-neutral-900">Something went wrong</h1>
          <p className="text-sm text-neutral-500">
            That&apos;s on us, not you. Try reloading the page.
          </p>
          <button
            onClick={reset}
            className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
