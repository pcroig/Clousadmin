// ========================================
// Widget Card - Base component for all dashboard widgets
// ========================================
// Provides consistent header structure with title and navigation link

'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';

import { CountBadge } from '@/components/shared/count-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WidgetCardProps {
  title: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
  height?: string;
  headerClassName?: string;
  contentClassName?: string;
  titleIcon?: React.ReactNode;
  badge?: string | number;
  headerAction?: React.ReactNode;
  showHeader?: boolean;
  useScroll?: boolean;
}

export const WidgetCard = memo(function WidgetCard({
  title,
  href,
  children,
  className = '',
  height = 'h-full min-h-[240px]',
  headerClassName = '',
  contentClassName = '',
  titleIcon,
  badge,
  headerAction,
  showHeader = true,
  useScroll = false,
}: WidgetCardProps) {
  const content = useScroll ? (
    <ScrollArea className="h-full">
      <div className="min-h-full">
        {children}
      </div>
    </ScrollArea>
  ) : (
    children
  );

  return (
    <Card className={`${height} flex flex-col overflow-hidden font-inter ${className}`}>
      {showHeader && (
        <CardHeader className={`flex-shrink-0 py-3 sm:py-4 ${headerClassName}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[13px] sm:text-[14px] font-normal text-gray-900 flex items-center">
                {titleIcon}
                {title}
              </CardTitle>
              {badge && <CountBadge count={badge} />}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {headerAction}
              {href && (
                <Link href={href}>
                  <button
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:w-6 sm:h-6 sm:min-w-0 sm:min-h-0 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    aria-label={`Ir a ${title}`}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </Link>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={`flex-1 min-h-0 pb-4 sm:pb-6 ${contentClassName}`}>
        {content}
      </CardContent>
    </Card>
  );
});


