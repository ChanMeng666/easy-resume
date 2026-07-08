import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.vitex.org.nz"),
  title: "Vitex — Career as Code",
  description: "Compile a job-ready resume PDF from a job description and your background — from the web, a CLI, or your AI assistant (ChatGPT / Claude via MCP). Pay only when a real PDF is built; refines and edits are free.",
  // Icons are served via Next.js file conventions: src/app/icon.png (512×512),
  // src/app/apple-icon.png (180×180), and src/app/favicon.ico. No manual metadata
  // needed — Next auto-injects the correct <link> tags.
  openGraph: {
    title: "Vitex — Career as Code",
    description: "Your career is source code. Vitex compiles a tailored, ATS-scored resume PDF on demand — from the web or straight from your AI assistant.",
    type: "website",
    siteName: "Vitex",
    url: "https://www.vitex.org.nz",
    images: [
      {
        url: "/og-cover.png",
        width: 1200,
        height: 630,
        alt: "Vitex — Career as Code",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vitex — Career as Code",
    description: "Your career is source code. Vitex compiles a tailored, ATS-scored resume PDF on demand — from the web or straight from your AI assistant.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
