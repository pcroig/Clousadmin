'use client'

import { useMediaQuery } from './use-media-query'

/**
 * Breakpoints del sistema
 * Alineados con Tailwind CSS
 */
export const BREAKPOINTS = {
  mobile: '(max-width: 639px)',          // < 640px
  tablet: '(min-width: 640px) and (max-width: 1023px)', // 640-1023px
  desktop: '(min-width: 1024px)',        // >= 1024px
  sm: '(min-width: 640px)',              // >= 640px (mobile → desktop)
  md: '(min-width: 768px)',              // >= 768px (tablet)
  lg: '(min-width: 1024px)',             // >= 1024px (laptop)
  xl: '(min-width: 1280px)',             // >= 1280px (desktop)
} as const

/**
 * Hook para detectar si estamos en mobile
 * @returns true si viewport es < 640px
 */
export function useIsMobile(): boolean {
  return useMediaQuery(BREAKPOINTS.mobile)
}

/**
 * Hook para detectar si estamos en tablet
 * @returns true si viewport es 640-1023px
 */
export function useIsTablet(): boolean {
  return useMediaQuery(BREAKPOINTS.tablet)
}

/**
 * Hook para detectar si estamos en desktop
 * @returns true si viewport es >= 1024px
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(BREAKPOINTS.desktop)
}

/**
 * Hook para obtener el breakpoint actual
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
export function useBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  if (isMobile) return 'mobile'
  if (isTablet) return 'tablet'
  return 'desktop'
}

/**
 * Hook completo de viewport con todas las queries
 * @returns objeto con todos los breakpoints
 *
 * @example
 * const { isMobile, isDesktop, breakpoint } = useViewport()
 *
 * if (isMobile) {
 *   return <MobileComponent />
 * }
 */
export function useViewport() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()
  const breakpoint = useBreakpoint()

  // Breakpoints adicionales de Tailwind
  const sm = useMediaQuery(BREAKPOINTS.sm)
  const md = useMediaQuery(BREAKPOINTS.md)
  const lg = useMediaQuery(BREAKPOINTS.lg)
  const xl = useMediaQuery(BREAKPOINTS.xl)

  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
    sm,
    md,
    lg,
    xl,
  }
}
