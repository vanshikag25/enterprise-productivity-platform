import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';
import 'stream-chat-react/dist/css/index.css';
import './globals.css';
import { ToastProvider } from '@/hooks/use-toast';
import { RoleProvider } from '@/hooks/use-role';
import { AppShell } from '@/components/layout/app-shell';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Enterprise Productivity', template: '%s | Enterprise Productivity' },
  description: 'Enterprise productivity suite — chat, tasks, meetings, announcements, and projects.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ToastProvider>
            <RoleProvider>
              <AppShell>{children}</AppShell>
            </RoleProvider>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
