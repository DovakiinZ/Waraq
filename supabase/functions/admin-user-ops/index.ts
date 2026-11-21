/**
 * Supabase Edge Function: admin-user-ops
 *
 * Privileged user operations for the admin panel: creating a teacher's auth
 * account and setting a password.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * These two calls used to run in the BROWSER, through `src/lib/supabaseAdmin.ts`,
 * against a client built with the `service_role` key read from
 * `VITE_SUPABASE_SERVICE_ROLE_KEY`. Vite inlines every `VITE_`-prefixed variable
 * into the bundle, so that design publishes a key that bypasses every RLS policy
 * to anyone who opens DevTools. It only ever "worked" locally because the
 * variable was absent from the deployment — which is also why the admin
 * password button failed with "Service Role Key is required".
 *
 * The key now stays here, server-side, and the browser gets an ordinary
 * function call. `src/lib/supabaseAdmin.ts` has been deleted; do not recreate it.
 *
 * ── Secrets ─────────────────────────────────────────────────────────────────
 * None to set. Supabase injects SUPABASE_URL, SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY into every Edge Function automatically, and the
 * injected value follows key rotation — so rotating `service_role` in the
 * dashboard does not require redeploying this function.
 *
 * ── Deploy ──────────────────────────────────────────────────────────────────
 *   supabase functions deploy admin-user-ops
 *
 * Deployed WITH JWT verification (the default): every caller must present a
 * valid user token. Authorisation beyond that — super_admin only — is enforced
 * below, because a valid token proves who you are, not what you may do.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, x-supabase-client-platform, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "create_user" | "set_password";

interface RequestBody {
  action: Action;
  email?: string;
  password?: string;
  fullName?: string;
  role?: "teacher" | "student";
  /** Target auth user id. Required by set_password. */
  userId?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * A password policy, enforced here rather than only in the dialog. Client-side
 * validation is a convenience; this is the boundary that actually holds.
 */
function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length === 0) return "Password is required";
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (pw.length > 72) return "Password must be at most 72 characters";
  return null;
}

function emailProblem(email: unknown): string | null {
  if (typeof email !== "string" || !email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Invalid email";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  // ── 1. Who is calling? ────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ success: false, error: "Missing Authorization header" }, 401);
  }

  const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await asCaller.auth.getUser();
  if (userError || !user) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  // ── 2. May they do this? ──────────────────────────────────────────────────
  // Read the role with the service client, not the caller's client: RLS on
  // `profiles` would otherwise decide what the caller is allowed to see about
  // themselves, and an authorisation check must not depend on that.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return json({ success: false, error: "Could not verify permissions" }, 500);
  }
  if (callerProfile?.role !== "super_admin") {
    // Deliberately identical shape to the 401 above: a non-admin learns only
    // that they may not do this, not whether the operation or target exists.
    return json({ success: false, error: "Forbidden" }, 403);
  }

  // ── 3. Do the work ────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const role = body.role === "student" ? "student" : "teacher";

  switch (body.action) {
    case "create_user": {
      const emailErr = emailProblem(body.email);
      if (emailErr) return json({ success: false, error: emailErr }, 400);

      // An explicit password is optional: an account created without one gets a
      // random secret the admin never sees, and the teacher uses the reset flow.
      const password = body.password?.trim()
        ? body.password.trim()
        : crypto.randomUUID() + crypto.randomUUID();

      if (body.password?.trim()) {
        const pwErr = passwordProblem(password);
        if (pwErr) return json({ success: false, error: pwErr }, 400);
      }

      const { data, error } = await admin.auth.admin.createUser({
        email: body.email!.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: body.fullName?.trim() ?? "",
          role,
        },
      });

      if (error) {
        const msg = error.message ?? "";
        const duplicate = /already (been )?registered|already exists|duplicate/i.test(msg);
        return json(
          { success: false, error: msg, code: duplicate ? "email_exists" : "create_failed" },
          duplicate ? 409 : 400,
        );
      }

      // Migration 118 starts every new teacher PENDING, because a public
      // signup and this admin call look identical to the database. A teacher
      // a super_admin creates here is vetted by definition, so approve it.
      // The service client has no auth.uid(), which 115 permits.
      if (role === "teacher" && data.user?.id) {
        const { error: activateError } = await admin
          .from("profiles")
          .update({ is_active: true })
          .eq("id", data.user.id);
        if (activateError) {
          console.error("admin-user-ops: could not activate new teacher", activateError);
        }
      }

      return json({ success: true, userId: data.user?.id, email: data.user?.email });
    }

    case "set_password": {
      const pwErr = passwordProblem(body.password);
      if (pwErr) return json({ success: false, error: pwErr }, 400);

      // Path A: the auth user exists — just set the password.
      if (body.userId) {
        const { error } = await admin.auth.admin.updateUserById(body.userId, {
          password: body.password!,
        });
        if (!error) {
          return json({ success: true, created: false });
        }
        const notFound =
          /not found/i.test(error.message ?? "") ||
          (error as { status?: number }).status === 404;
        if (!notFound) {
          return json({ success: false, error: error.message }, 400);
        }
        // else fall through to path B
      }

      // Path B: a "shadow" profile row with no auth user behind it. Create the
      // account with the requested password so the admin's single action does
      // what they meant, rather than failing with "user not found".
      const emailErr = emailProblem(body.email);
      if (emailErr) {
        return json(
          { success: false, error: "No auth account for this profile, and no email to create one" },
          404,
        );
      }

      const { data, error: createError } = await admin.auth.admin.createUser({
        email: body.email!.trim(),
        password: body.password!,
        email_confirm: true,
        user_metadata: { full_name: body.fullName?.trim() ?? "", role },
      });

      if (createError) {
        return json({ success: false, error: createError.message }, 400);
      }
      return json({ success: true, created: true, userId: data.user?.id });
    }

    default:
      return json({ success: false, error: "Unknown action" }, 400);
  }
});
