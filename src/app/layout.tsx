import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Titan_One } from "next/font/google";
import { StackAuthProvider } from "@/components/auth/StackProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Titan One - Brand display font for headlines and brand elements.
 * Used for Hero titles, CTA headings, and brand name displays.
 */
const titanOne = Titan_One({
  weight: "400",
  variable: "--font-titan-one",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.vitex.org.nz"),
  title: "Vitex | AI Career Agent",
  description: "Your AI Career Agent - Job-targeted resumes, ATS optimization, and cover letters powered by AI. Transform your job search with intelligent resume tailoring.",
  icons: {
    icon: '/logo/vitex-logo-white-with-bg.svg',
    shortcut: '/logo/vitex-logo-white-with-bg.svg',
    apple: '/logo/vitex-logo-white-with-bg.svg',
  },
  openGraph: {
    title: "Vitex | AI Career Agent",
    description: "Job-targeted resumes, ATS scoring, and cover letters — powered by AI.",
    type: "website",
    siteName: "Vitex",
    url: "https://www.vitex.org.nz",
    images: [
      {
        url: "/og-cover.png",
        width: 1200,
        height: 630,
        alt: "Vitex — AI Career Agent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vitex | AI Career Agent",
    description: "Job-targeted resumes, ATS scoring, and cover letters — powered by AI.",
    images: ["/og-cover.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${titanOne.variable} antialiased`}
      >
        {/* Fallback: if JS never runs (or a scroll observer fails), force
            scroll-reveal sections visible so content is never stuck hidden. */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html: '.motion-reveal{opacity:1 !important;transform:none !important;}',
            }}
          />
        </noscript>
        <StackAuthProvider>
          {children}
        </StackAuthProvider>
      </body>
    </html>
  );
}
