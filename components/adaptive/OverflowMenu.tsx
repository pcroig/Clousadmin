'use client';

import { MoreVertical } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { cn } from '@/lib/utils';

export interface OverflowAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export interface OverflowMenuProps {
  /** Lista de acciones */
  actions: OverflowAction[];
  /** Estado open/close controlado */
  open?: boolean;
  /** Callback para cambiar estado */
  onOpenChange?: (open: boolean) => void;
  /** Trigger personalizado (opcional) */
  trigger?: React.ReactNode;
  /** Título para el sheet mobile (opcional) */
  title?: string;
}

/**
 * Menú overflow "..." para acciones secundarias
 * 
 * Mobile: BottomSheet con lista de acciones
 * Desktop: Dropdown estándar
 * 
 * @example
 * <OverflowMenu
 *   actions={[
 *     { icon: Calendar, label: "Compensar horas", onClick: handleCompensar },
 *     { icon: Clock, label: "Gestionar jornadas", onClick: handleJornadas }
 *   ]}
 * />
 */
export function OverflowMenu({
  actions,
  open,
  onOpenChange,
  trigger,
  title = 'Acciones',
}: OverflowMenuProps) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleActionClick = (action: OverflowAction) => {
    action.onClick();
    setIsOpen(false);
  };

  // Desktop: Dropdown menu estándar
  if (!isMobile) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Más acciones</span>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {actions.map((action, idx) => (
            <DropdownMenuItem
              key={idx}
              onClick={() => handleActionClick(action)}
              disabled={action.disabled}
              className={cn(
                'gap-2 cursor-pointer',
                action.variant === 'destructive' && 'text-red-600 focus:text-red-600'
              )}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Mobile: Bottom sheet
  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className={cn(MOBILE_DESIGN.actionBar.iconButton, 'p-0')}
          onClick={() => setIsOpen(true)}
        >
          <MoreVertical className={MOBILE_DESIGN.actionBar.iconSize} />
          <span className="sr-only">Más acciones</span>
        </Button>
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="px-0">
          <SheetHeader className="px-4 pb-4">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleActionClick(action)}
                disabled={action.disabled}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3',
                  'text-left text-base font-medium',
                  'hover:bg-gray-50 active:bg-gray-100',
                  'transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  action.variant === 'destructive'
                    ? 'text-red-600'
                    : 'text-gray-900'
                )}
              >
                <action.icon className="h-5 w-5 flex-shrink-0" />
                {action.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

