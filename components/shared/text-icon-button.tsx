'use client';

import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonProps = React.ComponentProps<typeof Button>;

interface TextIconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: LucideIcon;
  label: string;
  /**
   * Oculta el texto y deja solo el icono (mantiene accesibilidad con sr-only)
   */
  hideLabel?: boolean;
}

export function TextIconButton({
  icon: Icon,
  label,
  hideLabel = false,
  className,
  size,
  variant,
  ...props
}: TextIconButtonProps) {
  const resolvedSize = hideLabel ? 'icon' : size ?? 'sm';
  const resolvedVariant = variant ?? 'outline';

  return (
    <Button
      type="button"
      size={resolvedSize}
      variant={resolvedVariant}
      className={cn(
        'gap-2 rounded-md border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-200',
        hideLabel && 'h-9 w-9 min-w-0',
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />}
      {hideLabel ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="whitespace-nowrap">{label}</span>
      )}
    </Button>
  );
}


