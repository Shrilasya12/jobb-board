import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

/*
  get-signed-url

  POST JSON body:
  { "path": "applications/12345-resume.pdf", "expires": 60 }

  Function secrets required (set in GitHub secrets -> deployed as project secrets):
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - STORAGE_BUCKET (optional, defaults to "resumes")

  Returns:
  { "signedUrl": "https://..." }
*/

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    const env = Deno.env;
    const SUPABASE_URL = env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = env.get("SUPABASE_SERVICE_ROLE_KEY");
    const STORAGE_BUCKET = env.get("STORAGE_BUCKET") || "resumes";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const path = body?.path;
    const expires = typeof body?.expires === "number" ? body.expires : 60;

    if (!path) {
      return new Response(JSON.stringify({ error: "path is required in body" }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, expires);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ signedUrl: data?.signedUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});