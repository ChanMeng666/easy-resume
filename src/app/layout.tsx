import type { Metadata } from "next";
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
  title: "Vitex | AI Career Agent",
  description: "Your AI Career Agent - Job-targeted resumes, ATS optimization, and cover letters powered by AI. Transform your job search with intelligent resume tailoring.",
  icons: {
    icon: '/logo/vitex-logo-white-with-bg.svg',
    shortcut: '/logo/vitex-logo-white-with-bg.svg',
    apple: '/logo/vitex-logo-white-with-bg.svg',
  },
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
        <StackAuthProvider>
          {children}
        </StackAuthProvider>
      </body>
    </html>
  );
}
