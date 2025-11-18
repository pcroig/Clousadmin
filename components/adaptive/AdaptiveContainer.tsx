'use client'

import React, { ReactNode, Suspense } from 'react'
import { useViewport } from '@/lib/contexts/viewport-context'

/**
 * Props para AdaptiveContainer
 */
interface AdaptiveContainerProps {
  /**
   * Componente a renderizar en mobile (< 640px)
   */
  mobile: ReactNode

  /**
   * Componente a renderizar en desktop (>= 1024px)
   */
  desktop: ReactNode

  /**
   * Componente a renderizar en tablet (640-1023px)
   * Si no se proporciona, usa la versión desktop
   */
  tablet?: ReactNode

  /**
   * Loading fallback mientras se detecta el viewport
   * Por defecto muestra null
   */
  fallback?: ReactNode
}

/**
 * Contenedor adaptativo que renderiza diferentes componentes según viewport
 *
 * Ventajas sobre CSS condicional (hidden sm:block):
 * - Solo el código necesario va al bundle (con code splitting)
 * - No duplicación en el DOM
 * - Permite lógica completamente diferente por breakpoint
 * - Optimiza performance
 *
 * @example
 * import dynamic from 'next/dynamic'
 *
 * // Con code splitting (recomendado)
 * const MobileDashboard = dynamic(() => import('./Dashboard.mobile'))
 * const DesktopDashboard = dynamic(() => import('./Dashboard.desktop'))
 *
 * <AdaptiveContainer
 *   mobile={<MobileDashboard />}
 *   desktop={<DesktopDashboard />}
 * />
 *
 * @example
 * // Sin code splitting (más simple)
 * <AdaptiveContainer
 *   mobile={<SimpleMobileView />}
 *   desktop={<SimpleDesktopView />}
 * />
 */
export function AdaptiveContainer({
  mobile,
  desktop,
  tablet,
  fallback = null,
}: AdaptiveContainerProps) {
  const { isMobile, isTablet } = useViewport()

  // Durante SSR o hydration inicial
  if (typeof window === 'undefined') {
    return <>{fallback}</>
  }

  // Mobile: < 640px
  if (isMobile) {
    return <Suspense fallback={fallback}>{mobile}</Suspense>
  }

  // Tablet: 640-1023px (si existe versión específica)
  if (isTablet && tablet) {
    return <Suspense fallback={fallback}>{tablet}</Suspense>
  }

  // Desktop: >= 1024px (o tablet sin versión específica)
  return <Suspense fallback={fallback}>{desktop}</Suspense>
}

/**
 * Variante simplificada para casos mobile vs desktop
 * (sin soporte para tablet)
 */
export function MobileDesktopContainer({
  mobile,
  desktop,
  fallback = null,
}: Omit<AdaptiveContainerProps, 'tablet'>) {
  return (
    <AdaptiveContainer
      mobile={mobile}
      desktop={desktop}
      fallback={fallback}
    />
  )
}
