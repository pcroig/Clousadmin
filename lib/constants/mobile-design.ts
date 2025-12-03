/**
 * Constantes de diseño mobile
 * Centraliza tamaños, espaciados y estilos para mobile
 * Todos los tamaños optimizados para pantallas pequeñas
 */

/**
 * Breakpoints estandarizados
 * Mobile: < 640px (sm)
 * Tablet: 640px - 1024px (sm to lg)
 * Desktop: >= 1024px (lg)
 */
export const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280,
} as const;

export type ViewportSize = 'mobile' | 'tablet' | 'desktop';

export const MOBILE_DESIGN = {
  /**
   * Tamaños de texto - MÁS COMPACTOS para mobile
   */
  text: {
    // Títulos
    pageTitle: 'text-base font-bold', // Buenos días (solo desktop)
    widgetTitle: 'text-xs font-semibold', // Título de widget
    sectionTitle: 'text-xs font-semibold', // Próximas ausencias
    cardTitle: 'text-[11px] font-semibold',

    // Contenido
    display: 'text-lg font-bold', // Cronómetro principal - más compacto
    displayLarge: 'text-xl font-bold', // Números grandes
    body: 'text-[11px]', // Texto del cuerpo más pequeño
    bodyMedium: 'text-xs',
    caption: 'text-[10px] text-gray-500',
    tiny: 'text-[9px] text-gray-500',
    label: 'text-[11px] font-medium text-gray-700',
  },

  /**
   * Botones - Más compactos pero táctiles (mínimo 44x44px para touch)
   */
  button: {
    // Altura mínima para touch targets
    primary: 'min-h-[44px] text-xs font-semibold py-2.5 px-3',
    secondary: 'min-h-[40px] text-[11px] font-medium py-2 px-2.5',
    compact: 'min-h-[36px] text-[10px] py-1.5 px-2',
    icon: 'h-10 w-10 min-h-[40px]', // Touch target para iconos
    iconSmall: 'h-8 w-8 min-h-[32px]',
  },

  /**
   * Espaciado - MÁS REDUCIDO para mobile pero manteniendo usabilidad
   */
  spacing: {
    // Padding de contenedores
    page: 'px-3 py-3',
    pageTop: 'pt-3',
    pageBottom: 'pb-3',
    pageHorizontal: 'px-3',
    
    // Padding de widgets y cards
    widget: 'p-2.5',
    widgetCompact: 'p-2',
    card: 'p-2',
    cardLarge: 'p-3',
    
    // Spacing entre elementos
    section: 'space-y-1.5',
    sectionLarge: 'space-y-2',
    items: 'space-y-1',
    itemsCompact: 'space-y-0.5',
    
    // Gaps para grid/flex
    gap: 'gap-1.5',
    gapLarge: 'gap-2',
    gapSmall: 'gap-1',
  },

  /**
   * Márgenes
   */
  margin: {
    section: 'mb-3',
    sectionLarge: 'mb-4',
    item: 'mb-2',
    element: 'mb-1.5',
  },

  /**
   * Cards y contenedores
   */
  card: {
    default: 'rounded-lg bg-white shadow-sm border border-gray-200',
    defaultNoBorder: 'rounded-lg bg-white',
    compact: 'rounded-md bg-white shadow-sm border border-gray-200 p-2',
    highlight: 'rounded-lg bg-gray-50 p-3',
    highlightCompact: 'rounded-md bg-gray-50 p-2',
  },

  /**
   * Tamaños de widgets - Más compactos para mobile
   */
  widget: {
    height: {
      compact: 'h-[180px]', // Para widgets muy pequeños
      standard: 'h-[240px]', // Para fichaje, plantilla
      tall: 'h-[420px]', // Para ausencias, notificaciones
      full: 'h-full', // Ocupar todo el espacio disponible
    },
  },

  /**
   * Tamaños de componentes específicos - MÁS PEQUEÑOS
   */
  components: {
    avatar: {
      small: 'h-5 w-5',
      medium: 'h-7 w-7',
      large: 'h-9 w-9',
    },
    badge: {
      small: 'text-[9px] px-1.5 py-0',
      medium: 'text-[10px] px-1.5 py-0.5',
    },
    icon: {
      small: 'h-3.5 w-3.5',
      medium: 'h-4 w-4',
      large: 'h-5 w-5',
    },
    input: {
      height: 'min-h-[44px]', // Touch target
      text: 'text-sm',
    },
    // Formularios optimizados para touch
    form: {
      label: 'text-sm font-medium text-gray-700 mb-1.5',
      input: 'h-11 text-base', // Altura táctil + texto legible
      select: 'h-11 text-base',
      textarea: 'min-h-[88px] text-base', // Doble de altura mínima
      checkbox: 'h-5 w-5', // Más grande para touch
      radio: 'h-5 w-5',
    },
    // Calendar optimizado para touch
    calendar: {
      dayButton: 'h-11 w-11 text-base', // Botones más grandes
      dayButtonCompact: 'h-9 w-9 text-sm',
      monthButton: 'h-10 px-3 text-sm',
      yearButton: 'h-10 px-3 text-sm',
    },
    // Select/Combobox mobile
    select: {
      trigger: 'h-11 text-base',
      item: 'min-h-[44px] px-3 text-base', // Items táctiles
      itemCompact: 'min-h-[40px] px-2.5 text-sm',
    },
    // Popover/Dropdown mobile
    popover: {
      // En mobile, usar modal full-screen para listas largas
      maxHeight: 'max-h-[60vh]', // Máximo 60% de la pantalla
      width: 'w-full', // Ancho completo en mobile
    },
  },

  /**
   * Layouts específicos
   */
  layout: {
    // Stack vertical con spacing
    stack: 'flex flex-col space-y-2',
    stackCompact: 'flex flex-col space-y-1.5',
    stackLarge: 'flex flex-col space-y-3',
    
    // Inline horizontal
    inline: 'flex items-center space-x-2',
    inlineCompact: 'flex items-center space-x-1.5',
    inlineLarge: 'flex items-center space-x-3',
    
    // Grid
    gridAuto: 'grid grid-cols-1 gap-2',
    gridTwo: 'grid grid-cols-2 gap-2',
  },

  /**
   * Configuración de modales según complejidad
   */
  modal: {
    // Full-screen para formularios complejos (>5 campos)
    fullScreen: {
      className: 'sm:max-w-full sm:h-screen sm:rounded-none',
      complexity: 'complex' as const,
    },
    // Bottom sheet para acciones rápidas
    bottomSheet: {
      className: 'sm:max-w-lg',
      complexity: 'simple' as const,
    },
    // Modal estándar centrado
    standard: {
      className: 'sm:max-w-md',
      complexity: 'medium' as const,
    },
  },

  /**
   * Action Bar - Barra de acciones compacta para mobile
   */
  actionBar: {
    height: 'h-12', // 48px
    iconSize: 'h-5 w-5', // 20px icons
    iconButton: 'h-10 w-10 min-h-[40px]', // Botón de icono táctil
    gap: 'gap-2',
    padding: 'px-4 py-2',
  },

  /**
   * Filter Bar - Barra de filtros compacta
   */
  filterBar: {
    height: 'h-11', // 44px - touch target
    badge: 'h-5 px-2 text-[10px] font-semibold',
    badgeDot: 'h-2 w-2 rounded-full bg-blue-600',
    searchInput: 'h-10 text-sm',
    button: 'h-10 px-3 text-sm',
  },

  /**
   * Scroll Indicator - Flecha bounce para indicar contenido scrollable
   */
  scrollIndicator: {
    size: 'h-8 w-8',
    position: 'bottom-4 right-4',
    animation: 'animate-bounce',
    icon: 'h-5 w-5',
  },

  /**
   * Table mobile optimizado
   */
  table: {
    // Máxima altura para dejar espacio a headers/filters
    maxHeight: 'max-h-[calc(100vh-280px)]',
    maxHeightCompact: 'max-h-[calc(100vh-200px)]', // Cuando hay menos controles
    cardPadding: 'p-3', // Padding compacto en mobile cards
    cardPaddingCompact: 'p-2',
    rowHeight: 'min-h-[60px]', // Altura mínima de fila táctil
  },
} as const;

