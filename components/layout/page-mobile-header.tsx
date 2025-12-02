// ========================================
// Page Mobile Header - Unified Header Component
// ========================================
// Header estandarizado y unificado para mobile:
// - Página raíz: título a la izquierda
// - Página hijo: botón volver + título centrado
// - Acciones a la derecha (principal + secundarias en "...")
// - Soporte para subtitle, greeting, sticky

'use client';

import { ArrowLeft, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'outline' | 'ghost';
  isPrimary?: boolean;
  /** Si true, muestra botón completo con texto+icono+bordes (para Fichar, Solicitar, Cuadrar) */
  isSpecialAction?: boolean;
}

interface PageMobileHeaderProps {
  /**
   * Título de la página
   */
  title: string;
  /**
   * Subtítulo opcional
   */
  subtitle?: string;
  /**
   * Acciones como array de botones
   */
  actions?: ActionButton[];
  /**
   * O acciones como ReactNode para máxima flexibilidad
   */
  actionsNode?: ReactNode;
  /**
   * Si true, muestra botón de volver y centra el título (página hijo)
   */
  showBack?: boolean;
  /**
   * URL personalizada para el botón volver
   */
  backHref?: string;
  /**
   * Callback al hacer clic en volver
   */
  onBack?: () => void;
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
 * Header unificado para páginas móviles
 * Combina las mejores características de PageMobileHeader y MobilePageHeader
 *
 * @example
 * // Header simple
 * <PageMobileHeader title="Equipos" />
 *
 * @example
 * // Header con subtitle
 * <PageMobileHeader
 *   title="Documentos"
 *   subtitle="5 carpetas"
 * />
 *
 * @example
 * // Header con acciones como array
 * <PageMobileHeader
 *   title="Personas"
 *   actions={[
 *     {
 *       icon: Plus,
 *       label: 'Añadir persona',
 *       onClick: () => {},
 *       isPrimary: true,
 *     },
 *     {
 *       icon: Settings,
 *       label: 'Configuración',
 *       onClick: () => {},
 *     },
 *   ]}
 * />
 *
 * @example
 * // Header con acciones como ReactNode (máxima flexibilidad)
 * <PageMobileHeader
 *   title="Documentos"
 *   actionsNode={
 *     <div className="flex gap-2">
 *       <Button size="sm">Crear</Button>
 *       <Button size="sm">Subir</Button>
 *     </div>
 *   }
 * />
 *
 * @example
 * // Header con botón back
 * <PageMobileHeader
 *   title="Editar Empleado"
 *   showBack
 * />
 */
export function PageMobileHeader({
  title,
  subtitle,
  actions = [],
  actionsNode,
  showBack = false,
  backHref,
  onBack,
  sticky = false,
  className,
}: PageMobileHeaderProps) {
  const router = useRouter();
  const primaryAction = actions.find((a) => a.isPrimary);
  const secondaryActions = actions.filter((a) => !a.isPrimary);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div
      className={cn(
        'sm:hidden mb-3 flex-shrink-0',
        sticky && 'sticky top-0 z-10 bg-[#FAF9F5] pb-3',
        className
      )}
    >
      <div className="flex items-center justify-between relative">
        {/* Left: Back button (si es página hijo) */}
        {showBack && (
          <button
            onClick={handleBack}
            className="p-1 -ml-1 hover:bg-gray-100 rounded-md transition flex-shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}

        {/* Center/Left: Title + Subtitle */}
        <div
          className={cn(
            'min-w-0',
            showBack
              ? 'absolute left-1/2 -translate-x-1/2 max-w-[50%] text-center'
              : 'flex-1'
          )}
        >
          <h1 className="text-[17.6px] leading-[24px] font-medium text-gray-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {/* Right: Actions - SOLO ICONOS */}
        {(actions.length > 0 || actionsNode) && (
          <div className="flex items-center gap-2 ml-auto">
            {/* Si hay actionsNode, usarlo directamente */}
            {actionsNode ? (
              actionsNode
            ) : (
              <>
                {/* Mostrar hasta 2 iconos principales, resto en menú */}
                {actions.slice(0, 2).map((action, idx) => (
                  action.icon && (
                    <button
                      key={idx}
                      onClick={action.onClick}
                      className="flex items-center justify-center h-6 w-6 hover:bg-gray-100 rounded-md transition"
                      aria-label={action.label}
                    >
                      <action.icon className="h-[17.6px] w-[17.6px] text-gray-700" />
                    </button>
                  )
                ))}

                {/* Si hay más de 2 acciones, menú con "..." */}
                {actions.length > 2 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center justify-center h-6 w-6 hover:bg-gray-100 rounded-md transition">
                        <MoreVertical className="h-[17.6px] w-[17.6px] text-gray-700" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.slice(2).map((action, idx) => (
                        <DropdownMenuItem key={idx} onClick={action.onClick}>
                          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
