'use client';

import { MoreVertical } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { cn } from '@/lib/utils';

import { OverflowMenu } from './OverflowMenu';

export interface ActionItem {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'ghost' | 'outline';
  disabled?: boolean;
  /**
   * Controla cómo se muestra la acción en mobile.
   * - icon: solo icono (por defecto)
   * - label: solo texto
   * - icon-label: icono + texto
   */
  display?: 'icon' | 'label' | 'icon-label';
  /** Tamaño del botón en mobile */
  size?: 'sm' | 'default';
  className?: string;
}

export interface MobileActionBarProps {
  /** Título opcional (si no se usa MobilePageHeader) */
  title?: string;
  /** Acción principal destacada */
  primaryAction?: ActionItem;
  /** Acciones secundarias visibles como iconos (máx 2-3) */
  secondaryActions?: ActionItem[];
  /** Acciones en menú overflow */
  overflowActions?: ActionItem[];
  /** Clases adicionales */
  className?: string;
}

/**
 * Barra de acciones compacta para mobile
 * 
 * Mobile: [Título] [Icon1] [Icon2] [...] (altura compacta ~48px)
 * Desktop: Botones completos con texto
 * 
 * @example
 * <MobileActionBar
 *   title="Fichajes"
 *   primaryAction={{
 *     icon: Plus,
 *     label: "Cuadrar",
 *     onClick: handleCuadrar
 *   }}
 *   secondaryActions={[
 *     { icon: Clock, label: "Jornadas", onClick: handleJornadas }
 *   ]}
 *   overflowActions={[
 *     { icon: Calendar, label: "Compensar", onClick: handleCompensar }
 *   ]}
 * />
 */
export function MobileActionBar({
  title,
  primaryAction,
  secondaryActions = [],
  overflowActions = [],
  className,
}: MobileActionBarProps) {
  const isMobile = useIsMobile();
  const [overflowOpen, setOverflowOpen] = useState(false);

  // En desktop, renderizar botones completos
  if (!isMobile) {
    return (
      <div className={cn('flex items-center gap-3 flex-wrap', className)}>
        {title && (
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        )}
        <div className="flex-1" />
        {primaryAction && (
          <Button
            onClick={primaryAction.onClick}
            variant={primaryAction.variant || 'default'}
            disabled={primaryAction.disabled}
            className="gap-2"
          >
            {primaryAction.icon && (
            <primaryAction.icon className="h-4 w-4" />
            )}
            {primaryAction.label}
          </Button>
        )}
        {secondaryActions.map((action, idx) => (
          <Button
            key={idx}
            onClick={action.onClick}
            variant={action.variant || 'outline'}
            disabled={action.disabled}
            className="gap-2"
          >
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </Button>
        ))}
        {overflowActions.length > 0 && (
          <OverflowMenu
            actions={overflowActions}
            open={overflowOpen}
            onOpenChange={setOverflowOpen}
          />
        )}
      </div>
    );
  }

  const renderActionButton = (
    action: ActionItem,
    {
      isPrimary = false,
    }: {
      isPrimary?: boolean;
    } = {}
  ) => {
    const displayMode = action.display ?? 'icon';
    const showIcon = action.icon && displayMode !== 'label';
    const showLabel = displayMode !== 'icon';
    const size = action.size ?? 'sm';
    const baseVariant =
      action.variant || (isPrimary ? 'default' : displayMode === 'label' ? 'outline' : 'ghost');

    return (
      <Button
        onClick={action.onClick}
        variant={baseVariant}
        size={size}
        disabled={action.disabled}
        className={cn(
          displayMode === 'icon'
            ? cn(MOBILE_DESIGN.actionBar.iconButton, 'p-0')
            : 'h-9 px-3',
          action.className
        )}
        title={action.label}
      >
        {showIcon && action.icon && (
          <action.icon
            className={cn(
              MOBILE_DESIGN.actionBar.iconSize,
              showLabel ? 'mr-2' : undefined
            )}
          />
        )}
        {showLabel ? (
          <span className="text-sm font-medium">{action.label}</span>
        ) : (
          <span className="sr-only">{action.label}</span>
        )}
      </Button>
    );
  };

  // Mobile: Layout compacto con iconos
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        MOBILE_DESIGN.actionBar.padding,
        MOBILE_DESIGN.actionBar.gap,
        'mb-2',
        className
      )}
    >
      {/* Título */}
      {title && (
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">
          {title}
        </h1>
      )}

      {/* Acciones */}
      <div className={cn('flex items-center', MOBILE_DESIGN.actionBar.gap)}>
        {/* Primary Action */}
        {primaryAction && (
          renderActionButton(primaryAction, { isPrimary: true })
        )}

        {/* Secondary Actions */}
        {secondaryActions.slice(0, 2).map((action, idx) => (
          <React.Fragment key={idx}>
            {renderActionButton(action)}
          </React.Fragment>
        ))}

        {/* Overflow Menu */}
        {overflowActions.length > 0 && (
          <OverflowMenu
            actions={overflowActions}
            open={overflowOpen}
            onOpenChange={setOverflowOpen}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className={cn(MOBILE_DESIGN.actionBar.iconButton, 'p-0')}
                title="Más acciones"
              >
                <MoreVertical className={MOBILE_DESIGN.actionBar.iconSize} />
                <span className="sr-only">Más acciones</span>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}

