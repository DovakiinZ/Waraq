/**
 * Shared email plumbing for the `send-auth-email` and `notify` Edge Functions.
 *
 * Sending goes through Resend's HTTP API (https://resend.com/docs/api-reference).
 * No SDK: one fetch is all we need, and it keeps the Deno bundle tiny.
 *
 * ── Secrets (supabase secrets set …) ────────────────────────────────────────
 *   RESEND_API_KEY   re_… — a "sending access" key, created with
 *                    `resend api-keys create --name supabase --permission sending_access`
 *   EMAIL_FROM       e.g. `Waraq Academy <no-reply@mail.waraq.academy>`.
 *                    The domain must be verified in Resend (`resend domains list`).
 *   SITE_URL         Public web origin used in every link. Defaults below.
 *
 * ── Design ──────────────────────────────────────────────────────────────────
 * Every email is bilingual — Arabic block (RTL) first, English block below —
 * because the recipient's language is not reliably known (auth emails fire
 * before a profile exists, and `language_pref` is 'ar' for every live row).
 * The look mirrors the arcade theme in `src/index.css`: radius 0, 2px deep
 * green borders, a hard offset shadow on the button, and text on electric
 * green is always deep green, never white. Email clients ignore CSS
 * variables, so the hex values are repeated here — keep them in sync.
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM =
  Deno.env.get("EMAIL_FROM") ?? "Waraq Academy <onboarding@resend.dev>";
export const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://www.waraq.academy")
  .replace(/\/+$/, "");

const C = {
  deep: "#07301F", // ink / line / band
  green: "#22DE7C", // accent — the only fill
  paper: "#FFFFFF",
  mute: "#4A6B5C",
  soft: "#E9FBF1",
};

export interface OutgoingEmail {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Resend dedupes on this for 24h, so a retried webhook never double-sends. */
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
}

export class EmailError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

export async function sendEmail(email: OutgoingEmail): Promise<string> {
  if (!RESEND_API_KEY) throw new EmailError("RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(email.idempotencyKey
        ? { "Idempotency-Key": email.idempotencyKey.slice(0, 256) }
        : {}),
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: email.tags,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new EmailError(
      `Resend ${res.status}: ${body?.message ?? JSON.stringify(body)}`,
      res.status,
    );
  }
  return body.id as string;
}

/**
 * One email per recipient (never a shared To: line — that would leak every
 * student's address to every other student). Resend's batch endpoint takes
 * 100 per call.
 */
export async function sendBatch(
  emails: OutgoingEmail[],
  idempotencyKey?: string,
): Promise<number> {
  if (!RESEND_API_KEY) throw new EmailError("RESEND_API_KEY is not set");
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(idempotencyKey
          ? { "Idempotency-Key": `${idempotencyKey}-${i}`.slice(0, 256) }
          : {}),
      },
      body: JSON.stringify(
        chunk.map((e) => ({
          from: EMAIL_FROM,
          to: e.to,
          subject: e.subject,
          html: e.html,
          text: e.text,
          tags: e.tags,
        })),
      ),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new EmailError(
        `Resend batch ${res.status}: ${body?.message ?? JSON.stringify(body)}`,
        res.status,
      );
    }
    sent += chunk.length;
  }
  return sent;
}

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** One language's worth of copy. Plain strings — they are escaped on render. */
export interface Copy {
  heading: string;
  /** Paragraphs. */
  body: string[];
  cta?: string;
  /** Small print under the button. */
  footnote?: string;
}

export interface EmailContent {
  subject: string; // Arabic first, English after " · "
  ar: Copy;
  en: Copy;
  /** Absolute URL for the button. */
  url?: string;
  /** A one-time code shown in a box (auth OTP). */
  code?: string;
  /** Optional quoted block (a message or announcement body), shown in both halves. */
  quote?: { ar?: string; en?: string };
  tag: string;
}

