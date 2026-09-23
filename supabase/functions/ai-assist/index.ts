/**
 * Supabase Edge Function: ai-assist
 *
 * Routes all AI actions through Groq (openai/gpt-oss-20b).
 * Deployed with --no-verify-jwt but verifies auth manually inside.
 *
 * Secrets required:
 *   supabase secrets set GROQ_API_KEY=gsk_...
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
] as const;

type AIAction = (typeof VALID_ACTIONS)[number];

interface RequestBody {
  action: AIAction;
  content: string;
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

async function verifyAuth(req: Request): Promise<{ user: any | null; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "Missing authorization header" };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null, error: "Invalid or expired session. Please log in again." };
  }

  return { user, error: null };
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

  // Verify the user is logged in
  const { user, error: authError } = await verifyAuth(req);
  if (authError || !user) {
    return jsonResponse({ success: false, error: authError || "Unauthorized" }, 401);
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

    // Validate required fields
    if (!action || !content?.trim()) {
      return jsonResponse({
        success: false,
        error: "Missing required fields: action and content",
      });
    }

    // Validate action
    if (!VALID_ACTIONS.includes(action as AIAction)) {
      return jsonResponse({
        success: false,
        error: `Invalid action: ${action}`,
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
