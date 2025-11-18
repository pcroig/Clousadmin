'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useViewport as useViewportHook } from '@/lib/hooks/use-viewport'

/**
 * Tipo del contexto de viewport
 */
interface ViewportContextValue {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  breakpoint: 'mobile' | 'tablet' | 'desktop'
  sm: boolean
  md: boolean
  lg: boolean
  xl: boolean
}

const ViewportContext = createContext<ViewportContextValue | undefined>(undefined)

/**
 * Provider de viewport
 *
 * Centraliza la detección de breakpoints para evitar múltiples listeners
 * y mejorar performance
 *
 * @example
 * // En app/layout.tsx
 * <ViewportProvider>
 *   <App />
 * </ViewportProvider>
 */
export function ViewportProvider({ children }: { children: ReactNode }) {
  const viewport = useViewportHook()

  return (
    <ViewportContext.Provider value={viewport}>
      {children}
    </ViewportContext.Provider>
  )
}

/**
 * Hook para usar el contexto de viewport
 *
 * @throws Error si se usa fuera de ViewportProvider
 *
 * @example
 * const { isMobile, isDesktop, breakpoint } = useViewport()
 *
 * if (isMobile) {
 *   return <MobileLayout />
 * }
 *
 * return <DesktopLayout />
 */
export function useViewport(): ViewportContextValue {
  const context = useContext(ViewportContext)

  if (context === undefined) {
    throw new Error(
      'useViewport debe usarse dentro de ViewportProvider. ' +
      'Asegúrate de envolver tu app con <ViewportProvider>.'
    )
  }

  return context
}
