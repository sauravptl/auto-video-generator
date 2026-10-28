import type { Metadata } from 'next';
import '@/styles/globals.css';
import { TopBar } from '@/components/header/TopBar';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AgyOnboardingModal } from '@/components/onboarding/AgyOnboardingModal';

export const metadata: Metadata = {
  title: 'CineFlow AI - Cinematic AI Video Production Studio',
  description: 'Produce high-converting multi-scene AI videos with Google Flow, AGY CLI, and 1-click publish to Meta Suite (Instagram & Facebook Reels)',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-studio-950 font-sans text-slate-100 antialiased selection:bg-purple-500 selection:text-white">
        <ThemeProvider>
          <TopBar />
          <main className="container mx-auto p-6 max-w-7xl">{children}</main>
          <AgyOnboardingModal />
        </ThemeProvider>
      </body>
    </html>
  );
}