/**
 * Clases responsive combinadas (mobile vs desktop)
 */
export const RESPONSIVE = {
  // Visibilidad
  mobileOnly: 'sm:hidden',
  tabletUp: 'hidden sm:block',
  desktopOnly: 'hidden lg:block',
  mobileTablet: 'lg:hidden',

  // Headers de página
  pageHeader: 'text-xl sm:text-2xl font-bold',
  pageHeaderHidden: 'hidden sm:block text-2xl font-bold',

  // Widgets
  widgetPadding: 'p-3 sm:p-6',
  widgetPaddingCompact: 'p-2 sm:p-4',

  // Grid del dashboard
  dashboardGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4',
  dashboardGridAuto: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-3 sm:gap-4',

  // Contenedores
  container: 'px-4 sm:px-8',
  containerNarrow: 'px-4 sm:px-6',
  
  // Touch targets
  touchTarget: 'min-h-[44px] sm:min-h-[36px]',
  touchTargetIcon: 'h-11 w-11 sm:h-9 sm:w-9',
} as const;
/**
 * Utilidades para detectar viewport
 */
export const getViewportSize = (width: number): ViewportSize => {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
};

export const isMobile = (width: number): boolean => width < BREAKPOINTS.mobile;
export const isTablet = (width: number): boolean => width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
export const isDesktop = (width: number): boolean => width >= BREAKPOINTS.tablet;

