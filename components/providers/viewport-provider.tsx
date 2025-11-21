'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';

import { useMediaQuery } from '@/lib/hooks/use-media-query';
import {
  ViewportContext,
  type ViewportBreakpoint,
  type ViewportContextValue,
} from '@/lib/hooks/use-viewport';

const MOBILE_BREAKPOINT = 640;
const DESKTOP_BREAKPOINT = 1024;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
const DESKTOP_QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`;

interface ViewportProviderProps {
  children: ReactNode;
}

export function ViewportProvider({ children }: ViewportProviderProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const value = useMemo<ViewportContextValue>(() => {
    const breakpoint: ViewportBreakpoint = isMobile
      ? 'mobile'
      : isDesktop
        ? 'desktop'
        : 'tablet';

    return {
      isMobile,
      isDesktop,
      isTablet: !isMobile && !isDesktop,
      breakpoint,
    };
  }, [isMobile, isDesktop]);

  return (
    <ViewportContext.Provider value={{ ...value, ready }}>
      {children}
    </ViewportContext.Provider>
  );
}

