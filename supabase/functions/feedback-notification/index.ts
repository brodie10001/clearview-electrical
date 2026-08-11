// Fired by a Supabase Database Webhook on `insert` into public.feedback
// (configured separately -- see supabase/functions/feedback-notification/README.md).
// Sends a plain notification email to the platform admin using the same
// Gmail SMTP relay already configured for Auth emails -- a different
// account/app-password pair set as this function's own secrets, since
// Auth's SMTP config isn't readable from here, but the same Gmail relay.
// This is notify-only: feedback already lives safely in the database
// regardless of whether this send succeeds.
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

interface FeedbackRecord {
  id: string;
  type: string;
  title: string;
  description: string;
  business_name: string;
  submitted_by_name: string;
  page_path: string | null;
  created_at: string;
}

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: FeedbackRecord;
}

const ADMIN_EMAIL = Deno.env.get("FEEDBACK_NOTIFICATION_EMAIL");
const APP_URL = Deno.env.get("APP_URL");
const SMTP_HOST = Deno.env.get("GMAIL_SMTP_HOST") ?? "smtp.gmail.com";
const SMTP_USER = Deno.env.get("GMAIL_SMTP_USER");
const SMTP_PASSWORD = Deno.env.get("GMAIL_SMTP_PASSWORD");

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!ADMIN_EMAIL || !APP_URL || !SMTP_USER || !SMTP_PASSWORD) {
    console.error(
      "feedback-notification is missing required secrets (FEEDBACK_NOTIFICATION_EMAIL, APP_URL, GMAIL_SMTP_USER, GMAIL_SMTP_PASSWORD).",
    );
    // 200, not 500 -- a misconfigured notifier must never make the webhook
    // retry forever or look like the feedback insert itself failed.
    return new Response("Not configured", { status: 200 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const feedback = payload.record;
  if (!feedback) {
    return new Response("Missing record", { status: 400 });
  }

  const link = `${APP_URL}/admin/feedback#${feedback.id}`;
  const submittedAt = new Date(feedback.created_at).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: 587,
      tls: true,
      auth: { username: SMTP_USER, password: SMTP_PASSWORD },
    },
  });

  try {
    await client.send({
      from: SMTP_USER,
      to: ADMIN_EMAIL,
      subject: `[Tradeline feedback] ${feedback.type}: ${feedback.title}`,
      content: `New ${feedback.type} from ${feedback.business_name} (${feedback.submitted_by_name})\n\n${feedback.title}\n\n${feedback.description}\n\nPage: ${feedback.page_path ?? "unknown"}\nSubmitted: ${submittedAt}\n\nView in admin: ${link}`,
      html: `
        <p><strong>${escapeHtml(feedback.type)}</strong> from ${escapeHtml(feedback.business_name)} (${escapeHtml(feedback.submitted_by_name)})</p>
        <h2>${escapeHtml(feedback.title)}</h2>
        <p style="white-space: pre-wrap;">${escapeHtml(feedback.description)}</p>
        <p><strong>Page:</strong> ${escapeHtml(feedback.page_path ?? "unknown")}<br/>
        <strong>Submitted:</strong> ${submittedAt}</p>
        <p><a href="${link}">View in admin feedback</a></p>
      `,
    });
  } catch (error) {
    console.error("Failed to send feedback notification email:", error);
    return new Response("Failed to send email", { status: 500 });
  } finally {
    await client.close();
  }

  return new Response("OK", { status: 200 });
});
