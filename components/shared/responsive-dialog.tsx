'use client';

import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { cn } from '@/lib/utils';

type DialogComplexity = 'simple' | 'medium' | 'complex';

interface ResponsiveDialogProps {
  /**
   * Si el dialog está abierto
   */
  open: boolean;
  /**
   * Callback cuando se cierra
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Título del dialog
   */
  title: string;
  /**
   * Descripción opcional
   */
  description?: string;
  /**
   * Contenido del dialog
   */
  children: React.ReactNode;
  /**
   * Footer con acciones
   */
  footer?: React.ReactNode;
  /**
   * Complejidad del formulario (determina presentación en mobile)
   * - simple: Bottom sheet
   * - medium: Dialog estándar
   * - complex: Full screen en mobile
   */
  complexity?: DialogComplexity;
  /**
   * Si debe mostrar botón de cerrar
   */
  showCloseButton?: boolean;
  /**
   * Clases adicionales para el contenido
   */
  className?: string;
  /**
   * Clases adicionales para el contenedor de contenido
   */
  contentClassName?: string;
}

/**
 * Dialog responsive que se adapta automáticamente según:
 * - Viewport (mobile vs desktop)
 * - Complejidad del contenido
 * 
 * Mobile:
 * - simple: Bottom sheet
 * - medium: Dialog centrado
 * - complex: Full screen
 * 
 * Desktop:
 * - Siempre dialog centrado (tamaño según complejidad)
 * 
 * @example
 * // Bottom sheet en mobile, dialog normal en desktop
 * <ResponsiveDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Confirmar acción"
 *   description="¿Estás seguro?"
 *   complexity="simple"
 *   footer={<Button>Confirmar</Button>}
 * >
 *   <p>Contenido del dialog</p>
 * </ResponsiveDialog>
 * 
 * // Full screen en mobile para formularios complejos
 * <ResponsiveDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Crear empleado"
 *   complexity="complex"
 * >
 *   <LongForm />
 * </ResponsiveDialog>
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  complexity = 'medium',
  showCloseButton = true,
  className,
  contentClassName,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  // Determinar tamaño del dialog según complejidad
  const getDialogSize = () => {
    switch (complexity) {
      case 'simple':
        return 'sm:max-w-md';
      case 'medium':
        return 'sm:max-w-lg';
      case 'complex':
        return 'sm:max-w-2xl';
      default:
        return 'sm:max-w-lg';
    }
  };

  // En mobile, usar bottom sheet para simple, full screen para complex
  if (isMobile) {
    if (complexity === 'simple') {
      // Bottom sheet para acciones simples
      return (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            showCloseButton={showCloseButton}
            showDragHandle={true}
            className={cn('max-h-[90vh] overflow-y-auto', className)}
          >
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
            <div className={cn('py-4', contentClassName)}>
              {children}
            </div>
            {footer && <SheetFooter>{footer}</SheetFooter>}
          </SheetContent>
        </Sheet>
      );
    }

    if (complexity === 'complex') {
      // Full screen para formularios complejos
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            showCloseButton={showCloseButton}
            className={cn(
              'h-screen max-h-screen w-screen max-w-full rounded-none p-0',
              className
            )}
          >
            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
              <DialogHeader>
                <DialogTitle className="text-left">{title}</DialogTitle>
                {description && (
                  <DialogDescription className="text-left">{description}</DialogDescription>
                )}
              </DialogHeader>
            </div>

            {/* Contenido scrollable */}
            <div className={cn('flex-1 overflow-y-auto px-4 py-4', contentClassName)}>
              {children}
            </div>

            {/* Footer sticky */}
            {footer && (
              <div className="sticky bottom-0 z-10 bg-white border-t px-4 py-3">
                <DialogFooter>{footer}</DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      );
    }
  }

  // Desktop o mobile medium: dialog normal centrado
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(getDialogSize(), className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className={contentClassName}>
          {children}
        </div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook helper para gestionar ResponsiveDialog
 * 
 * @example
 * const { isOpen, open, close } = useResponsiveDialog();
 * 
 * return (
 *   <>
 *     <Button onClick={open}>Abrir</Button>
 *     <ResponsiveDialog open={isOpen} onOpenChange={close} title="Título">
 *       Contenido
 *     </ResponsiveDialog>
 *   </>
 * );
 */
export function useResponsiveDialog(defaultOpen = false) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
    setIsOpen,
  };
}

