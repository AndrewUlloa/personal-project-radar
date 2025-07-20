import type { Metadata } from "next";
import { Analytics } from '@vercel/analytics/next';
import { Figtree } from 'next/font/google';
import "./globals.css";

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "Company Researcher",
  description: "Instantly get detailed research insights and know everything about any company inside out.",
  openGraph: {
    title: 'Company Researcher',
    description: 'Instantly get detailed research insights and know everything about any company inside out.',
    images: ['https://companyresearcher.exa.ai/opengraph-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Company Researcher',
    description: 'Instantly get detailed research insights and know everything about any company inside out.',
    images: ['https://companyresearcher.exa.ai/opengraph-image.jpg'],
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
        className={`${figtree.variable} font-sans antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}