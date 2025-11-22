'use client';

import { useCallback, useEffect, useState } from 'react';

interface UseBottomSheetOptions {
  /**
   * Callback cuando el bottom sheet se abre
   */
  onOpen?: () => void;
  /**
   * Callback cuando el bottom sheet se cierra
   */
  onClose?: () => void;
  /**
   * Si se puede cerrar arrastrando hacia abajo
   */
  dismissible?: boolean;
  /**
   * Si se cierra al hacer click fuera
   */
}

interface UseBottomSheetReturn {
  /**
   * Si el bottom sheet está abierto
   */
  isOpen: boolean;
  /**
   * Función para abrir el bottom sheet
   */
  open: () => void;
  /**
   * Función para cerrar el bottom sheet
   */
  close: () => void;
  /**
   * Función para alternar el estado
   */
  toggle: () => void;
  /**
   * Props para pasar al elemento drag handle
   */
  dragHandleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * Hook para gestionar el estado y comportamiento de un bottom sheet
 * Incluye funcionalidad de arrastrar para cerrar y detección de swipe
 * 
 * @example
 * const { isOpen, open, close, dragHandleProps } = useBottomSheet({
 *   onClose: () => console.log('Closed'),
 *   dismissible: true,
 * });
 * 
 * return (
 *   <>
 *     <button onClick={open}>Open Sheet</button>
 *     {isOpen && (
 *       <div className="bottom-sheet">
 *         <div {...dragHandleProps} className="drag-handle" />
 *         <button onClick={close}>Close</button>
 *       </div>
 *     )}
 *   </>
 * );
 */
export function useBottomSheet(options: UseBottomSheetOptions = {}): UseBottomSheetReturn {
  const {
    onOpen,
    onClose,
    dismissible = true,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Gestión de arrastre para cerrar
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!dismissible) return;
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  }, [dismissible]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dismissible) return;
    setCurrentY(e.touches[0].clientY);
  }, [dismissible]);

  const handleTouchEnd = useCallback(() => {
    if (!dismissible) return;
    
    const deltaY = currentY - startY;
    
    // Si se arrastró hacia abajo más de 100px, cerrar
    if (deltaY > 100) {
      close();
    }
    
    // Reset
    setStartY(0);
    setCurrentY(0);
  }, [dismissible, currentY, startY, close]);

  // Prevenir scroll del body cuando el sheet está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
    dragHandleProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

