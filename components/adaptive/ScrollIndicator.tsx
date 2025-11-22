'use client';

import { ChevronDown } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { cn } from '@/lib/utils';

export interface ScrollIndicatorProps {
  /** Referencia al contenedor scrollable */
  containerRef?: React.RefObject<HTMLElement>;
  /** Mostrar solo en mobile (default: true) */
  mobileOnly?: boolean;
  /** Offset desde el bottom (default: from constants) */
  bottom?: string;
  /** Offset desde el right (default: from constants) */
  right?: string;
  /** Clases adicionales */
  className?: string;
}

/**
 * Flecha visual que indica contenido scrollable hacia abajo
 * 
 * Se oculta automáticamente cuando el usuario llega al final del scroll
 * 
 * @example
 * // Básico (auto-detecta scroll del window)
 * <ScrollIndicator />
 * 
 * // Con contenedor específico
 * const containerRef = useRef<HTMLDivElement>(null);
 * <ScrollIndicator containerRef={containerRef} />
 */
export function ScrollIndicator({
  containerRef,
  mobileOnly = true,
  bottom,
  right,
  className,
}: ScrollIndicatorProps) {
  const isMobile = useIsMobile();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Capturar el valor del ref al inicio del effect para usar en cleanup
    const container = containerRef?.current;

    const handleScroll = () => {
      if (container) {
        // Contenedor específico
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        setIsVisible(!isNearBottom);
      } else {
        // Window global
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsVisible(!isNearBottom);
      }
    };

    // Check inicial
    handleScroll();

    // Listen to scroll
    if (container) {
      container.addEventListener('scroll', handleScroll);
    } else {
      window.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, [containerRef]);

  // No mostrar en desktop si mobileOnly
  if (mobileOnly && !isMobile) {
    return null;
  }

  // No mostrar si no hay contenido scrollable o ya llegó al final
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed z-10 pointer-events-none',
        MOBILE_DESIGN.scrollIndicator.animation,
        className
      )}
      style={{
        bottom: bottom || '1rem',
        right: right || '1rem',
      }}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          'bg-gray-900/80 text-white shadow-lg',
          MOBILE_DESIGN.scrollIndicator.size
        )}
      >
        <ChevronDown className={MOBILE_DESIGN.scrollIndicator.icon} />
      </div>
    </div>
  );
}

