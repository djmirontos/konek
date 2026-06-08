import type { Metadata } from "next";
import { SchoolProvider } from "@/context/SchoolContext";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import DesktopLayout from "@/components/DesktopLayout";
import BackButtonHandler from "@/components/BackButtonHandler";
import OfflineDetector from "@/components/OfflineDetector";
import StatusBarHandler from "@/components/StatusBarHandler";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Klasmeyt — Your Campus. Your Community.",
  description: "The campus social app for Tangub City students. Buy, sell, hangout, and connect with your school community.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Klasmeyt",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "Klasmeyt",
    title: "Klasmeyt — Your Campus. Your Community.",
    description: "The campus social app for Tangub City students.",
  },
  twitter: {
    card: "summary",
    title: "Klasmeyt — Your Campus. Your Community.",
    description: "The campus social app for Tangub City students.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#2BB39A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Klasmeyt" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
      </head>
      <body style={{margin: 0, padding: 0, backgroundColor: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
        <SchoolProvider>
          <BackButtonHandler />
          <StatusBarHandler />
          <OfflineDetector />
          <DesktopLayout>{children}</DesktopLayout>
        </SchoolProvider>
        <script src="/sw-register.js" defer></script>
      </body>
    </html>
  );
}
