'use client';

import { Info } from 'lucide-react';
import { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InfoTooltipProps {
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function InfoTooltip({ content, side = 'top' }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
            aria-label="Información adicional"
            onFocus={(event) => event.currentTarget.blur()}
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs bg-white text-gray-700 border border-gray-200 shadow-lg">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
