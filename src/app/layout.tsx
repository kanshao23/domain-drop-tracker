import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://domaindrop.watch";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "DomainDrop – Track premium domain drops",
  description: "Get notified the moment a premium domain drops. Never miss a great domain again.",
  openGraph: {
    title: "DomainDrop – Track premium domain drops",
    description: "Get notified the moment a premium domain drops.",
    url: "/",
    siteName: "DomainDrop",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
