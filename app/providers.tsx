'use client';

// ========================================
// React Query Provider
// ========================================
// Configura QueryClient para toda la aplicación

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Crear QueryClient en estado para evitar recreación en cada render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Configuración por defecto para queries
            staleTime: 60 * 1000, // 1 minuto
            gcTime: 5 * 60 * 1000, // 5 minutos (antes cacheTime)
            refetchOnWindowFocus: false, // No refetch automático al volver a la ventana
            retry: 1, // Reintentar 1 vez en caso de error
          },
          mutations: {
            // Configuración por defecto para mutations
            retry: 0, // No reintentar mutations automáticamente
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

