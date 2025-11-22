'use client';

import { createContext, useContext } from 'react';

export type ViewportBreakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ViewportContextValue {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: ViewportBreakpoint;
  ready: boolean;
}

export const ViewportContext = createContext<ViewportContextValue | undefined>(
  undefined
);

export function useViewport(): ViewportContextValue {
  const context = useContext(ViewportContext);

  if (!context) {
    throw new Error('useViewport debe usarse dentro de un ViewportProvider');
  }

  return context;
}

export function useIsMobile(): boolean {
  return useViewport().isMobile;
}

export function useIsTablet(): boolean {
  return useViewport().isTablet;
}

export function useIsDesktop(): boolean {
  return useViewport().isDesktop;
}

export function useBreakpoint(): ViewportBreakpoint {
  return useViewport().breakpoint;
}


