"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/supabase/request-user";
import { getCurrentProfile } from "@/lib/data/current-business";
import type { ProfileRole } from "@/types/database";

async function requireAdmin() {
  const user = await getRequestUser();
  if (!user) throw new Error("Not signed in.");

  const profile = await getCurrentProfile(user.id);
  if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
    throw new Error("Only owners and admins can manage the team.");
  }
  return { userId: user.id, businessId: profile.business_id };
}

async function currentOrigin() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

// Uses the service client because inviting a user requires Supabase's admin
// API (auth.admin.inviteUserByEmail), which needs the service role key --
// requireAdmin() above is what stands between that and "any signed-in user
// can invite anyone into any business," since a service-role call bypasses
// RLS entirely.
export async function inviteStaffMember(formData: FormData): Promise<{ error: string | null }> {
  const { businessId } = await requireAdmin();

  const email = (formData.get("email") as string)?.trim();
  const fullName = (formData.get("full_name") as string)?.trim();
  const role = formData.get("role") as ProfileRole;

  if (!email) return { error: "Email is required." };
  if (!["admin", "technician"].includes(role)) {
    return { error: "Invalid role." };
  }

  const origin = await currentOrigin();
  const serviceClient = createServiceClient();

  const { error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: {
      invited_business_id: businessId,
      invited_role: role,
      full_name: fullName || null,
    },
    redirectTo: `${origin}/accept-invite`,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/business");
  return { error: null };
}

// Every business needs at least one owner -- these two guards stop the
// last one from being demoted or deactivated, which would otherwise leave
// a business with admins who can manage everything except who else is an
// owner.
async function assertNotLastOwner(businessId: string, profileId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("role", "owner")
    .eq("active", true)
    .neq("id", profileId);

  if (!count) {
    throw new Error("Every business needs at least one owner.");
  }
}

export async function updateStaffRole(profileId: string, role: ProfileRole): Promise<{ error: string | null }> {
  const { businessId } = await requireAdmin();
  const supabase = await createClient();

  try {
    if (role !== "owner") {
      const { data: target } = await supabase.from("profiles").select("role").eq("id", profileId).single();
      if (target?.role === "owner") await assertNotLastOwner(businessId, profileId);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update role." };
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) return { error: error.message };

  revalidatePath("/settings/business");
  return { error: null };
}

export async function setStaffActive(profileId: string, active: boolean): Promise<{ error: string | null }> {
  const { businessId } = await requireAdmin();
  const supabase = await createClient();

  if (!active) {
    try {
      const { data: target } = await supabase.from("profiles").select("role").eq("id", profileId).single();
      if (target?.role === "owner") await assertNotLastOwner(businessId, profileId);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to update." };
    }
  }

  const { error } = await supabase.from("profiles").update({ active }).eq("id", profileId);
  if (error) return { error: error.message };

  revalidatePath("/settings/business");
  return { error: null };
}

// Deleting the auth.users row (rather than just the profile) is what frees
// the email address up for a fresh invite -- profiles.id has "on delete
// cascade" from auth.users, so this also removes the profile row. Uses the
// service client because deleting an auth user requires the admin API.
export async function removeStaffMember(profileId: string): Promise<{ error: string | null }> {
  const { userId, businessId } = await requireAdmin();

  if (profileId === userId) {
    return { error: "You can't remove yourself." };
  }

  const supabase = await createClient();
  try {
    const { data: target } = await supabase.from("profiles").select("role").eq("id", profileId).single();
    if (target?.role === "owner") await assertNotLastOwner(businessId, profileId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to remove." };
  }

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.auth.admin.deleteUser(profileId);
  if (error) return { error: error.message };

  revalidatePath("/settings/business");
  return { error: null };
}
