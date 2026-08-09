"use client";

import { useActionState } from "react";
import { Zap } from "lucide-react";
import { resetPassword } from "./actions";

export default function ResetPasswordPage() {
  const [error, formAction, pending] = useActionState(resetPassword, null);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Zap className="h-6 w-6" fill="currentColor" />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Set a new password
          </h1>
          <p className="text-center text-sm text-neutral-500">
            At least 8 characters. You&apos;ll need to sign in again once it&apos;s changed.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="confirm_password"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Confirm new password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
