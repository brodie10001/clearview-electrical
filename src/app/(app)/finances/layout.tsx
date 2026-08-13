import { redirect } from "next/navigation";
import { getRequestUser } from "@/lib/supabase/request-user";
import { getCurrentProfile } from "@/lib/data/current-business";

export default async function FinancesLayout({ children }: LayoutProps<"/finances">) {
  const user = await getRequestUser();
  const profile = user ? await getCurrentProfile(user.id) : null;
  const canManageFinances = profile?.role === "owner" || profile?.role === "admin";

  if (!canManageFinances) {
    redirect("/");
  }

  return children;
}
