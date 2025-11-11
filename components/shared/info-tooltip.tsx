'use client';

// ========================================
// Shared - Info Tooltip Component
// ========================================

import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface InfoTooltipProps {
  /**
   * Content displayed inside the tooltip. Accepts string or JSX.
   */
  content: ReactNode;
  /**
   * Optional accessible label for the trigger button.
   */
  ariaLabel?: string;
  /**
   * Additional classes for the trigger button wrapper.
   */
  className?: string;
  /**
   * Additional classes for the Info icon.
   */
  iconClassName?: string;
  /**
   * Tooltip placement side.
   */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /**
   * Tooltip alignment relative to the trigger.
   */
  align?: 'start' | 'center' | 'end';
  /**
   * Delay before showing the tooltip. Defaults to 150ms.
   */
  delayDuration?: number;
  /**
   * Optional variant to control button appearance.
   */
  variant?: 'default' | 'subtle';
  /**
   * When true refocus won't show tooltip immediately (default false).
   */
  disableHoverableContent?: boolean;
  /**
   * Forward button props to the trigger element.
   */
  buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>;
}

export function InfoTooltip({
  content,
  ariaLabel = 'Más información',
  className,
  iconClassName,
  side = 'top',
  align = 'center',
  delayDuration = 150,
  variant = 'default',
  disableHoverableContent,
  buttonProps,
}: InfoTooltipProps) {
  const buttonStyles = cn(
    'inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
    variant === 'default' && 'text-gray-500 hover:text-gray-800',
    variant === 'subtle' && 'text-gray-400 hover:text-gray-600',
    className,
  );

  const iconStyles = cn('h-4 w-4', iconClassName);

  return (
    <TooltipProvider delayDuration={delayDuration} disableHoverableContent={disableHoverableContent}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={buttonStyles}
            {...buttonProps}
          >
            <Info className={iconStyles} />
            <span className="sr-only">{ariaLabel}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="max-w-xs space-y-2 text-sm leading-relaxed"
        >
          {typeof content === 'string' ? <p>{content}</p> : content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default InfoTooltip;



