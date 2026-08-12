"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlatformLogo } from "@/components/platform-logo";
import { signUp, verifySignupOtp, resendSignupOtp } from "./actions";

const inputClass =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";
const labelClass = "text-sm font-medium text-neutral-700 dark:text-neutral-300";

function OtpStep({ email }: { email: string }) {
  const [verifyState, verifyAction, verifyPending] = useActionState(verifySignupOtp, {
    error: null,
  });
  const [resendState, resendAction, resendPending] = useActionState(resendSignupOtp, {
    sent: false,
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
        We sent a confirmation link and a 6-digit code to <strong>{email}</strong>. You can click
        the link on this device, or enter the code below -- the code works even if you open the
        email on a different phone or browser.
      </p>

      <form action={verifyAction} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={email} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="token" className={labelClass}>
            Confirmation code
          </label>
          <input
            id="token"
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            required
            className={`${inputClass} text-center text-lg tracking-[0.3em]`}
          />
        </div>

        {verifyState.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{verifyState.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={verifyPending}
          className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          {verifyPending ? "Confirming..." : "Confirm and continue"}
        </button>
      </form>

      <form action={resendAction}>
        <input type="hidden" name="email" value={email} />
        {resendState.sent ? (
          <p className="text-center text-sm text-green-600 dark:text-green-400">
            A new link and code are on their way.
          </p>
        ) : (
          <button
            type="submit"
            disabled={resendPending}
            className="w-full text-center text-sm font-medium text-amber-600 hover:underline disabled:opacity-60"
          >
            {resendPending ? "Sending..." : "Didn't get it? Resend the link and code"}
          </button>
        )}
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-amber-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>
    </div>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, {
    error: null,
    sent: false,
    email: null,
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white px-4 py-3">
            <PlatformLogo className="h-9 w-auto" />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Create your business
          </h1>
          <p className="text-center text-sm text-neutral-500">
            Set up a fresh workspace for your business -- separate and private from every other
            business on Tradeline.
          </p>
        </div>

        {state.sent && state.email ? (
          <OtpStep email={state.email} />
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="business_name" className={labelClass}>
                Business name
              </label>
              <input
                id="business_name"
                name="business_name"
                type="text"
                required
                autoComplete="organization"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="full_name" className={labelClass}>
                Your name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                autoComplete="name"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm_password" className={labelClass}>
                Confirm password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
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
              {pending ? "Creating account..." : "Create account"}
            </button>

            <p className="text-center text-sm text-neutral-500">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-amber-600 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
