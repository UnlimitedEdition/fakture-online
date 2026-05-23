import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "FaktureOnline — Online fakture za freelancere i paušalce",
  description:
    "Kreirajte profesionalnu fakturu za 30 sekundi. Pošaljite klijentu, pratite naplatu. Bez Excela. Besplatno za 5 faktura mesečno.",
  keywords: "fakture online, fakturisanje, invoice, freelancer, paušalac, Srbija",
  openGraph: {
    title: "FaktureOnline — Profesionalna faktura za 30 sekundi",
    description: "Bez Excela, bez muke. Kreirajte, pošaljite, naplatite.",
    type: "website",
    locale: "sr_RS",
  },
  appleWebApp: {
    capable: true,
    title: "Fakture",
    statusBarStyle: "black-translucent",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Touching headers() opts the layout into dynamic rendering — required for
  // nonce-based CSP. Next.js auto-applies the nonce to its framework <script>
  // tags after parsing the Content-Security-Policy request header set by
  // proxy.ts; we read x-nonce here only so any future <Script> / inline
  // <style nonce> usage can attach it explicitly.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _nonce = (await headers()).get("x-nonce");

  return (
    <html
      lang="sr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