function section(copy: Copy, dir: "rtl" | "ltr", c: EmailContent): string {
  const align = dir === "rtl" ? "right" : "left";
  const font = dir === "rtl"
    ? "'IBM Plex Sans Arabic',Tajawal,Tahoma,Arial,sans-serif"
    : "'IBM Plex Sans','Segoe UI',Helvetica,Arial,sans-serif";
  const quote = dir === "rtl" ? (c.quote?.ar ?? c.quote?.en) : (c.quote?.en ?? c.quote?.ar);
  return `
<tr><td dir="${dir}" style="padding:28px 28px 8px;text-align:${align};font-family:${font};color:${C.deep};">
  <h1 style="margin:0 0 14px;font-size:22px;line-height:1.4;font-weight:700;">${esc(copy.heading)}</h1>
  ${copy.body.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.8;">${esc(p)}</p>`).join("")}
  ${quote
    ? `<div style="margin:6px 0 16px;padding:14px 16px;border:2px solid ${C.deep};background:${C.soft};font-size:15px;line-height:1.8;white-space:pre-wrap;">${esc(quote)}</div>`
    : ""}
  ${c.code
    ? `<div style="margin:6px 0 16px;padding:14px;border:2px dashed ${C.deep};text-align:center;font-family:'Courier New',monospace;font-size:28px;font-weight:700;letter-spacing:6px;" dir="ltr">${esc(c.code)}</div>`
    : ""}
  ${c.url && copy.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 16px;${dir === "rtl" ? "margin-left:auto;" : ""}"><tr>
        <td style="background:${C.green};border:2px solid ${C.deep};box-shadow:4px 4px 0 ${C.deep};">
          <a href="${esc(c.url)}" style="display:inline-block;padding:12px 24px;font-family:${font};font-size:15px;font-weight:700;color:${C.deep};text-decoration:none;">${esc(copy.cta)}</a>
        </td></tr></table>`
    : ""}
  ${copy.footnote
    ? `<p style="margin:0 0 12px;font-size:12px;line-height:1.7;color:${C.mute};">${esc(copy.footnote)}</p>`
    : ""}
</td></tr>`;
}

export function render(c: EmailContent): { subject: string; html: string; text: string } {
  const html = `<!doctype html>
<html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.soft};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.soft};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${C.paper};border:2px solid ${C.deep};box-shadow:6px 6px 0 ${C.deep};">
  <tr><td style="background:${C.deep};padding:18px 28px;" dir="rtl">
    <span style="font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;font-size:20px;font-weight:700;color:${C.paper};">ورق أكاديمي</span>
    <span style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.green};">&nbsp;·&nbsp;Waraq Academy</span>
  </td></tr>
  <tr><td style="height:6px;background:${C.green};font-size:0;line-height:0;">&nbsp;</td></tr>
  ${section(c.ar, "rtl", c)}
  <tr><td style="padding:0 28px;"><div style="border-top:2px dashed ${C.deep};opacity:.25;"></div></td></tr>
  ${section(c.en, "ltr", c)}
  <tr><td style="padding:16px 28px;border-top:2px solid ${C.deep};font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${C.mute};text-align:center;">
    <span dir="rtl">ورقة بعد ورقة.. نكبر</span> · Page by page, we grow.<br>
    <a href="${SITE_URL}" style="color:${C.deep};">${esc(SITE_URL.replace(/^https?:\/\//, ""))}</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const plain = (copy: Copy, quote?: string) =>
    [
      copy.heading,
      "",
      ...copy.body,
      ...(quote ? ["", quote] : []),
      ...(c.code ? ["", c.code] : []),
      ...(c.url && copy.cta ? ["", `${copy.cta}: ${c.url}`] : []),
      ...(copy.footnote ? ["", copy.footnote] : []),
    ].join("\n");

  const text = [
    plain(c.ar, c.quote?.ar ?? c.quote?.en),
    "\n—————\n",
    plain(c.en, c.quote?.en ?? c.quote?.ar),
    "\n—\nWaraq Academy · ورق أكاديمي",
    SITE_URL,
  ].join("\n");

  return { subject: c.subject, html, text };
}
