import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
