import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestMeta } from "@/lib/request-meta";
import { logAudit } from "@/lib/audit-log";
import { escapeHtml } from "@/lib/html-escape";

export async function POST(req: NextRequest) {
  try {
    const meta = await getRequestMeta();
    const ipKey = meta.ip ?? "unknown";

    // Origin check — only accept submissions from our own site.
    const expectedOrigin = process.env.NEXT_PUBLIC_SITE_URL;
    if (expectedOrigin && meta.origin && meta.origin !== expectedOrigin) {
      console.error("[signup.origin]", { received: meta.origin });
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const rl = await checkRateLimit("signup", `ip:${ipKey}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Previše prijava. Sačekajte sat vremena." },
        { status: 429 },
      );
    }

    const formData = await req.formData();

    const data = {
      niche: (formData.get("niche") as string) || "",
      business_name: (formData.get("business_name") as string) || "",
      contact_name: (formData.get("contact_name") as string)?.trim() || "",
      phone: (formData.get("phone") as string)?.trim() || "",
      email: ((formData.get("email") as string) || "").trim() || null,
      city: ((formData.get("city") as string) || "").trim() || null,
      message: ((formData.get("message") as string) || "").trim() || null,
      business_type: ((formData.get("business_type") as string) || "").trim() || null,
    };

    if (!data.contact_name || !data.phone) {
      return NextResponse.json(
        { error: "Ime i telefon su obavezni." },
        { status: 400 },
      );
    }

    // Honeypot — if a hidden field is filled, drop silently.
    const honeypot = formData.get("website") as string | null;
    if (honeypot) {
      return NextResponse.redirect(new URL("/hvala", req.url));
    }

    // Insert via anon-key client + the INSERT-only RLS policy. No service key.
    const supabase = await createClient();
    const { error } = await supabase.from("lead_signups").insert({
      ...data,
      source: "landing",
      ip: meta.ip,
    });

    if (error) {
      // Log status only — do NOT log row contents or response body (PII).
      console.error("[signup.db]", { code: error.code });
      await logAudit({
        action: "signup.received",
        success: false,
        metadata: { code: error.code },
      });
      return NextResponse.json(
        { error: "Greška pri slanju. Pokušajte ponovo." },
        { status: 500 },
      );
    }

    await logAudit({ action: "signup.received" });

    const resendKey = process.env.RESEND_API_KEY;
    const notificationEmail = process.env.NOTIFICATION_EMAIL;

    if (resendKey && notificationEmail) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "FaktureOnline <onboarding@resend.dev>",
            to: notificationEmail,
            subject: `Nova prijava: ${data.business_name || "Nepoznat"}`,
            html: `
              <h2>Nova prijava sa landing stranice</h2>
              <p><strong>Niša:</strong> ${escapeHtml(data.niche)}</p>
              <p><strong>Biznis:</strong> ${escapeHtml(data.business_name)}</p>
              <p><strong>Tip:</strong> ${escapeHtml(data.business_type || "-")}</p>
              <p><strong>Kontakt:</strong> ${escapeHtml(data.contact_name)}</p>
              <p><strong>Telefon:</strong> ${escapeHtml(data.phone)}</p>
              <p><strong>Email:</strong> ${escapeHtml(data.email || "-")}</p>
              <p><strong>Grad:</strong> ${escapeHtml(data.city || "-")}</p>
              <p><strong>Poruka:</strong> ${escapeHtml(data.message || "-")}</p>
            `,
          }),
        });
        if (!res.ok) {
          console.error("[signup.email]", { status: res.status });
        }
      } catch (err) {
        console.error("[signup.email.network]", {
          message: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    return NextResponse.redirect(new URL("/hvala", req.url));
  } catch (err) {
    console.error("[signup.unhandled]", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "Greška pri slanju." },
      { status: 500 },
    );
  }
}
