import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[hsl(var(--bg-surface-alt))]">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 px-4 pt-[72px] pb-10 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
          <div className="mx-auto max-w-5xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
