import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AutoViral AI — Automated Viral Video Platform',
    template: '%s | AutoViral AI',
  },
  description:
    'Create, publish, and optimize viral short-form videos automatically. AI-powered content generation for TikTok, YouTube Shorts, and Instagram Reels.',
  keywords: ['viral video', 'AI content', 'TikTok automation', 'YouTube Shorts', 'content creation'],
  authors: [{ name: 'AutoViral AI' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: 'AutoViral AI',
    description: 'Create viral videos automatically with AI',
    siteName: 'AutoViral AI',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0e1a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(220 18% 9%)',
              border: '1px solid hsl(220 15% 15%)',
              color: 'hsl(220 10% 95%)',
            },
          }}
        />
      </body>
    </html>
  );
}
