import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { dehydrate, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from "@/components/AuthProvider";
import { ReactQueryProvider } from '@/components/ReactQueryProvider';
import { AppShellRoot } from "@/components/app-shell/AppShellRoot";
import { queryKeys } from '@/lib/queryKeys';
import { getServerAuthMe, getServerNavEventsTree } from '@/lib/server-prefetch';

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Purple Sector - Racing Telemetry Analysis",
  description: "AI-powered telemetry analysis for Assetto Corsa",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.authMe,
    queryFn: getServerAuthMe,
  });

  await queryClient.prefetchQuery({
    queryKey: queryKeys.navEventsTree,
    queryFn: getServerNavEventsTree,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ReactQueryProvider dehydratedState={dehydratedState}>
          <AuthProvider>
            <AppShellRoot>{children}</AppShellRoot>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
