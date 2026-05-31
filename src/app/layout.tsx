import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Konek — Your Campus. Your Community.",
  description: "The campus social app for Tangub City students. Buy, sell, hangout, and connect with your school community.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Konek",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "Konek",
    title: "Konek — Your Campus. Your Community.",
    description: "The campus social app for Tangub City students.",
  },
  twitter: {
    card: "summary",
    title: "Konek — Your Campus. Your Community.",
    description: "The campus social app for Tangub City students.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#1D9E75" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Konek" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
      </head>
      <body style={{margin: 0, padding: 0, backgroundColor: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
        {children}
        <script src="/sw-register.js" defer></script>
      </body>
    </html>
  );
}
