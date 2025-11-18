'use client'

import { useEffect, useState } from 'react'

/**
 * Hook para detectar media queries
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 639px)')
 *
 * @param query - Media query CSS string
 * @returns true si el query coincide, false en caso contrario
 *
 * ⚠️ Maneja hydration mismatch devolviendo false en SSR
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const media = window.matchMedia(query)

    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    // Create listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    // Modern API (Safari 14+)
    if (media.addEventListener) {
      media.addEventListener('change', listener)
    } else {
      // Fallback for older browsers
      media.addListener(listener)
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener)
      } else {
        media.removeListener(listener)
      }
    }
  }, [matches, query])

  // Evitar hydration mismatch: devolver false durante SSR
  if (!mounted) {
    return false
  }

  return matches
}
