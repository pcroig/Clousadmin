/**
 * Design Tokens
 * ------------------------------------------------------------
 * Fuente única de verdad para colores, breakpoints y helpers
 * responsive reutilizables entre componentes adaptativos.
 */

type TypographyVariantConfig = {
  mobile: string
  desktop: string
  responsive: string
}

function createTypographyVariant({
  mobile,
  desktop,
  extras = '',
}: {
  mobile: string
  desktop: string
  extras?: string
}): TypographyVariantConfig {
  return {
    mobile: `${mobile} ${extras}`.trim(),
    desktop: `${desktop} ${extras}`.trim(),
    responsive: `${mobile} sm:${desktop} ${extras}`.trim(),
  }
}

const typography = {
  pageHeading: createTypographyVariant({
    mobile: 'text-xl',
    desktop: 'text-2xl',
    extras: 'font-bold leading-tight tracking-tight text-gray-900',
  }),
  sectionHeading: createTypographyVariant({
    mobile: 'text-lg',
    desktop: 'text-xl',
    extras: 'font-semibold text-gray-900',
  }),
  widgetTitle: createTypographyVariant({
    mobile: 'text-base',
    desktop: 'text-lg',
    extras: 'font-semibold text-gray-900',
  }),
  body: createTypographyVariant({
    mobile: 'text-sm',
    desktop: 'text-base',
    extras: 'text-gray-700',
  }),
  caption: createTypographyVariant({
    mobile: 'text-xs',
    desktop: 'text-sm',
    extras: 'text-gray-500',
  }),
  tiny: createTypographyVariant({
    mobile: 'text-[10px]',
    desktop: 'text-xs',
    extras: 'text-gray-500 uppercase tracking-wide',
  }),
} as const

export type TypographyVariant = keyof typeof typography

export const DESIGN_TOKENS = {
  colors: {
    brand: {
      primary: '#d97757',
      hover: '#c6613f',
      muted: '#e1af9e',
    },
    background: {
      base: '#FAF9F5',
      surface: '#FFFFFF',
      muted: '#F5F4F0',
    },
    gray: {
      50: '#FAF9F5',
      100: '#EFEFED',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    text: {
      primary: '#111827',
      secondary: '#374151',
      tertiary: '#4B5563',
      muted: '#9CA3AF',
    },
  },
  breakpoints: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
  },
  zIndex: {
    bottomNav: 50,
    modal: 50,
    toast: 100,
  },
  typography,
  touchTarget: {
    minHeight: 44,
    minWidth: 44,
  },
} as const

export type DesignTokens = typeof DESIGN_TOKENS

export const TOUCH_TARGET_CLASSES = {
  base: 'min-h-[44px] min-w-[44px]',
  compact: 'min-h-[40px] min-w-[40px]',
  button: 'h-11 sm:h-9',
  buttonLg: 'h-12 sm:h-10',
  icon: 'size-11 sm:size-9',
} as const

export const RESPONSIVE_CLASSES = {
  visibility: {
    mobileOnly: 'sm:hidden',
    desktopOnly: 'hidden sm:block',
    hideOnMobile: 'hidden sm:flex',
    showOnMobile: 'flex sm:hidden',
  },
  layout: {
    containerPadding: 'px-4 sm:px-8',
    verticalSpacing: 'space-y-4 sm:space-y-6',
    bottomNavSafeArea: 'pb-16 sm:pb-0',
  },
  grid: {
    dashboard: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
  },
  text: Object.fromEntries(
    Object.entries(typography).map(([key, value]) => [key, value.responsive])
  ) as Record<TypographyVariant, string>,
} as const

export function getTypographyClasses(
  variant: TypographyVariant,
  mode: 'mobile' | 'desktop' | 'responsive' = 'responsive'
): string {
  const config = typography[variant]
  if (!config) {
    return ''
  }

  if (mode === 'mobile') return config.mobile
  if (mode === 'desktop') return config.desktop
  return config.responsive
}

