import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Page not found
        </h1>
        <p className="text-sm text-neutral-500">
          That page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
