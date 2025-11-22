/**
 * Stripe Server Client
 *
 * Cliente de Stripe para uso en el servidor (API routes, Server Actions).
 * NO usar en componentes del cliente.
 */

import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from './config';

// Singleton del cliente de Stripe
let stripeClient: Stripe | null = null;

/**
 * Obtiene el cliente de Stripe (singleton)
 * Lazy initialization para evitar errores si las variables no están configuradas
 */
export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error(
      'Stripe secret key no configurada. Añade STRIPE_SECRET_KEY a las variables de entorno.'
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
      appInfo: {
        name: 'Clousadmin',
        version: '1.0.0',
      },
    });
  }

  return stripeClient;
}

/**
 * Verifica si el cliente de Stripe puede inicializarse
 */
export function canInitializeStripe(): boolean {
  return !!STRIPE_SECRET_KEY;
}
