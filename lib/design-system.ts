/**
 * Design System - Colores y Utilidades
 *
 * Sistema centralizado de colores y clases para mantener
 * consistencia en toda la plataforma.
 */

// ========================================
// COLORES DE ACENTO
// ========================================

export const accentColors = {
  /** Color principal para elementos activos y destacados */
  active: '#d97757',
  /** Color para elementos no activos o deshabilitados */
  inactive: '#e1af9e',
  /** Color para estados hover e interacción */
  hover: '#c6613f',
} as const;

// ========================================
// CLASES DE ICONOS
// ========================================

/**
 * Clases predefinidas para iconos según contexto de uso
 *
 * Uso:
 * ```tsx
 * import { iconClasses } from '@/lib/design-system';
 *
 * <Clock className={iconClasses.default} />
 * <Calendar className={iconClasses.accent} />
 * ```
 */
export const iconClasses = {
  /** Icono estándar (20px) - gris oscuro por defecto */
  default: 'w-5 h-5 text-gray-600',

  /** Icono estándar (20px) - color de acento */
  accent: 'w-5 h-5 text-[#d97757]',

  /** Icono pequeño (16px) - para botones compactos */
  small: 'w-4 h-4 text-gray-600',

  /** Icono pequeño con acento */
  smallAccent: 'w-4 h-4 text-[#d97757]',

  /** Icono grande (24px) - para encabezados */
  large: 'w-6 h-6 text-gray-600',

  /** Icono extra grande (32px) - para elementos decorativos */
  xlarge: 'w-8 h-8 text-gray-600',

  /** Icono con hover interactivo - gris a color de acento hover */
  interactive: 'w-5 h-5 text-gray-600 hover:text-[#c6613f] transition-colors',

  /** Icono pequeño interactivo */
  interactiveSmall: 'w-4 h-4 text-gray-600 hover:text-[#c6613f] transition-colors',
} as const;

/**
 * Clases predefinidas para botones de icono (square buttons)
 * Mantienen consistencia entre secciones (p.ej. bandeja, denuncias, etc.)
 */
export const iconButtonClasses = {
  default:
    'inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]/40',
} as const;

// ========================================
// CLASES DE ESTADO (BADGES)
// ========================================

/**
 * Clases para badges de estado
 */
export const badgeVariants = {
  /** Estado pendiente/advertencia */
  pending: 'bg-yellow-100 text-yellow-800',

  /** Estado aprobado/éxito */
  approved: 'bg-green-100 text-green-800',

  /** Estado rechazado/error */
  rejected: 'bg-red-100 text-red-800',

  /** Estado cancelado/neutral */
  cancelled: 'bg-gray-100 text-gray-800',

  /** Estado editado/info */
  edited: 'bg-blue-100 text-blue-800',

  /** Estado completo */
  complete: 'bg-green-100 text-green-800',

  /** Estado incompleto */
  incomplete: 'bg-yellow-100 text-yellow-800',
} as const;

// ========================================
// FUNCIONES HELPER
// ========================================

/**
 * Genera una clase de color de texto basada en el estado activo
 *
 * @param isActive - Si el elemento está activo
 * @returns Clase de Tailwind CSS para el color
 *
 * @example
 * ```tsx
 * <Icon className={`w-5 h-5 ${getAccentTextClass(isActive)}`} />
 * ```
 */
export function getAccentTextClass(isActive: boolean): string {
  return isActive ? 'text-[#d97757]' : 'text-gray-600';
}

/**
 * Genera clases completas para un icono con estado activo/inactivo
 *
 * @param isActive - Si el elemento está activo
 * @param size - Tamaño del icono ('small' | 'default' | 'large')
 * @returns Clases completas de Tailwind CSS
 *
 * @example
 * ```tsx
 * <Icon className={getIconClasses(isActive, 'default')} />
 * ```
 */
export function getIconClasses(
  isActive: boolean,
  size: 'small' | 'default' | 'large' = 'default'
): string {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-5 h-5',
    large: 'w-6 h-6',
  };

  const colorClass = isActive ? 'text-[#d97757]' : 'text-gray-600';

  return `${sizeClasses[size]} ${colorClass}`;
}

/**
 * Genera estilos inline para colores de acento
 * Útil cuando no se pueden usar clases de Tailwind
 *
 * @param variant - Variante de color ('active' | 'inactive' | 'hover')
 * @returns Objeto de estilo CSS
 *
 * @example
 * ```tsx
 * <Icon style={getAccentColorStyle('active')} />
 * ```
 */
export function getAccentColorStyle(
  variant: keyof typeof accentColors
): { color: string } {
  return { color: accentColors[variant] };
}

// ========================================
// AVATARES
// ========================================

/**
 * Paleta de colores pastel/crema para avatares sin imagen.
 * Documentada en el sistema de diseño y reutilizada en toda la plataforma.
 */
export const avatarPalette = [
  { background: '#e5dacc', text: '#1f2937' },
  { background: '#bcd1cc', text: '#1f2937' },
  { background: '#cbcadd', text: '#1f2937' },
] as const;

/**
 * Calcula un índice determinista a partir de un identificador (nombre, email, etc.)
 * para seleccionar un color de la paleta de avatares. Garantiza consistencia visual
 * entre renderizados y evita saltos de color.
 */
function getAvatarPaletteIndex(identifier?: string): number {
  if (!identifier) {
    return 0;
  }

  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return Math.abs(hash) % avatarPalette.length;
}

/**
 * Devuelve el color (background y texto) para un avatar sin imagen.
 *
 * @param identifier - Cadena única (nombre completo, email, id...) para obtener un color consistente
 */
export function getAvatarColors(identifier?: string) {
  return avatarPalette[getAvatarPaletteIndex(identifier)];
}

/**
 * Devuelve estilos inline para aplicar el color de la paleta en avatares.
 *
 * @param identifier - Cadena única (nombre completo, email, id...) para obtener un color consistente
 */
export function getAvatarStyle(identifier?: string): {
  backgroundColor: string;
  color: string;
} {
  const { background, text } = getAvatarColors(identifier);
  return {
    backgroundColor: background,
    color: text,
  };
}

// ========================================
// UTILIDADES DE TEMA
// ========================================

/**
 * Configuración de colores para diferentes temas
 * (preparado para modo oscuro futuro)
 */
export const themeColors = {
  light: {
    accent: accentColors,
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-700',
      tertiary: 'text-gray-600',
      disabled: 'text-gray-500',
    },
    background: {
      primary: 'bg-white',
      secondary: 'bg-gray-50',
      tertiary: 'bg-gray-100',
    },
    border: {
      default: 'border-gray-200',
      hover: 'border-gray-300',
    },
  },
} as const;

// ========================================
// TIPO EXPORTS (para TypeScript)
// ========================================

export type IconSize = 'small' | 'default' | 'large' | 'xlarge';
export type BadgeVariant = keyof typeof badgeVariants;
export type AccentColor = keyof typeof accentColors;
