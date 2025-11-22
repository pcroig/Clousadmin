'use client';

import { ReactNode } from 'react';

import { useViewport } from '@/lib/hooks/use-viewport';

type AdaptiveChild = ReactNode | (() => ReactNode);

export interface AdaptiveContainerProps {
  mobile: AdaptiveChild;
  desktop: AdaptiveChild;
  fallback?: ReactNode;
  force?: 'mobile' | 'desktop';
}

function renderChild(child: AdaptiveChild) {
  return typeof child === 'function' ? (child as () => ReactNode)() : child;
}

export function AdaptiveContainer({
  mobile,
  desktop,
  fallback = null,
  force,
}: AdaptiveContainerProps) {
  const { isMobile, ready } = useViewport();
  const target = force ?? (isMobile ? 'mobile' : 'desktop');

  if (!ready && fallback) {
    return <>{fallback}</>;
  }

  return <>{target === 'mobile' ? renderChild(mobile) : renderChild(desktop)}</>;
}


