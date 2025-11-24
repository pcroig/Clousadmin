/**
 * Helpers para testing de componentes React
 * Simplifica setup de Testing Library
 */

import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement, ReactNode } from 'react';

// ========================================
// PROVIDERS WRAPPER
// ========================================

/**
 * Wrapper que incluye todos los providers necesarios
 * para componentes de la app
 */
function AllProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Añadir aquí providers globales cuando sean necesarios */}
      {/* Ejemplo: ThemeProvider, QueryClientProvider, etc. */}
      {children}
    </>
  );
}

// ========================================
// CUSTOM RENDER
// ========================================

/**
 * Custom render que incluye providers automáticamente
 * y retorna userEvent configurado
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const user = userEvent.setup();

  return {
    user,
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

// ========================================
// RE-EXPORTS
// ========================================

// Re-exportar todo de testing-library para conveniencia
export * from '@testing-library/react';
export { userEvent };

// Export custom render como render por defecto
export { renderWithProviders as render };
