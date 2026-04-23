import "server-only";
import type { RenderedEmail } from "./render";

/**
 * Resend send adapter. Uses the Resend REST API directly (no SDK) to keep
 * the dependency tree small.
 *
 * Dev fallback: if `RESEND_API_KEY` is unset, log to console and succeed.
 * This lets the webhook processor complete locally without configuring Resend.
 */

export type SendArgs = {
  to: string;
  from?: string;
  email: RenderedEmail;
};

export type SendResult =
  | { ok: true; id: string | null; mode: "sent" | "console" }
  | { ok: false; error: string };

const DEFAULT_FROM = "Waystar QPP <onboarding@resend.dev>";

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from =
    args.from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;

  if (!key) {
    console.log("[email] (dev fallback, no RESEND_API_KEY)", {
      to: args.to,
      from,
      subject: args.email.subject,
    });
    return { ok: true, id: null, mode: "console" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: args.email.subject,
        html: args.email.html,
        text: args.email.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Resend ${res.status}: ${detail || res.statusText}`,
      };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id ?? null, mode: "sent" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown send error";
    return { ok: false, error: msg };
  }
}
