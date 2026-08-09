"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { VehicleStockMovementType } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Writes a movement row and applies its delta to vehicle_stock.quantity_on_hand
// (creating the row on first movement for a product). Deliberately never
// touches jobs -- quoted vs. actually-used materials can differ, and
// reconciling the two on job completion is a separate future feature.
async function applyMovement(
  supabase: SupabaseServerClient,
  catalogueProductId: string,
  movementType: VehicleStockMovementType,
  quantityChange: number,
  reason: string | null,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: current } = await supabase
    .from("vehicle_stock")
    .select("quantity_on_hand")
    .eq("catalogue_product_id", catalogueProductId)
    .maybeSingle();

  const newQuantity = (current?.quantity_on_hand ?? 0) + quantityChange;

  const { error: moveError } = await supabase.from("vehicle_stock_movements").insert({
    catalogue_product_id: catalogueProductId,
    movement_type: movementType,
    quantity_change: quantityChange,
    reason,
    created_by: user?.id ?? null,
  });
  if (moveError) throw new Error(moveError.message);

  const { error: stockError } = await supabase
    .from("vehicle_stock")
    .upsert(
      { catalogue_product_id: catalogueProductId, quantity_on_hand: newQuantity },
      { onConflict: "catalogue_product_id" },
    );
  if (stockError) throw new Error(stockError.message);
}

export async function addStock(catalogueProductId: string, formData: FormData) {
  const quantity = Math.abs(Number(formData.get("quantity") || 0));
  const reason = (formData.get("reason") as string) || null;
  const supabase = await createClient();
  await applyMovement(supabase, catalogueProductId, "Add", quantity, reason);
  revalidatePath("/materials/vehicle-stock");
}

export async function removeStock(catalogueProductId: string, formData: FormData) {
  const quantity = Math.abs(Number(formData.get("quantity") || 0));
  const reason = (formData.get("reason") as string) || null;
  const supabase = await createClient();
  await applyMovement(supabase, catalogueProductId, "Remove", -quantity, reason);
  revalidatePath("/materials/vehicle-stock");
}

export async function restockItem(catalogueProductId: string, formData: FormData) {
  const quantity = Math.abs(Number(formData.get("quantity") || 0));
  const reason = (formData.get("reason") as string) || null;
  const supabase = await createClient();
  await applyMovement(supabase, catalogueProductId, "Restock", quantity, reason);
  revalidatePath("/materials/vehicle-stock");
}

export async function adjustStock(catalogueProductId: string, formData: FormData) {
  const newQuantity = Number(formData.get("quantity") || 0);
  const reason = (formData.get("reason") as string) || null;
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("vehicle_stock")
    .select("quantity_on_hand")
    .eq("catalogue_product_id", catalogueProductId)
    .maybeSingle();

  const delta = newQuantity - (current?.quantity_on_hand ?? 0);
  await applyMovement(supabase, catalogueProductId, "Adjust", delta, reason);
  revalidatePath("/materials/vehicle-stock");
}

export async function setMinimumStockLevel(catalogueProductId: string, formData: FormData) {
  const minimum = Math.abs(Number(formData.get("minimum_stock_level") || 0));
  const supabase = await createClient();

  const { error } = await supabase
    .from("vehicle_stock")
    .upsert(
      { catalogue_product_id: catalogueProductId, minimum_stock_level: minimum },
      { onConflict: "catalogue_product_id" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/materials/vehicle-stock");
}
