/**
 * Supabase Edge Function: ai-assist
 *
 * Routes all AI actions through Groq (openai/gpt-oss-20b).
 * Deployed with --no-verify-jwt but verifies auth manually inside.
 *
 * Secrets required:
 *   supabase secrets set GROQ_API_KEY=gsk_...
 */

import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildLessonSource,
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  sourceHash,
  SUMMARY_JSON_SCHEMA,
  validateSummaryPayload,
  type HashableBlock,
  type HashableSection,
  type SummaryPayload,
} from "../_shared/lessonSummaryCore.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, x-supabase-client-platform, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_ACTIONS = [
  "expand",
  "simplify",
  "improve_language",
  "generate_example",
  "generate_summary",
  "generate_quiz",
  "translate_ar_en",
  "translate_en_ar",
  "translate",
  // The AI summary feature ("الملخص الذكي"). Unlike every action above, this
  // one takes no `content`: it reads the lesson from the database itself, so
  // the summary and its source_hash are provably derived from the real lesson
  // and not from whatever a client chose to send.
  "generate_lesson_summary",
] as const;

type AIAction = (typeof VALID_ACTIONS)[number];

interface RequestBody {
  action: AIAction;
  content: string;
  /** Required by `generate_lesson_summary`, ignored by every other action. */
  lessonId?: string;
  language?: "ar" | "en";
  targetLanguage?: "ar" | "en";
  subject?: string;
  gradeLevel?: string;
  options?: {
    summaryLength?: "short" | "medium" | "detailed";
  };
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert educational content assistant for "Waraq Academy", a bilingual Arabic/English learning platform for school students.

Rules:
- Produce safe, clear, and age-appropriate educational content.
- When the input is in Arabic, respond in Arabic unless translation is requested.
- When the input is in English, respond in English unless translation is requested.
- Stay strictly focused on the provided source text — do not introduce unrelated facts or hallucinate.
- Do not use markdown formatting (## ** etc.) unless the source text already uses it.
- Be concise unless explicitly asked to expand.
- Your outputs must be suitable for students of all ages.`;

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildUserPrompt(body: RequestBody): string {
  const { action, content, language, targetLanguage, subject, gradeLevel, options } = body;

  const contextParts: string[] = [];
  if (subject && subject !== "general") contextParts.push(`Subject area: ${subject}.`);
  if (gradeLevel && gradeLevel !== "general") contextParts.push(`Student grade level: ${gradeLevel}.`);
  const context = contextParts.length ? "\n" + contextParts.join(" ") : "";

  switch (action) {
    case "expand":
      return `Expand the following educational content with more detail and clearer explanations. Stay on topic. Add simple clarification and optionally one short illustrative example. Do not hallucinate unrelated facts.${context}

Content:
${content}`;

    case "simplify":
      return `Simplify the following educational content for younger students. Use easier vocabulary and shorter sentences. Preserve the original meaning completely. Do not add unnecessary expansion.${context}

Content:
${content}`;

    case "improve_language":
      return `Improve the grammar, readability, and flow of the following educational content. Fix any errors. Preserve the original meaning and language. Return ONLY the improved text, nothing else.${context}

Content:
${content}`;

    case "generate_example":
      return `Create a useful, simple educational example based on the following content. Make it help students understand the concept. If relevant, include a real-life style example. Do not drift away from the lesson topic.${context}

Content:
${content}`;

    case "generate_summary": {
      const lengthMap: Record<string, string> = {
        short: "1-2 sentences",
        medium: "3-5 sentences",
        detailed: "a detailed paragraph",
      };
      const length = lengthMap[options?.summaryLength || "medium"] || "3-5 sentences";
      return `Write a concise summary of the following educational content in ${length}. Summarize only the supplied content. Keep key points. Do not add external facts.${context}

Content:
${content}`;
    }

    case "generate_quiz":
      return `Generate 3 multiple-choice quiz questions based ONLY on the following educational content. Do not add questions about topics not covered in the content. Each question must have exactly 4 options.

Return your response as a valid JSON array with this exact structure:
[
  {
    "question": "the question text",
    "options": ["option A", "option B", "option C", "option D"],
    "correctIndex": 0,
    "explanation": "brief explanation of why this is correct"
  }
]

Return ONLY the JSON array, no other text before or after it.${context}

Content:
${content}`;

    case "translate_ar_en":
      return `Translate the following Arabic text to English. Preserve the educational tone and meaning. Keep the structure when possible. Return ONLY the translation, nothing else.

${content}`;

    case "translate_en_ar":
      return `Translate the following English text to Arabic. Preserve the educational tone and meaning. Keep the structure when possible. Return ONLY the translation, nothing else.

${content}`;

    case "translate": {
      const fromLang = language === "ar" ? "Arabic" : "English";
      const toLang = targetLanguage === "ar" ? "Arabic" : "English";
      return `Translate the following ${fromLang} text to ${toLang}. Preserve the educational tone and meaning. Keep the structure when possible. Return ONLY the translation, nothing else.

${content}`;
    }

    default:
      return content;
  }
}

// ─── Temperature & Token Config ──────────────────────────────────────────────

function getTemperature(action: string): number {
  if (["translate_ar_en", "translate_en_ar", "translate", "generate_quiz", "improve_language"].includes(action)) {
    return 0.3;
  }
  return 0.7;
}

function getMaxTokens(action: string): number {
  if (action === "expand") return 3000;
  if (action === "generate_quiz") return 2000;
  if (action === "generate_summary") return 1000;
  return 1500;
}

// ─── JSON Response Helper ────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Auth Verification ───────────────────────────────────────────────────────

/**
 * Verify the caller is signed in AND holds a content-authoring role.
 *
 * Previously this only proved "someone is logged in", which meant any student
 * session could spend the platform's Groq quota on any action. Every caller in
 * both clients is an admin or teacher surface — 14 web call sites under
 * pages/admin, pages/teacher and the shared editor components, plus the
 * Flutter teacher lesson editor — so gating on role breaks nothing.
 *
 * Returns the authed client too: the summary action reuses it so that reads
 * run as the CALLER and RLS applies as a second line of defence.
 */
async function verifyAuth(
  req: Request,
): Promise<{
  user: User | null;
  role: string | null;
  client: SupabaseClient | null;
  error: string | null;
  status: number;
}> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, role: null, client: null, error: "Missing authorization header", status: 401 };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      user: null,
      role: null,
      client: null,
      error: "Invalid or expired session. Please log in again.",
      status: 401,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("ai-assist: profile lookup failed:", profileError.message);
    return {
      user: null,
      role: null,
      client: null,
      error: "Could not verify your account permissions. Please try again.",
      status: 403,
    };
  }

  const role = (profile as { role?: string } | null)?.role ?? null;
  if (role !== "teacher" && role !== "super_admin") {
    return {
      user: null,
      role,
      client: null,
      error: "AI tools are available to teachers and administrators only.",
      status: 403,
    };
  }

  return { user, role, client: supabase, error: null, status: 200 };
}

// ─── AI summary: lesson fetch + generation ───────────────────────────────────

/** Groq caps for the summary action. One call per language. */
const SUMMARY_MAX_COMPLETION_TOKENS = 4000;

/**
 * Load a lesson's content as the caller.
 *
 * Reading through the caller's client rather than the service role means RLS
 * still applies, and the explicit ownership check below is the primary gate.
 */
/** The lesson columns the generator reads, plus its embedded subject/stage. */
interface LessonForSummary {
  id: string;
  subject_id: string | null;
  title_ar: string | null;
  title_en: string | null;
  objectives_ar: string | null;
  objectives_en: string | null;
  created_by: string | null;
  subject: {
    id: string;
    title_ar: string | null;
    title_en: string | null;
    teacher_id: string | null;
    stage: { title_ar: string | null; title_en: string | null } | null;
  } | null;
}

async function loadLessonForSummary(client: SupabaseClient, lessonId: string) {
  const { data: lesson, error } = await client
    .from("lessons")
    .select(
      "id, subject_id, title_ar, title_en, objectives_ar, objectives_en, created_by, " +
        "subject:subjects(id, title_ar, title_en, teacher_id, stage:stages(title_ar, title_en))",
    )
    .eq("id", lessonId)
    .maybeSingle();

  if (error) throw new Error(`Could not load the lesson: ${error.message}`);
  if (!lesson) throw new Error("LESSON_NOT_FOUND");

  const [sectionsRes, blocksRes] = await Promise.all([
    client
      .from("lesson_sections")
      .select("id, title_ar, title_en, sort_order")
      .eq("lesson_id", lessonId),
    client
      .from("lesson_blocks")
      .select("id, section_id, type, title_ar, title_en, content_ar, content_en, url, sort_order, is_published")
      .eq("lesson_id", lessonId),
  ]);

  if (sectionsRes.error) throw new Error(`Could not load lesson sections: ${sectionsRes.error.message}`);
  if (blocksRes.error) throw new Error(`Could not load lesson blocks: ${blocksRes.error.message}`);

  return {
    lesson: lesson as unknown as LessonForSummary,
    sections: (sectionsRes.data ?? []) as HashableSection[],
    blocks: (blocksRes.data ?? []) as HashableBlock[],
  };
}

/**
 * One Groq call for one language.
 *
 * Deliberately NOT one call for both. `openai/gpt-oss-20b` is a reasoning
 * model and its hidden reasoning is widely reported to be billed against the
 * completion budget on Groq — which shows up as an empty or mid-sentence
 * response rather than an error. Groq's own docs do not state this either way,
 * so the design assumes the worst: two smaller generations at
 * reasoning_effort "low", each with its own budget.
 *
 * `reasoning_format: "hidden"` is required — Groq returns 400 for "raw"
 * combined with JSON mode.
 */
async function generateSummaryForLanguage(
  canonicalText: string,
  language: "ar" | "en",
  stage: string | null,
  subject: string | null,
): Promise<SummaryPayload> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: buildSummarySystemPrompt({ language, stage, subject }) },
        { role: "user", content: buildSummaryUserPrompt(canonicalText, { language, stage, subject }) },
      ],
      temperature: 0.3,
      max_completion_tokens: SUMMARY_MAX_COMPLETION_TOKENS,
      reasoning_effort: "low",
      reasoning_format: "hidden",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lesson_summary",
          strict: true,
          schema: SUMMARY_JSON_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `AI model returned status ${response.status}`;
    console.error(`Groq API error (${language}):`, errMsg);
    throw new Error(errMsg);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const finishReason = choice?.finish_reason;

  // A reasoning model that exhausts its budget returns finish_reason "length"
  // with truncated or empty content. Say so plainly instead of letting the
  // shape check report confusing nonsense.
  if (finishReason === "length") {
    throw new Error("SUMMARY_TRUNCATED");
  }

  const text = choice?.message?.content?.trim();
  if (!text) {
    throw new Error("SUMMARY_EMPTY");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("SUMMARY_MALFORMED");
  }

  const problem = validateSummaryPayload(parsed);
  if (problem) {
    console.error(`Summary shape rejected (${language}): ${problem}`);
    throw new Error("SUMMARY_MALFORMED");
  }

  return parsed as SummaryPayload;
}

/** The `generate_lesson_summary` action. */
async function handleGenerateLessonSummary(
  client: SupabaseClient,
  userId: string,
  role: string,
  lessonId: string | undefined,
): Promise<Response> {
  if (!lessonId || typeof lessonId !== "string") {
    return jsonResponse({ success: false, error: "Missing required field: lessonId" });
  }

  let loaded;
  try {
    loaded = await loadLessonForSummary(client, lessonId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load the lesson";
    if (message === "LESSON_NOT_FOUND") {
      return jsonResponse({ success: false, code: "LESSON_NOT_FOUND", error: "Lesson not found." }, 404);
    }
    return jsonResponse({ success: false, error: message });
  }

  const { lesson, sections, blocks } = loaded;
  const subject = lesson.subject ?? null;

  // Ownership. Mirrors can_edit_lesson_summary() in migration 108 and the
  // lessons_teacher_update policy in 107: the lesson's creator, or the teacher
  // who owns its subject, or a super_admin.
  const isOwner =
    role === "super_admin" ||
    lesson.created_by === userId ||
    subject?.teacher_id === userId;

  if (!isOwner) {
    return jsonResponse(
      {
        success: false,
        code: "NOT_LESSON_OWNER",
        error: "You can only generate a summary for a lesson in a subject you teach.",
      },
      403,
    );
  }

  const canonicalText = buildLessonSource({
    lesson: {
      title_ar: lesson.title_ar,
      title_en: lesson.title_en,
      objectives_ar: lesson.objectives_ar,
      objectives_en: lesson.objectives_en,
    },
    sections,
    blocks,
  });

  // A lesson with nothing but media blocks produces a near-empty source. The
  // model would happily invent a lesson from the title alone — refuse instead.
  if (canonicalText.replace(/^(LESSON_TITLE_(AR|EN):.*)$/gm, "").trim().length < 120) {
    return jsonResponse({
      success: false,
      code: "LESSON_TOO_SHORT",
      error: "This lesson does not have enough written content to summarise yet.",
    });
  }

  const stage = subject?.stage
    ? (subject.stage.title_ar || subject.stage.title_en || null)
    : null;
  const subjectTitle = subject ? (subject.title_ar || subject.title_en || null) : null;

  let ar: SummaryPayload;
  let en: SummaryPayload;
  try {
    // Sequential, not Promise.all: two concurrent completions against the same
    // Groq key invite a 429, and one failing mid-flight would leave the other
    // burning quota for a result that gets thrown away.
    ar = await generateSummaryForLanguage(canonicalText, "ar", stage, subjectTitle);
    en = await generateSummaryForLanguage(canonicalText, "en", stage, subjectTitle);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    const known = ["SUMMARY_TRUNCATED", "SUMMARY_EMPTY", "SUMMARY_MALFORMED"];
    if (known.includes(message)) {
      return jsonResponse({ success: false, code: message, error: message });
    }
    return jsonResponse({ success: false, code: "AI_ERROR", error: message });
  }

  const hash = await sourceHash(canonicalText);

  // Always status 'draft'. A generated summary is NEVER auto-approved — a
  // teacher has to read it first. Regenerating an approved summary sends it
  // back to draft on purpose: the previously approved text no longer exists.
  const row = {
    lesson_id: lessonId,
    summary_ar: ar.summary,
    key_points_ar: ar.key_points,
    slides_ar: ar.slides,
    summary_en: en.summary,
    key_points_en: en.key_points,
    slides_en: en.slides,
    status: "draft",
    source_hash: hash,
    model: MODEL,
    generated_at: new Date().toISOString(),
    generated_by: userId,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
  };

  const { data: saved, error: saveError } = await client
    .from("lesson_summaries")
    .upsert(row, { onConflict: "lesson_id" })
    .select()
    .single();

  if (saveError) {
    console.error("Failed to save lesson summary:", saveError.message);
    return jsonResponse({
      success: false,
      code: "SAVE_FAILED",
      error: `The summary was generated but could not be saved: ${saveError.message}`,
    });
  }

  return jsonResponse({ success: true, result: saved, action: "generate_lesson_summary", model: MODEL });
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only POST
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  // Verify the user is logged in AND is a teacher or super_admin.
  const { user, role, client, error: authError, status: authStatus } = await verifyAuth(req);
  if (authError || !user) {
    return jsonResponse({ success: false, error: authError || "Unauthorized" }, authStatus || 401);
  }

  // Check Groq API key is configured
  if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not set in Supabase secrets");
    return jsonResponse({
      success: false,
      error: "AI service is not configured. Please set GROQ_API_KEY in Supabase secrets.",
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { action, content } = body;

    if (!action) {
      return jsonResponse({ success: false, error: "Missing required field: action" });
    }

    // Validate action
    if (!VALID_ACTIONS.includes(action as AIAction)) {
      return jsonResponse({
        success: false,
        error: `Invalid action: ${action}`,
      });
    }

    // The summary action reads its input from the database, so it takes a
    // lessonId instead of `content` and is handled entirely on its own path.
    if (action === "generate_lesson_summary") {
      return await handleGenerateLessonSummary(client, user.id, role!, body.lessonId);
    }

    // Every other action operates on client-supplied text.
    if (!content?.trim()) {
      return jsonResponse({
        success: false,
        error: "Missing required fields: action and content",
      });
    }

    // Build prompt
    const userPrompt = buildUserPrompt(body);
    const temperature = getTemperature(action);
    const maxTokens = getMaxTokens(action);

    // Call Groq
    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!groqResponse.ok) {
      const errData = await groqResponse.json().catch(() => ({}));
      const errMsg =
        errData?.error?.message ||
        `AI model returned status ${groqResponse.status}`;
      console.error("Groq API error:", errMsg);
      return jsonResponse({ success: false, error: errMsg });
    }

    const data = await groqResponse.json();
    const resultText = data?.choices?.[0]?.message?.content?.trim();

    if (!resultText) {
      return jsonResponse({
        success: false,
        error: "No response generated by AI model",
      });
    }

    // For quiz: attempt to parse structured JSON from the model output
    let result: unknown = resultText;
    if (action === "generate_quiz") {
      try {
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // If JSON parsing fails, return raw text — frontend will handle it
      }
    }

    return jsonResponse({
      success: true,
      result,
      action,
      model: MODEL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Edge function error:", message);
    return jsonResponse({ success: false, error: message });
  }
});
