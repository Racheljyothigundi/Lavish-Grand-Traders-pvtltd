import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(
  apiKey: string,
  idempotencyKey: string,
  payload: { from: string; to: string[]; subject: string; html: string },
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Resend rejected the email: ${await response.text()}`);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: authData, error: authError } = await service.auth.getUser(token);
    if (authError || !authData.user?.email) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const user = authData.user;
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("full_name, email, phone, created_at, welcome_email_sent_at")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;
    if (profile.welcome_email_sent_at) {
      return Response.json({ sent: false, reason: "already_sent" }, { headers: corsHeaders });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    if (!apiKey || !from) throw new Error("Email service is not configured");

    const metadata = user.user_metadata ?? {};
    const name = profile.full_name || metadata.full_name || metadata.name || "Customer";
    const email = profile.email || user.email;
    const phone = profile.phone || metadata.phone || metadata.phone_number || "Not provided";
    const provider = user.app_metadata?.provider || "email";
    const companyEmail =
      Deno.env.get("COMPANY_NOTIFICATION_EMAIL") || "lavishgrandtraderspvtltd@gmail.com";

    await sendEmail(apiKey, `welcome-customer-${user.id}`, {
      from,
      to: [email],
      subject: "Welcome to Lavish Grand Traders",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e3a32">
          <h1>Welcome to Lavish Grand Traders</h1>
          <p>Hello ${escapeHtml(name)},</p>
          <p>You have signed in successfully to the Lavish Grand Traders website.</p>
          <p>You can now save your cart, track orders and manage your account.</p>
          <p><a href="https://www.lavishgrandtraders.com/account">Open your account</a></p>
        </div>
      `,
    });

    await sendEmail(apiKey, `welcome-company-${user.id}`, {
      from,
      to: [companyEmail],
      subject: `New customer registered: ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>New Lavish Grand Traders customer</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
          <p><strong>Sign-up method:</strong> ${escapeHtml(provider)}</p>
          <p><strong>Customer ID:</strong> ${escapeHtml(user.id)}</p>
          <p><strong>Created:</strong> ${escapeHtml(profile.created_at)}</p>
        </div>
      `,
    });

    const { error: updateError } = await service
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", user.id);
    if (updateError) throw updateError;

    return Response.json({ sent: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("[send-welcome-email]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to send email" },
      { status: 500, headers: corsHeaders },
    );
  }
});
