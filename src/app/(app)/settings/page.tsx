import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/supabase/actions";
import { LogOut, ChevronRight, Building2, KeyRound, Package2 } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, role")
    .eq("id", user!.id)
    .single();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Settings</h1>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Your profile
        </h2>
        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Name</dt>
            <dd className="text-neutral-900 dark:text-neutral-50">
              {profile?.full_name || "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Email</dt>
            <dd className="text-neutral-900 dark:text-neutral-50">{profile?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Phone</dt>
            <dd className="text-neutral-900 dark:text-neutral-50">
              {profile?.phone || "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Role</dt>
            <dd className="capitalize text-neutral-900 dark:text-neutral-50">
              {profile?.role}
            </dd>
          </div>
        </dl>
      </section>

      <Link
        href="/settings/business"
        className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <Building2 className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Business Settings
          </h2>
          <p className="text-sm text-neutral-500">Branding, quote details, labour rates</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
      </Link>

      <Link
        href="/materials"
        className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <Package2 className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Materials
          </h2>
          <p className="text-sm text-neutral-500">Vehicle stock, materials to order, suppliers</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
      </Link>

      <Link
        href="/reset-password"
        className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <KeyRound className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Change Password
          </h2>
          <p className="text-sm text-neutral-500">Update your account password</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
      </Link>

      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </form>
    </div>
  );
}
