import Link from "next/link";
import { PlatformLogo } from "@/components/platform-logo";

export const metadata = { title: "Privacy Policy — Ralden" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Link href="/" className="w-fit">
        <div className="rounded-xl bg-white px-4 py-3 dark:bg-white">
          <PlatformLogo className="h-8 w-auto" />
        </div>
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Privacy Policy
        </h1>
        <p className="text-sm text-neutral-500">Last updated 14 August 2026</p>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        Ralden is currently in private beta. This policy is written to reflect what the Service
        actually does with data today, and will be reviewed as the product grows.
      </p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            1. Who this applies to
          </h2>
          <p>
            This policy covers Ralden (&quot;we&quot;, &quot;us&quot;), a business management
            application for electrical trades businesses. It explains what personal information
            we collect, why, and how it&apos;s handled — both about you (a business owner or team
            member using Ralden) and about the customers, contacts, and staff your business enters
            into the Service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            2. Information we collect
          </h2>
          <p>
            <span className="font-medium text-neutral-900 dark:text-neutral-50">
              Account information:
            </span>{" "}
            your name, email address, and password (stored encrypted, never in plain text) when
            you sign up or accept a team invite.
          </p>
          <p>
            <span className="font-medium text-neutral-900 dark:text-neutral-50">
              Business data you enter:
            </span>{" "}
            customer names, contacts, property addresses, job details, quotes, invoices, payment
            records, expenses, photos, and documents. This is entered directly by you or your team
            in the course of using the Service to run your business.
          </p>
          <p>
            <span className="font-medium text-neutral-900 dark:text-neutral-50">
              Usage and diagnostic data:
            </span>{" "}
            basic technical information (like error reports and page performance) collected
            automatically to help us find and fix bugs. See &quot;Third parties&quot; below for
            the specific tools this goes through.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            3. How we use it
          </h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>To provide the Service — storing and displaying your business&apos;s data back to you and your team</li>
            <li>To send account-related emails (confirming your account, password resets, team invites)</li>
            <li>To send the daily digest email summarising overdue invoices, if enabled</li>
            <li>To diagnose and fix bugs or performance issues</li>
            <li>To communicate with you about the beta (e.g. major changes, outages)</li>
          </ul>
          <p>We don&apos;t sell your data, and we don&apos;t use it to serve you advertising.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            4. Who can see your business&apos;s data
          </h2>
          <p>
            Every business&apos;s data is kept logically separate — team members can only see data
            belonging to their own business, scoped by their role (owner, admin, or technician).
            Ralden staff do not routinely access your business data; we may access it if needed to
            diagnose a bug you&apos;ve reported or to comply with a legal obligation.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            5. Third parties we use to run the Service
          </h2>
          <p>We rely on the following infrastructure providers to operate Ralden:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <span className="font-medium text-neutral-900 dark:text-neutral-50">Supabase</span>{" "}
              — database, authentication, and file storage
            </li>
            <li>
              <span className="font-medium text-neutral-900 dark:text-neutral-50">Vercel</span> —
              application hosting
            </li>
            <li>
              <span className="font-medium text-neutral-900 dark:text-neutral-50">Sentry</span> —
              error monitoring (technical crash reports only, not your business data)
            </li>
            <li>An email delivery service, to send account and notification emails on our behalf</li>
          </ul>
          <p>
            These providers process data on our behalf under their own security and privacy
            commitments; we don&apos;t use any other third party to sell or share your data.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            6. Cookies
          </h2>
          <p>
            We use a small number of essential cookies to keep you signed in. We don&apos;t use
            advertising or tracking cookies.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            7. Data retention and deletion
          </h2>
          <p>
            We keep your data for as long as your account is active. If you close your account or
            ask us to delete your business&apos;s data, we&apos;ll delete it within a reasonable
            time, except where we&apos;re required to retain records (e.g. for legal or tax
            purposes).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            8. Your rights
          </h2>
          <p>
            You can access, correct, or request deletion of your personal information at any time
            — most of it you can edit directly in the app. For anything you can&apos;t change
            yourself, or to request a copy of your data, contact us using the details below.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            9. Children
          </h2>
          <p>Ralden is a business tool and isn&apos;t intended for use by children.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            10. Changes to this policy
          </h2>
          <p>
            We may update this policy as the product changes. We&apos;ll update the date at the
            top of this page when we do.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            11. Contact
          </h2>
          <p>
            Questions about this policy, or a request about your data? Contact us at{" "}
            <a href="mailto:brodienugent@gmail.com" className="font-medium underline">
              brodienugent@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-2 text-xs text-neutral-400">
        This document is a starting template, not legal advice — have it reviewed by a solicitor
        to confirm it meets your obligations under the Australian Privacy Act and Australian
        Privacy Principles before relying on it beyond an early, invite-only beta.
      </p>
    </div>
  );
}
