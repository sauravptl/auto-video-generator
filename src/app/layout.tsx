import type { Metadata } from 'next';
import '@/styles/globals.css';
import { TopBar } from '@/components/header/TopBar';

export const metadata: Metadata = {
  title: 'Auto AI Video Production Tool',
  description: 'Generate multi-scene videos with Google Flow, AGY CLI, and publish to Meta Suite',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-studio-950 font-sans text-slate-100 antialiased">
        <TopBar />
        <main className="container mx-auto p-6 max-w-7xl">{children}</main>
      </body>
    </html>
  );
}
