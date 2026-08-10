import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/supabase/request-user";

// Platform-admin area -- not linked from regular navigation, and gated
// server-side here so every route under /admin is covered by one check.
// is_platform_admin is never self-service (see the protect_platform_admin_flag
// trigger); reaching this point requires the one-time manual DB update
// described in the feedback-system migration.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) redirect("/");

  return <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">{children}</div>;
}
