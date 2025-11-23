// ========================================
// Tipos compartidos de Notificaciones
// ========================================
// Define las estructuras de datos que comparten el widget y la bandeja

import type { TipoNotificacion } from '@/lib/notificaciones';

export type PrioridadNotificacion = 'baja' | 'normal' | 'alta' | 'critica';

export interface NotificacionMetadata {
  accionUrl?: string;
  accionTexto?: string;
  requiresModal?: boolean;
  requiresSignature?: boolean;
  requiresSelection?: boolean;
  prioridad?: PrioridadNotificacion;
}

export interface NotificacionUI {
  id: string;
  tipo: TipoNotificacion;
  titulo?: string | null;
  mensaje: string;
  fecha: Date;
  leida?: boolean;
  metadata?: NotificacionMetadata;
}



