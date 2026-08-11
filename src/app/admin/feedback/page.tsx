import { createClient } from "@/lib/supabase/server";
import { FeedbackList } from "./feedback-list";
import type { FeedbackType, FeedbackStatus } from "@/types/database";

export interface FeedbackRow {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  screenshot_url: string | null;
  page_path: string | null;
  status: FeedbackStatus;
  created_at: string;
  business_name: string;
  submitted_by_name: string;
}

const SIGNED_URL_TTL_SECONDS = 3600;

export default async function AdminFeedbackPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("feedback")
    .select(
      "id, type, title, description, screenshot_url, page_path, status, created_at, business_name, submitted_by_name",
    )
    .order("created_at", { ascending: false })
    .returns<FeedbackRow[]>();

  const rows = data ?? [];

  const withSignedScreenshots = await Promise.all(
    rows.map(async (row) => {
      if (!row.screenshot_url) return row;
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(row.screenshot_url, SIGNED_URL_TTL_SECONDS);
      return { ...row, screenshot_url: signed?.signedUrl ?? null };
    }),
  );

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Feedback
        </h1>
        <p className="text-sm text-neutral-500">
          Every business&apos;s submitted bug reports, feature requests, and feedback.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load feedback: {error.message}
        </p>
      ) : (
        <FeedbackList items={withSignedScreenshots} />
      )}
    </>
  );
}
