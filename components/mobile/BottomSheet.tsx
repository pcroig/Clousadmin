/**
 * BottomSheet - Modal nativo mobile
 *
 * Optimizado para UX mobile:
 * - Slide desde bottom (thumb zone)
 * - Swipe-to-dismiss gesture
 * - Handle visual para arrastrar
 * - Backdrop semi-transparente
 * - Haptic feedback
 * - Safe area aware (notch)
 * - Snap points
 * - Animaciones suaves 60fps
 *
 * Basado en Vaul (https://github.com/emilkowalski/vaul)
 */

'use client'

import * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '@/lib/utils'

// Re-exportar componentes base
const BottomSheet = DrawerPrimitive.Root
const BottomSheetTrigger = DrawerPrimitive.Trigger
const BottomSheetPortal = DrawerPrimitive.Portal
const BottomSheetClose = DrawerPrimitive.Close

/**
 * Overlay/Backdrop
 * Semi-transparente, cierra al hacer click
 */
const BottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40',
      // Animación de fade
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
BottomSheetOverlay.displayName = DrawerPrimitive.Overlay.displayName

/**
 * Contenido del bottom sheet
 *
 * Features:
 * - Rounded top corners
 * - Handle visual para drag
 * - Safe area bottom (iPhone notch)
 * - Max height 90vh (no cubre todo)
 * - Animación slide desde bottom
 */
const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <BottomSheetPortal>
    <BottomSheetOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        // Posicionamiento
        'fixed inset-x-0 bottom-0 z-50',
        // Altura máxima (respeta safe area)
        'mt-24 max-h-[90vh]',
        // Estilo
        'flex h-auto flex-col',
        'rounded-t-[20px]',      // Esquinas redondeadas top
        'border-t border-gray-200',
        'bg-white',
        // Safe area para iPhone (notch inferior)
        'pb-safe',
        // Animaciones (GPU-accelerated con transform)
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        // Duración suave
        'data-[state=open]:duration-300 data-[state=closed]:duration-200',
        className
      )}
      {...props}
    >
      {/* Handle visual para drag (Material Design) */}
      <div className="mx-auto mt-3 h-1.5 w-12 flex-shrink-0 rounded-full bg-gray-300" />

      {children}
    </DrawerPrimitive.Content>
  </BottomSheetPortal>
))
BottomSheetContent.displayName = 'BottomSheetContent'

/**
 * Header del sheet
 * Sticky top cuando hay mucho contenido
 */
const BottomSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'grid gap-1.5 p-4 text-center sm:text-left',
      // Sticky cuando scroll
      'sticky top-0 bg-white z-10',
      // Border bottom sutil cuando scroll
      'border-b border-transparent',
      className
    )}
    {...props}
  />
)
BottomSheetHeader.displayName = 'BottomSheetHeader'

/**
 * Footer del sheet
 * Para botones de acción
 * Sticky bottom, respeta safe area
 */
const BottomSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // Sticky bottom
      'sticky bottom-0 bg-white',
      // Padding + safe area
      'p-4 pb-safe',
      // Border top sutil
      'border-t border-gray-200',
      // Layout de botones
      'flex flex-col gap-2',
      className
    )}
    {...props}
  />
)
BottomSheetFooter.displayName = 'BottomSheetFooter'

/**
 * Título del sheet
 * Semántico h2, estilizado para mobile
 */
const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-gray-900',
      className
    )}
    {...props}
  />
))
BottomSheetTitle.displayName = DrawerPrimitive.Title.displayName

/**
 * Descripción del sheet
 * Para contexto adicional
 */
const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-sm text-gray-600', className)}
    {...props}
  />
))
BottomSheetDescription.displayName = DrawerPrimitive.Description.displayName

/**
 * Body del sheet
 * Contenido scrolleable
 */
const BottomSheetBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // Scroll vertical
      'overflow-y-auto',
      // Padding horizontal
      'px-4',
      // Max height (para que footer sea visible)
      'max-h-[calc(90vh-8rem)]',
      className
    )}
    {...props}
  />
)
BottomSheetBody.displayName = 'BottomSheetBody'

// Exports
export {
  BottomSheet,
  BottomSheetPortal,
  BottomSheetOverlay,
  BottomSheetTrigger,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetFooter,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetBody,
}
