import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AppShell from '@/components/ui/AppShell';

export const metadata: Metadata = {
  title: 'CareSphere AI — Elderly Health Monitoring',
  description: 'AI-powered elderly health monitoring system for Malaysia. Track 3: Vital Signs — Project 2030 MyAI Future Hackathon',
  keywords: ['healthcare', 'AI', 'elderly', 'monitoring', 'Gemini', 'Malaysia'],
};

// Inline script runs synchronously BEFORE any CSS or React hydration —
// this is the correct pattern for Next.js App Router dark mode without next-themes.
const themeScript = `(function(){
  try {
    var saved = localStorage.getItem('cs-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = saved === 'dark' || (saved === null && prefersDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: prevents React from resetting the `dark`
          class that the inline script adds before hydration completes */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen antialiased">
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ToastProvider>
                <AppShell>{children}</AppShell>
              </ToastProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
