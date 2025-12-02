// ========================================
// Page Layout - Standard Container Wrapper
// ========================================
// Wrapper estándar para todas las páginas internas
// Maneja el padding del container de forma consistente

'use client';

import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface PageLayoutProps {
  /**
   * Contenido de la página
   */
  children: ReactNode;
  /**
   * Clases adicionales para el container
   */
  className?: string;
  /**
   * Si false, no aplica max-width (útil para páginas que necesitan todo el ancho)
   */
  constrained?: boolean;
}

/**
 * Layout estándar para páginas internas
 * Aplica padding consistente: px-1 py-1 en mobile, sm:px-8 sm:py-6 en desktop
 *
 * @example
 * <PageLayout>
 *   <PageMobileHeader title="Mi Página" />
 *   <div className="flex-1 overflow-auto">
 *     {contenido}
 *   </div>
 * </PageLayout>
 */
export function PageLayout({
  children,
  className,
  constrained = true,
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        'h-full w-full flex flex-col px-1 py-1 sm:px-8 sm:py-6',
        constrained && 'sm:max-w-[1800px] sm:mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
}
