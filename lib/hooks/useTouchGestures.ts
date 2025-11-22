'use client';

import { useCallback, useRef, useState } from 'react';

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  velocity: number;
}

interface UseTouchGesturesOptions {
  /**
   * Callback cuando se detecta un swipe
   */
  onSwipe?: (direction: SwipeDirection) => void;
  /**
   * Callback cuando se detecta un long press
   */
  onLongPress?: () => void;
  /**
   * Callback cuando se detecta un tap
   */
  onTap?: () => void;
  /**
   * Distancia mínima en px para considerar un swipe
   */
  swipeThreshold?: number;
  /**
   * Tiempo mínimo en ms para considerar un long press
   */
  longPressThreshold?: number;
}

/**
 * Hook para gestionar gestos táctiles: swipe, long-press, tap
 * 
 * @example
 * const { handlers } = useTouchGestures({
 *   onSwipe: ({ direction }) => {
 *     if (direction === 'left') {
 *       // Acción para swipe izquierda
 *     }
 *   },
 *   onLongPress: () => {
 *     // Mostrar menú contextual
 *   },
 * });
 * 
 * return <div {...handlers}>Swipe me!</div>;
 */
export function useTouchGestures(options: UseTouchGesturesOptions = {}) {
  const {
    onSwipe,
    onLongPress,
    onTap,
    swipeThreshold = 50,
    longPressThreshold = 500,
  } = options;

  const startPos = useRef<TouchPosition | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPos.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Iniciar timer para long press
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress();
        // Añadir feedback háptico si está disponible
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, longPressThreshold);
    }

    setIsSwiping(false);
  }, [onLongPress, longPressThreshold]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPos.current) return;

    // Cancelar long press si hay movimiento
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - startPos.current.x);
    const deltaY = Math.abs(touch.clientY - startPos.current.y);

    // Detectar si está haciendo swipe
    if (deltaX > 10 || deltaY > 10) {
      setIsSwiping(true);
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Cancelar long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!startPos.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startPos.current.x;
    const deltaY = touch.clientY - startPos.current.y;
    const deltaTime = Date.now() - startPos.current.time;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const distance = Math.sqrt(absX * absX + absY * absY);

    // Calcular velocidad (px/ms)
    const velocity = distance / (deltaTime || 1);

    // Determinar si fue un swipe
    if (distance > swipeThreshold && onSwipe) {
      let direction: 'left' | 'right' | 'up' | 'down' | null = null;

      // Determinar dirección predominante
      if (absX > absY) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      onSwipe({
        direction,
        distance,
        velocity,
      });

      // Feedback háptico para swipe
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } 
    // Si no fue swipe ni long press, es un tap
    else if (!isSwiping && distance < 10 && deltaTime < 300 && onTap) {
      onTap();
    }

    // Reset
    startPos.current = null;
    setIsSwiping(false);
  }, [onSwipe, onTap, swipeThreshold, isSwiping]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    isSwiping,
  };
}

/**
 * Hook simplificado para detectar solo swipes horizontales (izquierda/derecha)
 * Útil para navegación entre páginas o cards
 */
export function useHorizontalSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
) {
  return useTouchGestures({
    onSwipe: ({ direction, distance }) => {
      if (distance < threshold) return;
      
      if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      } else if (direction === 'right' && onSwipeRight) {
        onSwipeRight();
      }
    },
    swipeThreshold: threshold,
  });
}

/**
 * Hook para pull-to-refresh
 * Detecta cuando el usuario arrastra hacia abajo desde el top
 */
export function usePullToRefresh(onRefresh: () => void | Promise<void>, threshold = 80) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const { handlers } = useTouchGestures({
    onSwipe: async ({ direction, distance }) => {
      if (direction === 'down' && distance > threshold && window.scrollY === 0) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      }
    },
  });

  return {
    handlers,
    isRefreshing,
    pullDistance,
  };
}


