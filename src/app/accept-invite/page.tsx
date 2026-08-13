"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlatformLogo } from "@/components/platform-logo";
import { createClient } from "@/lib/supabase/client";

// Team invites go out via supabase.auth.admin.inviteUserByEmail(), called
// with the *inviting admin's* service-role session -- the invited person's
// browser was never part of that request, so Supabase can't hand them a PKCE
// code the way signup/reset links do. Instead the invite link carries the
// session directly as a URL hash fragment (#access_token=...&refresh_token=...),
// which is a browser-only concept and never reaches /auth/callback's server
// route. This page exists purely to read that fragment client-side, turn it
// into a real cookie-backed session via setSession(), and hand off to
// /reset-password once one exists.
export default function AcceptInvitePage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function acceptInvite() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setError(true);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        setError(true);
      } else {
        router.replace("/reset-password");
      }
    }

    acceptInvite();
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white px-4 py-3">
            <PlatformLogo className="h-9 w-auto" />
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            That invite link has expired or was already used. Ask whoever invited you to send a
            new one.
          </p>
        ) : (
          <p className="text-sm text-neutral-500">Setting up your account…</p>
        )}
      </div>
    </div>
  );
}
