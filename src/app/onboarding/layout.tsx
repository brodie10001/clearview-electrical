import { redirect } from "next/navigation";
import { getRequestUser } from "@/lib/supabase/request-user";

export default async function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-neutral-50 pt-[env(safe-area-inset-top)] dark:bg-neutral-950">
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8 sm:py-12">{children}</div>
    </div>
  );
}
