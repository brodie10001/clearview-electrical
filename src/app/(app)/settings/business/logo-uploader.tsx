"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type BusinessSettingsUpdate = Database["public"]["Tables"]["business_settings"]["Update"];
type LogoKind = "logo" | "light" | "dark";

function buildUpdate(kind: LogoKind, url: string): BusinessSettingsUpdate {
  if (kind === "logo") return { logo_url: url };
  if (kind === "light") return { logo_light_url: url };
  return { logo_dark_url: url };
}

export function LogoUploader({
  kind,
  label,
  currentUrl,
}: {
  kind: LogoKind;
  label: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPlaceholder = Boolean(currentUrl?.toLowerCase().includes("placeholder"));

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);

    const supabase = createClient();

    // Storage RLS scopes writes to this bucket by the object path's own
    // business_id prefix (see the branding_bucket_tenant_scoping
    // migration), so every upload has to land under that folder --
    // business_settings is already RLS-scoped to exactly one row (the
    // caller's own business), which is the one place a client component
    // can read its own business_id from.
    const { data: ownSettings, error: settingsError } = await supabase
      .from("business_settings")
      .select("business_id")
      .single();

    if (settingsError || !ownSettings) {
      setError(settingsError?.message ?? "Could not determine your business.");
      setBusy(false);
      return;
    }

    const path = `${ownSettings.business_id}/${kind}-${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setBusy(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("branding").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("business_settings")
      .update(buildUpdate(kind, publicUrlData.publicUrl))
      .not("business_id", "is", null);

    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local/static asset
            <img src={currentUrl} alt={label} className="h-full w-full object-contain" />
          ) : (
            <Upload className="h-5 w-5 text-neutral-300" />
          )}
        </div>
        <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
          {busy ? "Uploading..." : "Upload"}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>
      {isPlaceholder ? (
        <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" /> Placeholder — replace with your real logo
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
