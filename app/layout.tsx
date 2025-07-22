import type { Metadata } from "next";
import { Analytics } from '@vercel/analytics/next';
import { Figtree } from 'next/font/google';
import "./globals.css";
import DashboardLayoutClient from "./DashboardLayoutClient";

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "Nivoda Lead Researcher Dashboard",
  description: "Advanced diamond and jewelry industry research platform. Comprehensive market intelligence, competitor analysis, and business insights for Nivoda's lead researchers and strategic teams.",
  openGraph: {
    title: 'Nivoda Lead Researcher Dashboard',
    description: 'Advanced diamond and jewelry industry research platform. Comprehensive market intelligence and competitor analysis for strategic decision making.',
    url: 'https://personal-project-radar.vercel.app',
    siteName: 'Nivoda Lead Researcher Dashboard',
    images: [{
      url: 'https://gb4pqrhxyr1ffqke.public.blob.vercel-storage.com/personalproject_og_image.png',
      width: 3840,
      height: 2500,
      alt: 'Nivoda Lead Researcher Dashboard',
    }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nivoda Lead Researcher Dashboard',
    description: 'Advanced diamond and jewelry industry research platform for strategic market intelligence.',
    images: ['https://gb4pqrhxyr1ffqke.public.blob.vercel-storage.com/personalproject_og_image.png'],
  },
  metadataBase: new URL('https://personal-project-radar.vercel.app'),
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${figtree.variable} font-sans antialiased`}>
        <DashboardLayoutClient>
          {children}
        </DashboardLayoutClient>
        <Analytics />
      </body>
    </html>
  );
}