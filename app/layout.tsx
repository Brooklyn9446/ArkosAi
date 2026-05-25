import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ARKOS — AI-Powered Security Analysis Platform',
  description: 'Scan your GitHub repositories for security vulnerabilities, secrets, and dependency issues, all in one developer security dashboard.',
  metadataBase: new URL('https://arkos-sec.vercel.app'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark scroll-smooth ${cormorant.variable} ${dmSans.variable} ${mono.variable}`}>
      <body className="font-body antialiased bg-void text-ink min-h-screen">
        {children}
      </body>
    </html>
  );
}

