// ========================================
// Helpers para UI de Notificaciones
// ========================================
// Utilidades para iconos, colores y estilos de notificaciones

import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileSignature,
  FileText,
  type LucideIcon,
  Users,
  XCircle,
} from 'lucide-react';

import { CategoriaNotificacion, obtenerCategoria, TipoNotificacion } from '@/lib/notificaciones';

/**
 * Obtiene el icono de Lucide según la categoría de notificación
 */
export function obtenerIconoPorCategoria(
  categoria: CategoriaNotificacion
): LucideIcon {
  const iconos: Record<CategoriaNotificacion, LucideIcon> = {
    ausencias: Calendar,
    fichajes: Clock,
    nominas: DollarSign,
    fichas: FileText,
    generales: Bell,
  };

  return iconos[categoria];
}

/**
 * Obtiene el icono según el tipo de notificación
 * Algunos tipos específicos tienen iconos personalizados
 */
export function obtenerIconoPorTipo(tipo: TipoNotificacion): LucideIcon {
  // Iconos específicos para tipos especiales
  const iconosEspecificos: Partial<Record<TipoNotificacion, LucideIcon>> = {
    firma_pendiente: FileSignature,
    firma_completada: FileSignature,
    documento_solicitado: FileText,
    documento_subido: FileText,
    documento_rechazado: FileText,
  documento_generado: FileText,
  documento_pendiente_rellenar: FileText,
    ausencia_aprobada: CheckCircle,
    ausencia_rechazada: XCircle,
    nomina_error: AlertCircle,
  nomina_validada: DollarSign,
  complementos_pendientes: DollarSign,
    denuncia_recibida: AlertCircle,
  denuncia_actualizada: AlertCircle,
    nuevo_empleado_equipo: Users,
    asignado_equipo: Users,
  };

  // Si hay un icono específico, usarlo
  if (iconosEspecificos[tipo]) {
    return iconosEspecificos[tipo]!;
  }

  // Sino, usar el icono de la categoría
  const categoria = obtenerCategoria(tipo);
  return obtenerIconoPorCategoria(categoria);
}

/**
 * Formatea el tipo de notificación para mostrar en UI
 */
export function formatearTipoNotificacion(tipo: TipoNotificacion): string {
  const labels: Partial<Record<TipoNotificacion, string>> = {
    ausencia_solicitada: 'Ausencia solicitada',
    ausencia_aprobada: 'Ausencia aprobada',
    ausencia_rechazada: 'Ausencia rechazada',
    ausencia_cancelada: 'Ausencia cancelada',
    campana_vacaciones_creada: 'Campaña de vacaciones',
    campana_vacaciones_cuadrada: 'Campaña cuadrada',
    campana_vacaciones_completada: 'Campaña completada',
    empleado_creado: 'Nuevo empleado',
    fichaje_autocompletado: 'Fichaje autocompletado',
    fichaje_requiere_revision: 'Fichaje requiere revisión',
    fichaje_resuelto: 'Fichaje resuelto',
    cambio_manager: 'Cambio de manager',
    asignado_equipo: 'Asignado a equipo',
    nuevo_empleado_equipo: 'Nuevo miembro de equipo',
    cambio_puesto: 'Cambio de puesto',
    jornada_asignada: 'Jornada asignada',
    solicitud_creada: 'Solicitud creada',
    solicitud_aprobada: 'Solicitud aprobada',
    solicitud_rechazada: 'Solicitud rechazada',
    nomina_disponible: 'Nómina disponible',
    nomina_error: 'Error en nómina',
    complementos_pendientes: 'Complementos pendientes',
    documento_solicitado: 'Documento solicitado',
    documento_subido: 'Documento subido',
    documento_rechazado: 'Documento rechazado',
    documento_generado: 'Documento generado',
    documento_pendiente_rellenar: 'Documento pendiente de completar',
    firma_pendiente: 'Firma pendiente',
    firma_completada: 'Firma completada',
    denuncia_recibida: 'Denuncia recibida',
    denuncia_actualizada: 'Denuncia actualizada',
    onboarding_completado: 'Onboarding completado',
    nomina_validada: 'Nómina validada',
  };

  return labels[tipo] || tipo.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

