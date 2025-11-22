'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { RESPONSIVE } from '@/lib/constants/mobile-design';
import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface MobilePageHeaderProps {
  /**
   * Título de la página
   */
  title: string;
  /**
   * Subtítulo opcional
   */
  subtitle?: string;
  /**
   * Si debe mostrar el saludo "Buenos días" (solo en desktop)
   */
  showGreeting?: boolean;
  /**
   * Nombre del usuario para el saludo
   */
  userName?: string;
  /**
   * Si debe mostrar botón de volver
   */
  showBackButton?: boolean;
  /**
   * URL personalizada para volver (por defecto usa router.back())
   */
  backHref?: string;
  /**
   * Acciones adicionales (botones, etc)
   */
  actions?: ReactNode;
  /**
   * Si el header debe ser sticky
   */
  sticky?: boolean;
  /**
   * Clases adicionales
   */
  className?: string;
}

/**
 * Header de página responsive
 * - Desktop: muestra saludo completo, título grande
 * - Mobile: título compacto, sin saludo
 * 
 * @example
 * // Header simple
 * <MobilePageHeader title="Fichajes" />
 * 
 * // Header con saludo (solo desktop)
 * <MobilePageHeader 
 *   title="Dashboard"
 *   showGreeting
 *   userName="Sofia"
 * />
 * 
 * // Header con botón volver y acciones
 * <MobilePageHeader 
 *   title="Editar Empleado"
 *   showBackButton
 *   actions={<Button>Guardar</Button>}
 * />
 */
export function MobilePageHeader({
  title,
  subtitle,
  showGreeting = false,
  userName,
  showBackButton = false,
  backHref,
  actions,
  sticky = false,
  className,
}: MobilePageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div
      className={cn(
        'flex-shrink-0 mb-3 sm:mb-4',
        sticky && 'sticky top-0 z-10 bg-[#FAF9F5] pb-3 sm:pb-4',
        className
      )}
    >
      {/* Saludo - Solo desktop */}
      {showGreeting && userName && (
        <h1 className={cn(RESPONSIVE.pageHeaderHidden, 'mb-2')}>
          Buenos Días, {userName}
        </h1>
      )}

      {/* Header principal */}
      <div className="flex items-center justify-between gap-3">
        {/* Botón volver + título */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
              aria-label="Volver"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          <div className="min-w-0 flex-1">
            <h1 className={cn(
              RESPONSIVE.pageHeader,
              !showGreeting && 'text-gray-900',
              'truncate'
            )}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Acciones */}
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface PageSectionHeaderProps {
  /**
   * Título de la sección
   */
  title: string;
  /**
   * Descripción opcional
   */
  description?: string;
  /**
   * Acciones adicionales
   */
  actions?: ReactNode;
  /**
   * Clases adicionales
   */
  className?: string;
}

/**
 * Header para secciones dentro de una página
 * Más pequeño que MobilePageHeader
 * 
 * @example
 * <PageSectionHeader 
 *   title="Documentos recientes"
 *   description="Últimos 10 documentos subidos"
 *   actions={<Button size="sm">Ver todos</Button>}
 * />
 */
export function PageSectionHeader({
  title,
  description,
  actions,
  className,
}: PageSectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-3', className)}>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

