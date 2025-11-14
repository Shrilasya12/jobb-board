import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

/*
  send-application-email

  POST JSON body:
  { "application": {...}, "job": {...} }

  Function secrets required:
  - SENDGRID_API_KEY
  - EMAIL_FROM
  - EMAIL_TO

  This function sends a plain-text email using SendGrid.
*/

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    const env = Deno.env;
    const SENDGRID_API_KEY = env.get("SENDGRID_API_KEY");
    const EMAIL_FROM = env.get("EMAIL_FROM");
    const EMAIL_TO = env.get("EMAIL_TO");

    if (!SENDGRID_API_KEY || !EMAIL_FROM || !EMAIL_TO) {
      return new Response(JSON.stringify({ error: "Missing email configuration in function secrets" }), { status: 500 });
    }

    const payload = await req.json().catch(() => null);
    if (!payload || !payload.application || !payload.job) {
      return new Response(JSON.stringify({ error: "application and job required in body" }), { status: 400 });
    }

    const app = payload.application;
    const job = payload.job;

    const subject = `New application: ${job.title} — ${app.full_name}`;
    const content = [
      `A new application has been submitted.`,
      ``,
      `Job: ${job.title}`,
      `Applicant: ${app.full_name}`,
      `Email: ${app.email}`,
      `Phone: ${app.phone_number}`,
      `Location: ${app.location}`,
      ``,
      `Why interested:`,
      `${app.why_interested || '(none)'}`,
      ``,
      `Resume path: ${app.resume_path || 'N/A'}`,
      `Cover letter path: ${app.cover_letter_path || 'N/A'}`,
      ``,
      `Log into admin to review the full application.`
    ].join("\n");

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: EMAIL_TO }] }],
        from: { email: EMAIL_FROM },
        subject,
        content: [{ type: "text/plain", value: content }]
      })
    });

    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: "SendGrid error", detail }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});