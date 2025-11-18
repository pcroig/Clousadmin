/**
 * ResponsiveDialog - Modal adaptativo
 *
 * UX nativa para cada viewport:
 * - Mobile: BottomSheet (thumb zone, swipe-to-dismiss)
 * - Desktop: Dialog centrado (tradicional)
 *
 * Ventajas:
 * - UX optimizada por dispositivo
 * - API unificada (mismo código de consumo)
 * - Accesibilidad mantenida
 * - Performance (solo carga componente necesario)
 */

'use client'

import * as React from 'react'
import { useViewport } from '@/lib/contexts/viewport-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetFooter,
  BottomSheetBody,
} from '@/components/mobile/BottomSheet'

/**
 * Props del ResponsiveDialog
 * Unifica API de Dialog y BottomSheet
 */
interface ResponsiveDialogProps {
  /**
   * Control del estado open/close
   */
  open?: boolean

  /**
   * Callback cuando cambia el estado
   */
  onOpenChange?: (open: boolean) => void

  /**
   * Trigger button (opcional)
   * Si se proporciona, el dialog se controla internamente
   */
  trigger?: React.ReactNode

  /**
   * Título del dialog/sheet
   */
  title?: string

  /**
   * Descripción (opcional)
   */
  description?: string

  /**
   * Contenido principal
   */
  children: React.ReactNode

  /**
   * Footer con botones de acción (opcional)
   */
  footer?: React.ReactNode

  /**
   *ClassName para el contenido
   */
  contentClassName?: string

  /**
   * Si el sheet debe ser dismissable (mobile)
   * @default true
   */
  dismissable?: boolean

  /**
   * Si debe cerrarse al hacer click fuera (desktop)
   * @default true
   */
  closeOnOverlayClick?: boolean
}

/**
 * Componente principal
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  contentClassName,
  dismissable = true,
  closeOnOverlayClick = true,
}: ResponsiveDialogProps) {
  const { isMobile } = useViewport()

  // En mobile: BottomSheet
  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        dismissible={dismissable}
      >
        {trigger && <BottomSheet.Trigger asChild>{trigger}</BottomSheet.Trigger>}

        <BottomSheetContent className={contentClassName}>
          {/* Header con título y descripción */}
          {(title || description) && (
            <BottomSheetHeader>
              {title && <BottomSheetTitle>{title}</BottomSheetTitle>}
              {description && (
                <BottomSheetDescription>{description}</BottomSheetDescription>
              )}
            </BottomSheetHeader>
          )}

          {/* Contenido scrolleable */}
          <BottomSheetBody>{children}</BottomSheetBody>

          {/* Footer con acciones */}
          {footer && <BottomSheetFooter>{footer}</BottomSheetFooter>}
        </BottomSheetContent>
      </BottomSheet>
    )
  }

  // En desktop: Dialog tradicional
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}

      <DialogContent
        className={contentClassName}
        onPointerDownOutside={(e) => {
          if (!closeOnOverlayClick) {
            e.preventDefault()
          }
        }}
      >
        {/* Header con título y descripción */}
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}

        {/* Contenido */}
        <div className="py-4">{children}</div>

        {/* Footer con acciones */}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Ejemplo de uso:
 *
 * ```tsx
 * <ResponsiveDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Solicitar Ausencia"
 *   description="Completa el formulario para solicitar una ausencia"
 *   footer={
 *     <>
 *       <Button variant="outline" onClick={() => setOpen(false)}>
 *         Cancelar
 *       </Button>
 *       <Button onClick={handleSubmit}>
 *         Solicitar
 *       </Button>
 *     </>
 *   }
 * >
 *   <AusenciaForm />
 * </ResponsiveDialog>
 * ```
 *
 * Resultado:
 * - Mobile: Bottom sheet con swipe-to-dismiss
 * - Desktop: Dialog centrado tradicional
 * - Mismo código de consumo
 */

/**
 * Hook helper para controlar ResponsiveDialog
 */
export function useResponsiveDialog(defaultOpen = false) {
  const [open, setOpen] = React.useState(defaultOpen)

  return {
    open,
    setOpen,
    openDialog: () => setOpen(true),
    closeDialog: () => setOpen(false),
    toggleDialog: () => setOpen((prev) => !prev),
  }
}

/**
 * Ejemplo con hook:
 *
 * ```tsx
 * function MyComponent() {
 *   const dialog = useResponsiveDialog()
 *
 *   return (
 *     <>
 *       <Button onClick={dialog.openDialog}>
 *         Abrir modal
 *       </Button>
 *
 *       <ResponsiveDialog
 *         open={dialog.open}
 *         onOpenChange={dialog.setOpen}
 *         title="Mi Modal"
 *       >
 *         Contenido
 *       </ResponsiveDialog>
 *     </>
 *   )
 * }
 * ```
 */
