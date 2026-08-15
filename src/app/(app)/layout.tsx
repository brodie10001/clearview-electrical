import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getRequestUser } from "@/lib/supabase/request-user";
import {
  getCurrentProfile,
  getCurrentBusinessOverview,
  getAttentionCount,
} from "@/lib/data/current-business";
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
      <Suspense fallback={<BottomNav role="owner" />}>
        <BottomNavWithProfile userId={user.id} />
      </Suspense>
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
  const [profile, businessOverview, attentionCount] = await Promise.all([
    getCurrentProfile(userId),
    getCurrentBusinessOverview(),
    getAttentionCount(),
  ]);

  const displayName = profile?.full_name || profile?.email || fallbackEmail || "You";
  const role = profile?.role ?? "owner";
  const businessName = businessOverview.tradingName || businessOverview.businessName || "Your Business";

  return (
    <Sidebar
      businessName={businessName}
      displayName={displayName}
      role={role}
      attentionCount={attentionCount}
    />
  );
}

async function BottomNavWithProfile({ userId }: { userId: string }) {
  const [profile, attentionCount] = await Promise.all([
    getCurrentProfile(userId),
    getAttentionCount(),
  ]);
  return <BottomNav role={profile?.role ?? "owner"} attentionCount={attentionCount} />;
}
