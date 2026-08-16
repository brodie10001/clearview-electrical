import Link from "next/link";
import { PlatformLogo } from "@/components/platform-logo";

export const metadata = { title: "Terms of Service — Ralden" };

export default function TermsPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Link href="/" className="w-fit">
        <div className="rounded-xl bg-white px-4 py-3 dark:bg-white">
          <PlatformLogo className="h-8 w-auto" />
        </div>
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Terms of Service
        </h1>
        <p className="text-sm text-neutral-500">Last updated 14 August 2026</p>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        Ralden is currently in private beta. These terms cover your use of the beta product and
        will be reviewed before general release.
      </p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            1. Agreement
          </h2>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of Ralden
            (the &quot;Service&quot;), a business management application for electrical trades
            businesses. By creating an account or using the Service, you agree to these Terms on
            behalf of yourself and, if applicable, the business you represent (&quot;you&quot;,
            &quot;your business&quot;).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            2. Beta status
          </h2>
          <p>
            The Service is provided as an early-access beta. Features may change, break, or be
            removed without notice, and we don&apos;t guarantee uptime, data retention, or that
            any given feature will remain available. We&apos;ll do our best to give you notice of
            major changes and to keep your data safe, but you should keep your own backups of
            anything critical (e.g. exported PDFs of quotes and invoices) during the beta period.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            3. Your account
          </h2>
          <p>
            You&apos;re responsible for keeping your login credentials secure and for all activity
            under your account. If you invite team members, you&apos;re responsible for their
            conduct within your business&apos;s workspace and for removing their access when
            appropriate (e.g. when they leave). Each business&apos;s data is kept logically
            separate from every other business using the Service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            4. Your data and your customers
          </h2>
          <p>
            You own the data you put into the Service — your customers, jobs, quotes, invoices,
            photos, and documents. We don&apos;t claim ownership of it, and we won&apos;t use it
            for anything other than providing and improving the Service.
          </p>
          <p>
            Ralden is a tool for running your business. We&apos;re not a party to any agreement
            between you and your customers, and we&apos;re not responsible for the accuracy of
            quotes, invoices, electrical work, or any other content you create or perform using
            the Service. You&apos;re responsible for complying with the licensing, safety, and
            consumer protection laws that apply to your trade.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            5. Payments recorded in the Service
          </h2>
          <p>
            Ralden does not process payments or handle card details — it&apos;s a record-keeping
            tool. When you mark an invoice as paid, you&apos;re recording that a payment happened
            outside the Service (e.g. bank transfer, cash, card terminal); Ralden has no
            visibility into whether that payment actually occurred and takes no responsibility for
            payment disputes between you and your customers.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            6. Acceptable use
          </h2>
          <p>You agree not to use the Service to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Store or share unlawful, fraudulent, or infringing content</li>
            <li>Attempt to access another business&apos;s data or bypass access controls</li>
            <li>Interfere with the Service&apos;s operation or overload its infrastructure</li>
            <li>Reverse-engineer the Service beyond what&apos;s permitted by law</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            7. Fees
          </h2>
          <p>
            The Service is currently free during the private beta. If we introduce pricing in the
            future, we&apos;ll give existing beta users advance notice before any charges apply.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            8. Termination
          </h2>
          <p>
            You can stop using the Service and delete your account at any time. We may suspend or
            terminate access if these Terms are breached, or pause the beta program at our
            discretion. Where reasonably possible, we&apos;ll give you notice and an opportunity
            to export your data first.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            9. Disclaimer and limitation of liability
          </h2>
          <p>
            The Service is provided &quot;as is&quot; during the beta period, without warranties
            of any kind, express or implied, to the maximum extent permitted by law. To the
            maximum extent permitted by law, we aren&apos;t liable for any indirect, incidental,
            or consequential loss arising from your use of the Service, including lost revenue,
            lost data, or business interruption. Nothing in these Terms excludes any consumer
            guarantee, right, or remedy that can&apos;t lawfully be excluded under the Australian
            Consumer Law.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            10. Changes to these Terms
          </h2>
          <p>
            We may update these Terms from time to time, particularly as the beta progresses
            toward general availability. We&apos;ll update the date at the top of this page when
            we do; continued use of the Service after a change means you accept the updated Terms.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            11. Governing law
          </h2>
          <p>
            These Terms are governed by the laws of Western Australia, Australia, without regard
            to conflict of law principles.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            12. Contact
          </h2>
          <p>
            Questions about these Terms? Contact us at{" "}
            <a href="mailto:brodienugent@gmail.com" className="font-medium underline">
              brodienugent@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-2 text-xs text-neutral-400">
        This document is a starting template, not legal advice — have it reviewed by a solicitor
        before relying on it for anything beyond an early, invite-only beta.
      </p>
    </div>
  );
}
