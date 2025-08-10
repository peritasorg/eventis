import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen w-full bg-gray-50">
      <ErrorBoundary>
        <Sidebar />
      </ErrorBoundary>
      <main className="flex-1 overflow-auto relative bg-gray-50">
        <ErrorBoundary>
          <TopBar />
        </ErrorBoundary>
        <div className="h-full">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};