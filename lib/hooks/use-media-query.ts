'use client';

import { useEffect, useState } from 'react';

interface UseMediaQueryOptions {
  defaultValue?: boolean;
}

function supportsMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

export function useMediaQuery(
  query: string,
  options?: UseMediaQueryOptions
): boolean {
  const getInitialValue = () => {
    if (!supportsMatchMedia()) {
      return options?.defaultValue ?? false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getInitialValue);

  useEffect(() => {
    if (!supportsMatchMedia()) {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', handleChange);
      return () => mediaQueryList.removeEventListener('change', handleChange);
    }

    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, [query]);

  return matches;
}

