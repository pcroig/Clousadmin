// ========================================
// InfoTooltip Component
// ========================================
// Tooltip genérico con icono "i" para proporcionar información contextual
// Parte del sistema de diseño - alternativa a banners en dialogs

'use client';

import { Info } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  /** Contenido del tooltip */
  content: string | React.ReactNode;
  /** Posición del tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Clases adicionales para el icono */
  className?: string;
  /** Tamaño del icono */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function InfoTooltip({ 
  content, 
  side = 'top',
  className,
  size = 'sm'
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              className
            )}
            aria-label="Más información"
          >
            <Info className={sizeClasses[size]} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {typeof content === 'string' ? (
            <p className="text-xs leading-relaxed">{content}</p>
          ) : (
            content
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
