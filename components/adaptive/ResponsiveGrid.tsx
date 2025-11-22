'use client';

import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface ResponsiveGridProps {
  /**
   * Contenido del grid
   */
  children: ReactNode;
  /**
   * Número de columnas en desktop
   */
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Número de columnas en tablet (default: 2)
   */
  tabletCols?: 1 | 2 | 3 | 4;
  /**
   * Número de columnas en mobile (default: 1)
   */
  mobileCols?: 1 | 2;
  /**
   * Gap entre elementos
   */
  gap?: 'small' | 'normal' | 'large';
  /**
   * Si las filas deben tener la misma altura
   */
  equalHeight?: boolean;
  /**
   * Clases adicionales
   */
  className?: string;
}

/**
 * Grid responsive que adapta columnas según breakpoint
 * 
 * @example
 * // Grid de 3 columnas en desktop, 2 en tablet, 1 en mobile
 * <ResponsiveGrid cols={3} tabletCols={2} mobileCols={1}>
 *   <Card />
 *   <Card />
 *   <Card />
 * </ResponsiveGrid>
 * 
 * // Grid con altura igual
 * <ResponsiveGrid cols={3} equalHeight>
 *   <Card />
 *   <Card />
 * </ResponsiveGrid>
 */
export function ResponsiveGrid({
  children,
  cols = 3,
  tabletCols = 2,
  mobileCols = 1,
  gap = 'normal',
  equalHeight = false,
  className,
}: ResponsiveGridProps) {
  const colsClasses = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  };

  const tabletColsClasses = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  const mobileColsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
  };

  const gapClasses = {
    small: 'gap-2',
    normal: 'gap-3 sm:gap-4',
    large: 'gap-4 sm:gap-6',
  };

  return (
    <div
      className={cn(
        'grid',
        mobileColsClasses[mobileCols],
        tabletColsClasses[tabletCols],
        colsClasses[cols],
        gapClasses[gap],
        equalHeight && 'auto-rows-fr',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveDashboardGridProps {
  /**
   * Contenido del grid
   */
  children: ReactNode;
  /**
   * Clases adicionales
   */
  className?: string;
}

/**
 * Grid específico para dashboards con layout optimizado
 * Mobile: 1 columna
 * Tablet: 2 columnas
 * Desktop: 3 columnas
 * 
 * @example
 * <ResponsiveDashboardGrid>
 *   <FichajeWidget />
 *   <AusenciasWidget />
 *   <NotificacionesWidget />
 * </ResponsiveDashboardGrid>
 */
export function ResponsiveDashboardGrid({
  children,
  className,
}: ResponsiveDashboardGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}

