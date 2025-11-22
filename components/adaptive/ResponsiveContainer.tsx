'use client';

import { MOBILE_DESIGN, RESPONSIVE } from '@/lib/constants/mobile-design';
import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface ResponsiveContainerProps {
  /**
   * Contenido del contenedor
   */
  children: ReactNode;
  /**
   * Variante de padding
   */
  variant?: 'page' | 'widget' | 'card' | 'compact' | 'none';
  /**
   * Clases adicionales
   */
  className?: string;
  /**
   * Si se debe aplicar max-width
   */
  maxWidth?: boolean;
  /**
   * Ancho máximo específico
   */
  maxWidthClass?: string;
  /**
   * ID del elemento
   */
  id?: string;
}

/**
 * Contenedor responsive que adapta padding y spacing según viewport
 * 
 * @example
 * // Contenedor de página con padding adaptativo
 * <ResponsiveContainer variant="page" maxWidth>
 *   <h1>Mi Página</h1>
 * </ResponsiveContainer>
 * 
 * // Contenedor de widget compacto
 * <ResponsiveContainer variant="widget" className="bg-white rounded-lg">
 *   <WidgetContent />
 * </ResponsiveContainer>
 */
export function ResponsiveContainer({
  children,
  variant = 'page',
  className,
  maxWidth = false,
  maxWidthClass = 'max-w-[1800px] mx-auto',
  id,
}: ResponsiveContainerProps) {
  const paddingClasses = {
    page: MOBILE_DESIGN.spacing.page,
    widget: RESPONSIVE.widgetPadding,
    card: 'p-2.5 sm:p-4',
    compact: 'p-2 sm:p-3',
    none: '',
  };

  return (
    <div
      id={id}
      className={cn(
        paddingClasses[variant],
        maxWidth && maxWidthClass,
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  /**
   * Contenido del stack
   */
  children: ReactNode;
  /**
   * Espaciado entre elementos
   */
  spacing?: 'compact' | 'normal' | 'large';
  /**
   * Clases adicionales
   */
  className?: string;
}

/**
 * Stack vertical responsive con spacing adaptativo
 * 
 * @example
 * <ResponsiveStack spacing="normal">
 *   <Card />
 *   <Card />
 *   <Card />
 * </ResponsiveStack>
 */
export function ResponsiveStack({
  children,
  spacing = 'normal',
  className,
}: ResponsiveStackProps) {
  const spacingClasses = {
    compact: MOBILE_DESIGN.layout.stackCompact,
    normal: MOBILE_DESIGN.layout.stack,
    large: MOBILE_DESIGN.layout.stackLarge,
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}

interface ResponsiveInlineProps {
  /**
   * Contenido inline
   */
  children: ReactNode;
  /**
   * Espaciado entre elementos
   */
  spacing?: 'compact' | 'normal' | 'large';
  /**
   * Alineación vertical
   */
  align?: 'start' | 'center' | 'end';
  /**
   * Justificación horizontal
   */
  justify?: 'start' | 'center' | 'end' | 'between';
  /**
   * Si debe wrap en mobile
   */
  wrap?: boolean;
  /**
   * Clases adicionales
   */
  className?: string;
}

/**
 * Contenedor inline (horizontal) responsive
 * 
 * @example
 * <ResponsiveInline spacing="normal" justify="between">
 *   <div>Left</div>
 *   <div>Right</div>
 * </ResponsiveInline>
 */
export function ResponsiveInline({
  children,
  spacing = 'normal',
  align = 'center',
  justify = 'start',
  wrap = false,
  className,
}: ResponsiveInlineProps) {
  const spacingClasses = {
    compact: 'space-x-1.5',
    normal: 'space-x-2',
    large: 'space-x-3',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={cn(
        'flex',
        spacingClasses[spacing],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        className
      )}
    >
      {children}
    </div>
  );
}

