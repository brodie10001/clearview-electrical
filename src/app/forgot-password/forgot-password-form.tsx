"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlatformLogo } from "@/components/platform-logo";
import { requestPasswordReset } from "./actions";

export function ForgotPasswordForm({ expired }: { expired: boolean }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {
    sent: false,
    error: null,
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white px-4 py-3">
            <PlatformLogo className="h-9 w-auto" />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Reset your password
          </h1>
          <p className="text-center text-sm text-neutral-500">
            Enter your email and we&apos;ll send you a link to reset it.
          </p>
        </div>

        {state.sent ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
              If an account exists for that email, a reset link is on its way. Check your inbox
              (and spam folder) — it can take a few minutes to arrive.
            </p>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-amber-600 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            {expired ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                That reset link has expired or was already used. Enter your email below to request
                a new one.
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              />
            </div>

            {state.error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              {pending ? "Sending..." : "Send reset link"}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-amber-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
