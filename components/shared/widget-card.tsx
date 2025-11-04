// ========================================
// Widget Card - Base component for all dashboard widgets
// ========================================
// Provides consistent header structure with title and navigation link

'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

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
}

export const WidgetCard = memo(function WidgetCard({
  title,
  href,
  children,
  className = '',
  height = 'h-[280px]',
  headerClassName = '',
  contentClassName = '',
  titleIcon,
  badge,
  headerAction,
}: WidgetCardProps) {
  return (
    <Card className={`${height} flex flex-col overflow-hidden font-inter ${className}`}>
      <CardHeader className={`flex-shrink-0 ${headerClassName}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-[14px] font-normal text-gray-900 flex items-center gap-2">
              {titleIcon}
              {title}
            </CardTitle>
            {badge && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-warning text-white text-[11px] font-bold rounded-lg">
                {badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            {href && (
              <Link href={href}>
                <button
                  className="flex items-center justify-center w-6 h-6 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  aria-label={`Ir a ${title}`}
                >
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={`flex-1 pb-20 ${contentClassName}`}>
        {children}
      </CardContent>
    </Card>
  );
});


