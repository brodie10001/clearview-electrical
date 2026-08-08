"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PhotoCategory } from "@/types/database";

export async function updateDocumentCategory(
  documentId: string,
  category: PhotoCategory,
  paths: string[],
) {
  const supabase = await createClient();
  await supabase.from("documents").update({ photo_category: category }).eq("id", documentId);
  for (const path of paths) revalidatePath(path);
}
