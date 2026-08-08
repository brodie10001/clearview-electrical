"use client";

import { useEffect, useState } from "react";
import { Copy, Mail, Share2, Check } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { shareQuote } from "../actions";

export function ShareQuoteDialog({
  quoteId,
  jobId,
  quoteNumber,
  tradingName,
  customerName,
  onClose,
  onShared,
}: {
  quoteId: string;
  jobId: string;
  quoteNumber: string;
  tradingName: string;
  customerName: string;
  onClose: () => void;
  onShared: () => void;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canWebShare, setCanWebShare] = useState(false);

  useEffect(() => {
    // navigator.share is a client-only capability check, unavailable during
    // SSR -- there's no render-time alternative.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanWebShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    shareQuote(quoteId, jobId).then(({ token }) => {
      setLink(`${window.location.origin}/q/${token}`);
      onShared();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per dialog open (see the parent's key/mount pattern)
  }, []);

  const subject = `Your quote from ${tradingName} — ${quoteNumber}`;
  const bodyText = link
    ? `Hi ${customerName},\n\nPlease find your quote from ${tradingName} below.\n\n${quoteNumber} — view online: ${link}\n\nIf you have any questions, feel free to get in touch.\n\nThanks,\n${tradingName}`
    : "";

  return (
    <Dialog open onClose={onClose} title="Share Quote">
      {!link ? (
        <p className="py-6 text-center text-sm text-neutral-500">Generating link...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
            <p className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-300">
              {link}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-2.5 rounded-lg border border-neutral-200 px-3.5 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {copied ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 shrink-0 text-neutral-400" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </button>

            <a
              href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`}
              className="flex items-center gap-2.5 rounded-lg border border-neutral-200 px-3.5 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Mail className="h-4 w-4 shrink-0 text-neutral-400" />
              Email
            </a>

            {canWebShare ? (
              <button
                onClick={() => {
                  navigator.share({ title: subject, text: bodyText, url: link }).catch(() => {
                    // User cancelled the share sheet -- nothing to do.
                  });
                }}
                className="flex items-center gap-2.5 rounded-lg border border-neutral-200 px-3.5 py-3 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Share2 className="h-4 w-4 shrink-0 text-neutral-400" />
                Text
              </button>
            ) : null}
          </div>

          <p className="text-xs text-neutral-500">
            You review and send it yourself — nothing is sent automatically.
          </p>
        </div>
      )}
    </Dialog>
  );
}
