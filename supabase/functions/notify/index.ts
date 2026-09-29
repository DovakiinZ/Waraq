/**
 * Supabase Edge Function: notify
 *
 * Email notifications to students, teachers and admins, sent through Resend.
 *
 * ── How it is triggered ─────────────────────────────────────────────────────
 * Postgres triggers (migration `106_email_notifications.sql`) POST the changed
 * row here through pg_net, in the same shape as a Supabase Database Webhook:
 *   { type: 'INSERT'|'UPDATE', table, record, old_record }
 * Triggering from the database — not from the UI — means the web app and the
 * Flutter app both notify without either client knowing about email, and a
 * failed send can never roll back the write (pg_net is fire-and-forget).
 *
 * | table                | event                       | who is emailed          |
 * |----------------------|-----------------------------|-------------------------|
 * | orders               | INSERT                      | teacher (verify payment)|
 * | orders               | status → paid / rejected    | student                 |
 * | announcements        | INSERT (active)             | enrolled students       |
 * | messages             | INSERT                      | receiver (throttled)    |
 * | certificates         | status → issued             | student                 |
 * | teacher_applications | INSERT                      | applicant + super_admins|
 * | teacher_applications | status → approved / rejected| applicant               |
 * | teacher_invites      | INSERT                      | invitee (with link)     |
 *
 * ── Auth ────────────────────────────────────────────────────────────────────
 * Deployed with --no-verify-jwt. Every request must carry
 * `x-webhook-secret: <NOTIFY_WEBHOOK_SECRET>`; the trigger reads the same value
 * from Vault (`notify_webhook_secret`). Recipients are always looked up here
 * with the service role, never taken from the payload, so a forged payload
 * cannot aim email at an arbitrary address.
 *
 * ── Deploy ──────────────────────────────────────────────────────────────────
 *   supabase functions deploy notify --no-verify-jwt
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EmailContent,
  OutgoingEmail,
  render,
  sendBatch,
  sendEmail,
  SITE_URL,
} from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("NOTIFY_WEBHOOK_SECRET") ?? "";

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

type Row = Record<string, any>;
interface Payload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Row | null;
  old_record: Row | null;
}

interface Person {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function person(id: string | null | undefined): Promise<Person | null> {
  if (!id) return null;
  const { data } = await db
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", id)
    .maybeSingle();
  return data as Person | null;
}

async function subject(id: string | null | undefined) {
  if (!id) return null;
  const { data } = await db
    .from("subjects")
    .select("id, title_ar, title_en, teacher_id")
    .eq("id", id)
    .maybeSingle();
  return data as { id: string; title_ar: string; title_en: string | null; teacher_id: string } | null;
}

const hiAr = (n?: string | null) => (n?.trim() ? `مرحباً ${n.trim()}،` : "مرحباً،");
const hiEn = (n?: string | null) => (n?.trim() ? `Hi ${n.trim()},` : "Hi,");
const money = (amount: unknown, currency: unknown) =>
  `${Number(amount ?? 0).toLocaleString("en-US")} ${currency ?? ""}`.trim();

function mail(to: string, content: EmailContent, key: string): OutgoingEmail {
  return {
    to,
    ...render(content),
    idempotencyKey: key,
    tags: [{ name: "type", value: content.tag }],
  };
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function onOrder(p: Payload): Promise<OutgoingEmail[]> {
  const o = p.record!;
  const s = await subject(o.subject_id);
  const titleAr = s?.title_ar ?? "";
  const titleEn = s?.title_en || titleAr;

  if (p.type === "INSERT" && o.status === "pending_payment") {
    const teacher = await person(o.teacher_id);
    if (!teacher?.email) return [];
    return [mail(teacher.email, {
      tag: "order_new",
      subject: `طلب شراء جديد: ${titleAr} · New order: ${titleEn}`,
      url: `${SITE_URL}/teacher/orders`,
      ar: {
        heading: "طلب شراء جديد بانتظار التحقق",
        body: [
          hiAr(teacher.full_name),
          `أرسل ${o.student_full_name} طلب شراء لمادة «${titleAr}» بقيمة ${money(o.amount, o.currency)}.`,
          `حساب شام كاش المُرسِل: ${o.student_payment_account}`,
          "تحقق من وصول الدفعة ثم أكّد الطلب ليحصل الطالب على الوصول.",
        ],
        cta: "مراجعة الطلب",
      },
      en: {
        heading: "New order awaiting verification",
        body: [
          hiEn(teacher.full_name),
          `${o.student_full_name} ordered “${titleEn}” for ${money(o.amount, o.currency)}.`,
          `Sender's Sham Cash account: ${o.student_payment_account}`,
          "Check the payment arrived, then confirm the order to grant access.",
        ],
        cta: "Review order",
      },
    }, `order-new-${o.id}`)];
  }

  if (p.type === "UPDATE" && p.old_record?.status !== o.status) {
    const student = await person(o.student_id);
    if (!student?.email) return [];
    if (o.status === "paid") {
      return [mail(student.email, {
        tag: "order_paid",
        subject: `تم تفعيل «${titleAr}» · “${titleEn}” is unlocked`,
        url: `${SITE_URL}/student/subjects/${o.subject_id}`,
        ar: {
          heading: "تم تأكيد دفعتك",
          body: [hiAr(student.full_name), `أكّد المعلم استلام دفعتك، وأصبحت مادة «${titleAr}» متاحة لك الآن.`],
          cta: "ابدأ التعلّم",
        },
        en: {
          heading: "Your payment is confirmed",
          body: [hiEn(student.full_name), `Your teacher confirmed your payment. “${titleEn}” is now unlocked.`],
          cta: "Start learning",
        },
      }, `order-paid-${o.id}`)];
    }
    if (o.status === "rejected") {
      const note = (o.teacher_notes ?? "").trim();
      return [mail(student.email, {
        tag: "order_rejected",
        subject: `تعذّر تأكيد طلبك · Your order couldn't be confirmed`,
        url: `${SITE_URL}/student/course/${o.subject_id}`,
        quote: note ? { ar: note, en: note } : undefined,
        ar: {
          heading: "تعذّر تأكيد الدفعة",
          body: [
            hiAr(student.full_name),
            `لم يتمكن المعلم من تأكيد دفعتك لمادة «${titleAr}».`,
            ...(note ? ["ملاحظة المعلم:"] : []),
          ],
          cta: "عرض المادة",
          footnote: "إن كنت قد دفعت فعلاً، راسل المعلم من صفحة الرسائل مع إثبات التحويل.",
        },
        en: {
          heading: "Payment couldn't be confirmed",
          body: [
            hiEn(student.full_name),
            `Your teacher couldn't confirm your payment for “${titleEn}”.`,
            ...(note ? ["Teacher's note:"] : []),
          ],
          cta: "View course",
          footnote: "If you did pay, message your teacher from Messages with proof of transfer.",
        },
      }, `order-rejected-${o.id}`)];
    }
  }
  return [];
}

async function onAnnouncement(p: Payload): Promise<OutgoingEmail[]> {
  const a = p.record!;
  if (p.type !== "INSERT" || a.is_active === false) return [];
  const teacher = await person(a.teacher_id);

  // Enrolled students: of the one subject, or of every subject this teacher owns.
  let subjectIds: string[] = [];
  if (a.subject_id) {
    subjectIds = [a.subject_id];
  } else {
    const { data } = await db.from("subjects").select("id").eq("teacher_id", a.teacher_id);
    subjectIds = (data ?? []).map((r: Row) => r.id);
  }
  if (!subjectIds.length) return [];

  const { data: enrol } = await db
    .from("student_subjects")
    .select("student_id")
    .in("subject_id", subjectIds)
    .eq("status", "active");
  const ids = [...new Set((enrol ?? []).map((r: Row) => r.student_id))];
  if (!ids.length) return [];

  const { data: students } = await db
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);

  const from = teacher?.full_name ?? "";
  return (students ?? [])
    .filter((s: Row) => s.email)
    .map((s: Row) => mail(s.email, {
      tag: "announcement",
      subject: `${a.title_ar}${a.title_en ? ` · ${a.title_en}` : ""}`,
      url: `${SITE_URL}/student`,
      quote: { ar: a.body_ar ?? undefined, en: a.body_en ?? undefined },
      ar: {
        heading: a.title_ar,
        body: [hiAr(s.full_name), from ? `إعلان جديد من المعلم ${from}:` : "إعلان جديد من معلمك:"],
        cta: "فتح ورق أكاديمي",
      },
      en: {
        heading: a.title_en || a.title_ar,
        body: [hiEn(s.full_name), from ? `A new announcement from ${from}:` : "A new announcement from your teacher:"],
        cta: "Open Waraq Academy",
      },
    }, `announcement-${a.id}-${s.id}`));
}

async function onMessage(p: Payload): Promise<OutgoingEmail[]> {
  const m = p.record!;
  if (p.type !== "INSERT") return [];

  // Throttle: only email for the FIRST unread message in a conversation.
  // A burst of ten messages is one email, not ten; the next email comes once
  // the receiver has opened the thread (read_at set) and a new message lands.
  const { count } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", m.sender_id)
    .eq("receiver_id", m.receiver_id)
    .is("read_at", null)
    .neq("id", m.id);
  if ((count ?? 0) > 0) return [];

  const [sender, receiver] = await Promise.all([person(m.sender_id), person(m.receiver_id)]);
  if (!receiver?.email) return [];
  const base = receiver.role === "teacher" || receiver.role === "super_admin" ? "teacher" : "student";
  const preview = String(m.content ?? "").slice(0, 400);
  const name = sender?.full_name ?? "";

  return [mail(receiver.email, {
    tag: "message",
    subject: `رسالة جديدة من ${name || "ورق أكاديمي"} · New message from ${name || "Waraq Academy"}`,
    url: `${SITE_URL}/${base}/messages`,
    quote: { ar: preview, en: preview },
    ar: { heading: "رسالة جديدة", body: [hiAr(receiver.full_name), `أرسل لك ${name || "مستخدم"} رسالة:`], cta: "الرد على الرسالة" },
    en: { heading: "New message", body: [hiEn(receiver.full_name), `${name || "Someone"} sent you a message:`], cta: "Reply" },
  }, `message-${m.id}`)];
}

async function onCertificate(p: Payload): Promise<OutgoingEmail[]> {
  const c = p.record!;
  const becameIssued = c.status === "issued" &&
    (p.type === "INSERT" || p.old_record?.status !== "issued");
  if (!becameIssued) return [];
  const student = await person(c.student_id);
  const to = student?.email ?? c.student_email;
  if (!to) return [];
  const course = c.subject_name || c.course_name || "";

  return [mail(to, {
    tag: "certificate_issued",
    subject: `🎓 شهادتك جاهزة · Your certificate is ready`,
    url: `${SITE_URL}/student/certificates`,
    ar: {
      heading: "مبروك! شهادتك جاهزة",
      body: [hiAr(student?.full_name ?? c.student_name), `صدرت شهادة إتمامك لمادة «${course}». يمكنك تنزيلها ومشاركتها الآن.`],
      cta: "عرض شهادتي",
      footnote: `رابط التحقق العام: ${SITE_URL}/verify/${c.verification_code}`,
    },
    en: {
      heading: "Congratulations! Your certificate is ready",
      body: [hiEn(student?.full_name ?? c.student_name), `Your completion certificate for “${course}” has been issued. Download and share it now.`],
      cta: "View my certificate",
      footnote: `Public verification link: ${SITE_URL}/verify/${c.verification_code}`,
    },
  }, `certificate-${c.id}-v${c.version ?? 1}`)];
}

async function onApplication(p: Payload): Promise<OutgoingEmail[]> {
  const a = p.record!;
  const out: OutgoingEmail[] = [];

  if (p.type === "INSERT") {
    if (a.email) {
      out.push(mail(a.email, {
        tag: "application_received",
        subject: "استلمنا طلبك للتدريس · We received your teaching application",
        ar: { heading: "استلمنا طلبك", body: [hiAr(a.full_name), "شكراً لاهتمامك بالتدريس في ورق أكاديمي. سيراجع فريقنا طلبك ونراسلك بالنتيجة على هذا البريد."] },
        en: { heading: "Application received", body: [hiEn(a.full_name), "Thanks for applying to teach on Waraq Academy. Our team will review it and email you the outcome here."] },
      }, `application-received-${a.id}`));
    }
    const { data: admins } = await db.from("profiles").select("email").eq("role", "super_admin");
    for (const ad of admins ?? []) {
      if (!ad.email) continue;
      out.push(mail(ad.email, {
        tag: "application_admin",
        subject: `طلب تدريس جديد: ${a.full_name} · New teacher application`,
        url: `${SITE_URL}/admin/applications`,
        ar: { heading: "طلب تدريس جديد", body: [`${a.full_name} (${a.email}) قدّم طلباً للتدريس.`, ...(a.major ? [`التخصص: ${a.major}`] : [])], cta: "مراجعة الطلبات" },
        en: { heading: "New teacher application", body: [`${a.full_name} (${a.email}) applied to teach.`, ...(a.major ? [`Major: ${a.major}`] : [])], cta: "Review applications" },
      }, `application-admin-${a.id}-${ad.email}`));
    }
    return out;
  }

  if (p.type === "UPDATE" && p.old_record?.status !== a.status && a.email) {
    if (a.status === "approved") {
      out.push(mail(a.email, {
        tag: "application_approved",
        subject: "تم قبول طلبك للتدريس · Your teaching application is approved",
        url: `${SITE_URL}/login`,
        ar: { heading: "أهلاً بك معلماً في ورق أكاديمي", body: [hiAr(a.full_name), "يسعدنا إبلاغك بقبول طلبك. سجّل الدخول لإنشاء أول مادة لك."], cta: "تسجيل الدخول" },
        en: { heading: "Welcome aboard, teacher", body: [hiEn(a.full_name), "Your application has been approved. Sign in to create your first course."], cta: "Sign in" },
      }, `application-approved-${a.id}`));
    } else if (a.status === "rejected") {
      out.push(mail(a.email, {
        tag: "application_rejected",
        subject: "بخصوص طلبك للتدريس · About your teaching application",
        ar: { heading: "شكراً لاهتمامك", body: [hiAr(a.full_name), "راجعنا طلبك للتدريس ولن نتمكن من قبوله حالياً. نشكر اهتمامك ونرحّب بتقديمك مجدداً مستقبلاً."] },
        en: { heading: "Thank you for applying", body: [hiEn(a.full_name), "We reviewed your application and can't accept it at this time. Thanks for your interest — you're welcome to apply again later."] },
      }, `application-rejected-${a.id}`));
    }
  }
  return out;
}

async function onInvite(p: Payload): Promise<OutgoingEmail[]> {
  const i = p.record!;
  if (p.type !== "INSERT" || i.status !== "pending" || !i.email || !i.token_hash) return [];
  return [mail(i.email, {
    tag: "teacher_invite",
    subject: "دعوة للتدريس في ورق أكاديمي · Invitation to teach on Waraq Academy",
    url: `${SITE_URL}/invite/${i.token_hash}`,
    ar: {
      heading: "دعوة للانضمام كمعلم",
      body: [hiAr(i.full_name), "تمت دعوتك للانضمام إلى ورق أكاديمي كمعلم. اضغط الزر لإنشاء حسابك."],
      cta: "قبول الدعوة",
      footnote: "الدعوة صالحة لمدة 7 أيام.",
    },
    en: {
      heading: "You're invited to teach",
      body: [hiEn(i.full_name), "You've been invited to join Waraq Academy as a teacher. Use the button to create your account."],
      cta: "Accept invite",
      footnote: "This invite is valid for 7 days.",
    },
  }, `invite-${i.id}`)];
}

const HANDLERS: Record<string, (p: Payload) => Promise<OutgoingEmail[]>> = {
  orders: onOrder,
  announcements: onAnnouncement,
  messages: onMessage,
  certificates: onCertificate,
  teacher_applications: onApplication,
  teacher_invites: onInvite,
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const given = req.headers.get("x-webhook-secret") ?? "";
  if (!WEBHOOK_SECRET || !timingSafeEqual(given, WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const handler = HANDLERS[payload.table];
  if (!handler || !payload.record) {
    return Response.json({ skipped: true, reason: "no handler" });
  }

  try {
    const emails = await handler(payload);
    if (!emails.length) return Response.json({ sent: 0 });
    const sent = emails.length === 1 ? (await sendEmail(emails[0]), 1) : await sendBatch(emails);
    return Response.json({ sent });
  } catch (err) {
    console.error("notify failed", payload.table, payload.type, err);
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
});
