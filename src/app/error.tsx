"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

// Catches runtime errors thrown anywhere under the root layout (any page,
// authenticated or not) so a crash lands on something a user can act on
// instead of Next.js's generic error screen. Doesn't brand this with the
// business's or platform's logo -- an error boundary can fire before we
// know which business (if any) is signed in, so it stays neutral.
export default function GlobalErrorBoundary({
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
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Something went wrong
        </h1>
        <p className="text-sm text-neutral-500">
          That&apos;s on us, not you. Try again, and if it keeps happening, let us know what you
          were doing.
        </p>
        <button
          onClick={reset}
          className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Try again
        </button>
        <Link href="/" className="text-sm font-medium text-amber-600 hover:underline">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
