import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import {
  siteBrandName,
  siteDescription,
  siteUrl,
  siteOgImageUrl,
  siteLocale,
  siteOpenGraphLocale,
  siteIconsMetadata,
} from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Every head value comes from the environment; anything unset is omitted rather
// than replaced by a baked-in default. Read at request time so a redeploy for
// another operator needs no code change.
export function generateMetadata(): Metadata {
  const brand = siteBrandName();
  const description = siteDescription();
  const url = siteUrl();
  const image = siteOgImageUrl();
  const ogLocale = siteOpenGraphLocale();

  return {
    ...(brand ? { title: brand } : {}),
    ...(description ? { description } : {}),
    ...(url ? { metadataBase: url } : {}),
    openGraph: {
      ...(brand ? { title: brand, siteName: brand } : {}),
      ...(description ? { description } : {}),
      ...(url ? { url: url.toString() } : {}),
      ...(ogLocale ? { locale: ogLocale } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      ...(brand ? { title: brand } : {}),
      ...(description ? { description } : {}),
      ...(image ? { images: [image] } : {}),
    },
    ...siteIconsMetadata(),
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={siteLocale() ?? "en"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-foreground/10 py-4 text-center text-xs text-foreground/50">
          <nav className="flex justify-center gap-4">
            <Link href="/privacy" className="hover:text-foreground/80">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground/80">Terms</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
