"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  PropertyStatus,
  PropertyType,
  PropertyContactRole,
  PhaseType,
} from "@/types/database";

export async function createProperty(formData: FormData) {
  const customerId = formData.get("customer_id") as string;
  const address = formData.get("address") as string;
  const propertyType = formData.get("property_type") as PropertyType;
  const gpsLat = formData.get("gps_lat") as string;
  const gpsLng = formData.get("gps_lng") as string;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      customer_id: customerId,
      address,
      property_type: propertyType,
      gps_lat: gpsLat ? Number(gpsLat) : null,
      gps_lng: gpsLng ? Number(gpsLng) : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create property");
  }

  revalidatePath("/properties");
  redirect(`/properties/${data.id}`);
}

export async function updatePropertyStatus(propertyId: string, status: PropertyStatus) {
  const supabase = await createClient();
  await supabase.from("properties").update({ status }).eq("id", propertyId);
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
}

export async function upsertPropertyAccess(propertyId: string, formData: FormData) {
  const supabase = await createClient();
  const fields = [
    "gate_code",
    "alarm_instructions",
    "lockbox_location",
    "parking_instructions",
    "pets_notes",
    "hazards_notes",
    "ceiling_access_notes",
    "roof_access_notes",
    "restricted_areas_notes",
  ] as const;

  const values = Object.fromEntries(
    fields.map((field) => [field, (formData.get(field) as string) || null]),
  );

  await supabase.from("property_access").upsert({ property_id: propertyId, ...values });
  revalidatePath(`/properties/${propertyId}`);
}

export async function upsertPropertyElectrical(propertyId: string, formData: FormData) {
  const supabase = await createClient();
  const textFields = [
    "switchboard_location",
    "switchboard_brand",
    "main_switch_rating",
    "consumer_mains_size",
    "meter_number",
    "existing_rcds",
    "existing_rcbos",
    "main_earth_location",
    "men_location",
  ] as const;

  const boolFields = [
    "solar_installed",
    "battery_installed",
    "generator_installed",
    "surge_protection",
    "ev_charger",
  ] as const;

  const values: Record<string, string | boolean | null> = Object.fromEntries(
    textFields.map((field) => [field, (formData.get(field) as string) || null]),
  );
  for (const field of boolFields) {
    values[field] = formData.get(field) === "on";
  }
  const phaseType = ((formData.get("phase_type") as string) || null) as PhaseType | null;

  await supabase
    .from("property_electrical")
    .upsert({ property_id: propertyId, phase_type: phaseType, ...values });
  revalidatePath(`/properties/${propertyId}`);
}

export async function addPropertyContact(propertyId: string, formData: FormData) {
  const contactId = formData.get("contact_id") as string;
  const role = formData.get("role") as PropertyContactRole;

  const supabase = await createClient();
  await supabase.from("property_contacts").insert({ property_id: propertyId, contact_id: contactId, role });
  revalidatePath(`/properties/${propertyId}`);
}

export async function removePropertyContact(propertyId: string, propertyContactId: string) {
  const supabase = await createClient();
  await supabase.from("property_contacts").delete().eq("id", propertyContactId);
  revalidatePath(`/properties/${propertyId}`);
}

export async function createAndAddPropertyContact(propertyId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const role = formData.get("role") as PropertyContactRole;

  const supabase = await createClient();
  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({ name, phone, email })
    .select("id")
    .single();

  if (error || !contact) {
    throw new Error(error?.message ?? "Failed to create contact");
  }

  await supabase
    .from("property_contacts")
    .insert({ property_id: propertyId, contact_id: contact.id, role });

  revalidatePath(`/properties/${propertyId}`);
}
