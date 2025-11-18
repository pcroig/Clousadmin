/**
 * Constantes de diseño mobile
 * Centraliza tamaños, espaciados y estilos para mobile
 * Todos los tamaños optimizados para pantallas pequeñas
 */

export const MOBILE_DESIGN = {
  /**
   * Tamaños de texto - Responsive mobile-first
   */
  text: {
    // Títulos
    pageTitle: 'text-lg font-bold sm:text-xl', // Responsive
    widgetTitle: 'text-sm font-semibold sm:text-base', // Responsive
    sectionTitle: 'text-sm font-semibold', // Próximas ausencias

    // Contenido
    display: 'text-xl font-bold sm:text-2xl', // Responsive
    body: 'text-sm sm:text-xs', // Mobile first (más grande en mobile)
    caption: 'text-[11px] text-gray-500',
    tiny: 'text-[10px] text-gray-500',
  },

  /**
   * Botones - ✅ WCAG 2.5.5 compliant (44px mínimo en mobile)
   */
  button: {
    // ✅ Touch targets correctos: 44px mobile, 40px desktop
    primary: 'min-h-[44px] sm:min-h-[40px] text-sm font-semibold py-2.5',
    secondary: 'min-h-[44px] sm:min-h-[38px] text-xs py-2',
    compact: 'min-h-[40px] sm:min-h-[36px] text-[11px] py-1.5',
  },

  /**
   * Espaciado - Responsive
   */
  spacing: {
    widget: 'p-4 sm:p-3', // Más padding en mobile
    card: 'p-3 sm:p-2.5', // Más padding en mobile
    section: 'space-y-3 sm:space-y-2', // Más espacio en mobile
    items: 'space-y-2 sm:space-y-1.5', // Más espacio en mobile
  },

  /**
   * Touch Targets - WCAG 2.5.5
   */
  touchTarget: {
    minimum: 'min-h-[44px] min-w-[44px]', // Mínimo WCAG
    comfortable: 'min-h-[48px] min-w-[48px]', // Cómodo
    large: 'min-h-[56px] min-w-[56px]', // Grande
  },

  /**
   * Safe Areas - Para dispositivos con notch
   */
  safeArea: {
    top: 'pt-safe',
    bottom: 'pb-safe',
    paddingBottom: 'pb-20 sm:pb-0', // Para bottom nav
  },

  /**
   * Cards y contenedores
   */
  card: {
    default: 'rounded-lg bg-white shadow-sm border border-gray-200',
    highlight: 'rounded-lg bg-gray-50 p-3',
  },

  /**
   * Tamaños de widgets - Más compactos para mobile
   */
  widget: {
    height: {
      standard: 'h-[240px]', // Reducido de 280px para fichaje
      tall: 'h-[420px]', // Reducido de 480px para ausencias
    },
  },
} as const;

/**
 * Clases responsive combinadas (mobile vs desktop)
 */
export const RESPONSIVE = {
  // Visibilidad
  mobileOnly: 'sm:hidden',
  desktopOnly: 'hidden sm:block',

  // Headers de página
  pageHeader: 'text-xl sm:text-2xl font-bold',

  // Widgets
  widgetPadding: 'p-4 sm:p-6',

  // Grid del dashboard
  dashboardGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5',
} as const;
