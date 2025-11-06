'use server';

// ========================================
// Waitlist Server Actions
// ========================================

import { agregarAWaitlist } from '@/lib/invitaciones-signup';

export async function agregarAWaitlistAction(
  email: string,
  nombre?: string,
  empresa?: string
) {
  try {
    const result = await agregarAWaitlist(email, nombre, empresa);
    return result;
  } catch (error) {
    console.error('[agregarAWaitlistAction] Error:', error);
    return {
      success: false,
      error: 'Error al agregar a la lista de espera',
    };
  }
}








