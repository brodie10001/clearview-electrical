import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { QuickActionButton } from "@/components/quick-action/quick-action-button";
import { OfflinePhotoIndicator } from "@/components/offline-photo-indicator";
import { FeedbackButton } from "@/components/feedback/feedback-button";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getRequestUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh w-full">
      <Suspense fallback={<SidebarFallback />}>
        <SidebarWithProfile userId={user.id} fallbackEmail={user.email ?? undefined} />
      </Suspense>
      <main className="min-w-0 flex-1 pt-[env(safe-area-inset-top)] pb-28 md:pb-8">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <BottomNav />
      <QuickActionButton />
      <OfflinePhotoIndicator />
      <FeedbackButton />
    </div>
  );
}

function SidebarFallback() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-neutral-200 bg-white md:block dark:border-neutral-800 dark:bg-neutral-900" />
  );
}

async function SidebarWithProfile({
  userId,
  fallbackEmail,
}: {
  userId: string;
  fallbackEmail: string | undefined;
}) {
  const supabase = await createClient();
  const [profileRes, settingsRes, businessRes] = await Promise.all([
    supabase.from("profiles").select("full_name, email, role, business_id").eq("id", userId).single(),
    supabase.from("business_settings").select("trading_name").maybeSingle(),
    supabase.from("businesses").select("name").maybeSingle(),
  ]);

  const displayName =
    profileRes.data?.full_name || profileRes.data?.email || fallbackEmail || "You";
  const role = profileRes.data?.role ?? "owner";
  const businessName = settingsRes.data?.trading_name || businessRes.data?.name || "Your Business";

  return <Sidebar businessName={businessName} displayName={displayName} role={role} />;
}
