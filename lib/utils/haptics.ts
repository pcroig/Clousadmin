/**
 * Haptic Feedback Utilities
 *
 * Proporciona feedback táctil (vibración) en dispositivos compatibles
 *
 * UX mobile nativa: Cada interacción importante debe tener feedback
 * sensorial para confirmar al usuario que su acción fue registrada.
 *
 * Compatibilidad: ~95% navegadores mobile modernos
 * Fallback: Falla silenciosamente si no soportado
 */

export type HapticFeedbackType =
  | 'light'      // 10ms - Hover, selección ligera
  | 'medium'     // 20ms - Botones normales, acciones estándar
  | 'heavy'      // 30ms - Acciones importantes (fichar, confirmar)
  | 'success'    // Patrón corto - Operación exitosa
  | 'warning'    // Patrón medio - Advertencia
  | 'error'      // Patrón fuerte - Error crítico
  | 'selection'  // Muy suave - Cambio de selección (lista, tabs)

/**
 * Patrones de vibración por tipo
 * Basado en iOS Haptic Feedback Guidelines
 */
const HAPTIC_PATTERNS: Record<HapticFeedbackType, number | number[]> = {
  // Feedback simple
  light: 10,       // Selection feedback
  medium: 20,      // Notification feedback
  heavy: 30,       // Impact feedback

  // Patrones complejos
  success: [10, 50, 10],           // Suave-pausa-suave
  warning: [20, 100, 20],          // Medio-pausa-medio
  error: [50, 100, 50, 100, 50],   // Fuerte-pausa-fuerte-pausa-fuerte
  selection: 5,                     // Muy ligero para scroll/slider
}

/**
 * Proporciona feedback háptico si el dispositivo lo soporta
 *
 * @param type - Tipo de feedback háptico
 *
 * @example
 * // En un botón normal
 * <Button onClick={() => {
 *   hapticFeedback('medium')
 *   handleAction()
 * }}>
 *
 * @example
 * // En una acción importante
 * <Button onClick={() => {
 *   hapticFeedback('heavy')
 *   handleFichaje()
 * }}>
 *
 * @example
 * // Después de éxito
 * await submitForm()
 * hapticFeedback('success')
 * toast.success('Guardado')
 */
export function hapticFeedback(type: HapticFeedbackType = 'medium'): void {
  // Verificar soporte del navegador
  if (!('vibrate' in navigator)) {
    return
  }

  // Verificar que estamos en un contexto seguro (no background)
  if (document.hidden) {
    return
  }

  const pattern = HAPTIC_PATTERNS[type]

  try {
    // Ejecutar vibración
    navigator.vibrate(pattern)
  } catch (error) {
    // Fallar silenciosamente
    // Algunos navegadores pueden bloquear vibración por políticas
    console.debug('Haptic feedback not available:', error)
  }
}

/**
 * Detiene cualquier vibración en curso
 *
 * Útil cuando se cancela una acción o se cierra un modal
 */
export function stopHapticFeedback(): void {
  if (!('vibrate' in navigator)) {
    return
  }

  try {
    navigator.vibrate(0)
  } catch (error) {
    console.debug('Could not stop haptic feedback:', error)
  }
}

/**
 * Hook de React para usar haptic feedback
 *
 * @example
 * function MyComponent() {
 *   const haptics = useHapticFeedback()
 *
 *   return (
 *     <Button onClick={() => {
 *       haptics.medium()
 *       handleAction()
 *     }}>
 *       Acción
 *     </Button>
 *   )
 * }
 */
export function useHapticFeedback() {
  return {
    light: () => hapticFeedback('light'),
    medium: () => hapticFeedback('medium'),
    heavy: () => hapticFeedback('heavy'),
    success: () => hapticFeedback('success'),
    warning: () => hapticFeedback('warning'),
    error: () => hapticFeedback('error'),
    selection: () => hapticFeedback('selection'),
    stop: stopHapticFeedback,
  }
}

/**
 * Clase helper para encadenar feedback con acciones
 *
 * @example
 * const vibrate = new HapticController()
 *
 * vibrate
 *   .medium()
 *   .then(() => handleAction())
 *   .then(() => vibrate.success())
 *   .catch(() => vibrate.error())
 */
export class HapticController {
  medium(): this {
    hapticFeedback('medium')
    return this
  }

  heavy(): this {
    hapticFeedback('heavy')
    return this
  }

  light(): this {
    hapticFeedback('light')
    return this
  }

  success(): this {
    hapticFeedback('success')
    return this
  }

  error(): this {
    hapticFeedback('error')
    return this
  }

  warning(): this {
    hapticFeedback('warning')
    return this
  }

  selection(): this {
    hapticFeedback('selection')
    return this
  }

  stop(): this {
    stopHapticFeedback()
    return this
  }

  /**
   * Delay para encadenar acciones
   */
  async delay(ms: number): Promise<this> {
    await new Promise((resolve) => setTimeout(resolve, ms))
    return this
  }
}

/**
 * Detecta si el dispositivo soporta haptic feedback
 */
export function supportsHapticFeedback(): boolean {
  return 'vibrate' in navigator
}

/**
 * Configuración global de haptic feedback
 */
class HapticConfig {
  private enabled = true

  /**
   * Deshabilita haptic feedback globalmente
   * Útil para preferencias de usuario
   */
  disable(): void {
    this.enabled = false
  }

  /**
   * Habilita haptic feedback globalmente
   */
  enable(): void {
    this.enabled = true
  }

  /**
   * Verifica si haptic está habilitado
   */
  isEnabled(): boolean {
    return this.enabled && supportsHapticFeedback()
  }
}

export const hapticConfig = new HapticConfig()

/**
 * Wrapper que respeta configuración global
 */
export function safeHapticFeedback(type: HapticFeedbackType): void {
  if (hapticConfig.isEnabled()) {
    hapticFeedback(type)
  }
}
