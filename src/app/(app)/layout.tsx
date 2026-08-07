import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { QuickActionButton } from "@/components/quick-action/quick-action-button";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  const displayName = profile?.full_name || profile?.email || user.email || "You";
  const role = profile?.role ?? "owner";

  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar displayName={displayName} role={role} />
      <main className="min-w-0 flex-1 pb-28 md:pb-8">{children}</main>
      <BottomNav />
      <QuickActionButton />
    </div>
  );
}
