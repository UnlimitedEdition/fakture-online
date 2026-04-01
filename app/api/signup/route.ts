import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const data = {
      niche: formData.get("niche") as string,
      business_name: formData.get("business_name") as string,
      contact_name: formData.get("contact_name") as string,
      phone: formData.get("phone") as string,
      email: (formData.get("email") as string) || null,
      city: (formData.get("city") as string) || null,
      message: (formData.get("message") as string) || null,
    };

    if (!data.contact_name || !data.phone) {
      return NextResponse.json({ error: "Ime i telefon su obavezni." }, { status: 400 });
    }

    // Insert into Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/lead_signups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          niche: data.niche,
          business_name: data.business_name,
          contact_name: data.contact_name,
          phone: data.phone,
          email: data.email,
          city: data.city,
          message: data.message,
          source: "landing",
        }),
      });
    }

    // Send email notification via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "FaktureOnline <onboarding@resend.dev>",
          to: "REDACTED_EMAIL",
          subject: `Nova prijava: ${data.business_name || "Nepoznat"} - ${data.contact_name}`,
          html: `
            <h2>Nova prijava sa landing stranice</h2>
            <p><strong>Ni\u0161a:</strong> ${data.niche}</p>
            <p><strong>Biznis:</strong> ${data.business_name}</p>
            <p><strong>Kontakt:</strong> ${data.contact_name}</p>
            <p><strong>Telefon:</strong> ${data.phone}</p>
            <p><strong>Email:</strong> ${data.email || "-"}</p>
            <p><strong>Grad:</strong> ${data.city || "-"}</p>
            <p><strong>Poruka:</strong> ${data.message || "-"}</p>
          `,
        }),
      });
    }

    // Redirect to thank-you
    return NextResponse.redirect(new URL("/hvala", req.url));
  } catch {
    return NextResponse.json({ error: "Greska pri slanju." }, { status: 500 });
  }
}
