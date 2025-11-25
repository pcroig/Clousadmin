// ========================================
// Email Rendering Utility
// ========================================
// Convierte React Email components a HTML string

import { render } from '@react-email/components';
import * as React from 'react';

/**
 * Renderiza un componente de email a HTML y texto plano
 */
export async function renderEmail(component: React.ReactElement): Promise<{
  html: string;
  text: string;
}> {
  const html = await render(component);

  // Para texto plano, usamos render con plainText: true
  const text = await render(component, { plainText: true });

  return { html, text };
}
