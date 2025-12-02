// ========================================
// Mobile Page Wrapper
// ========================================
// Wrapper estándar para páginas mobile con padding correcto

'use client';

import { cn } from '@/lib/utils';

interface MobilePageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function MobilePageWrapper({ children, className }: MobilePageWrapperProps) {
  return (
    <div className={cn('h-full w-full', className)}>
      {/* Mobile: sin padding, Desktop: con padding */}
      <div className="h-full max-w-[1800px] mx-auto px-0 py-0 sm:px-8 sm:py-6">
        {children}
      </div>
    </div>
  );
}
