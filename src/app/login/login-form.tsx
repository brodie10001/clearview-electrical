"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PlatformLogo } from "@/components/platform-logo";
import { signIn } from "./actions";

export function LoginForm({
  resetSuccess,
  signupExpired,
}: {
  resetSuccess: boolean;
  signupExpired: boolean;
}) {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white px-4 py-3">
            <PlatformLogo className="h-9 w-auto" />
          </div>
          <p className="text-sm text-neutral-500">Sign in to your workspace</p>
        </div>

        {resetSuccess ? (
          <p className="mb-4 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
            Password changed. Sign in with your new password.
          </p>
        ) : null}

        {signupExpired ? (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            That confirmation link has expired or was already used. Please{" "}
            <Link href="/signup" className="font-medium underline">
              sign up again
            </Link>{" "}
            to get a fresh one — make sure to open the email link in the same browser you signed
            up with.
          </p>
        ) : null}

        <form action={formAction} className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-amber-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          New business?{" "}
          <Link href="/signup" className="font-medium text-amber-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
