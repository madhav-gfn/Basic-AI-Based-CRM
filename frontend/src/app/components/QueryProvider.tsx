'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 seconds
      gcTime: 5 * 60 * 1000,     // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
