import type { Metadata } from "next";
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
  title: "Vitex",
  description: "Your Career, Perfectly Composed - Professional LaTeX Resume Generator",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StackAuthProvider>
          {children}
        </StackAuthProvider>
      </body>
    </html>
  );
}
