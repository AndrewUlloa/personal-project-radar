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
  title: "Personal Project Radar",
  description: "Personal Project Radar powered researchers analyze faster. Advanced research and insights platform for modern business intelligence. Join thousands of researchers for deeper market insights.",
  openGraph: {
    title: 'Personal Project Radar',
    description: 'Personal Project Radar powered researchers analyze faster. Advanced research and insights platform for modern business intelligence.',
    url: 'https://personal-project-radar.vercel.app',
    siteName: 'Personal Project Radar',
    images: [{
      url: '/opengraph-image.png',
      width: 3840,
      height: 2500,
      alt: 'Personal Project Radar',
    }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Personal Project Radar',
    description: 'Personal Project Radar powered researchers analyze faster. Advanced research and insights platform.',
    images: ['/opengraph-image.png'],
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