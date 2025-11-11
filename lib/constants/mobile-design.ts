/**
 * Constantes de diseño mobile
 * Centraliza tamaños, espaciados y estilos para mobile
 * Todos los tamaños optimizados para pantallas pequeñas
 */

export const MOBILE_DESIGN = {
  /**
   * Tamaños de texto - Compactos para mobile
   */
  text: {
    // Títulos
    pageTitle: 'text-lg font-bold', // Buenos días (solo desktop)
    widgetTitle: 'text-sm font-semibold', // Título de widget
    sectionTitle: 'text-sm font-semibold', // Próximas ausencias

    // Contenido
    display: 'text-xl font-bold', // Cronómetro principal - compacto para mobile
    body: 'text-xs', // Texto del cuerpo más pequeño
    caption: 'text-[11px] text-gray-500',
    tiny: 'text-[10px] text-gray-500',
  },

  /**
   * Botones - Más compactos pero táctiles
   */
  button: {
    // Altura mínima para touch targets
    primary: 'min-h-[40px] text-xs font-semibold py-2.5',
    secondary: 'min-h-[38px] text-[11px] py-2',
    compact: 'min-h-[36px] text-[10px] py-1.5',
  },

  /**
   * Espaciado - Reducido para mobile
   */
  spacing: {
    widget: 'p-3',
    card: 'p-2.5',
    section: 'space-y-2',
    items: 'space-y-1.5',
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
