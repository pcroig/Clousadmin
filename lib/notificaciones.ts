// ========================================
// Sistema Centralizado de Notificaciones
// ========================================
// Servicio eficiente y escalable para gestionar notificaciones

import { Prisma, PrismaClient } from '@prisma/client';

import { UsuarioRol } from '@/lib/constants/enums';

// ========================================
// TIPOS
// ========================================

export type TipoNotificacion =
  // Ausencias
  | 'ausencia_solicitada'
  | 'ausencia_aprobada'
  | 'ausencia_rechazada'
  | 'ausencia_cancelada'
  | 'ausencia_modificada'
  | 'campana_vacaciones_creada'
  | 'campana_vacaciones_cuadrada'
  | 'campana_vacaciones_completada'
  // Empleados
  | 'empleado_creado'
  // Fichajes
  | 'fichaje_autocompletado'
  | 'fichaje_requiere_revision'
  | 'fichaje_resuelto'
  | 'fichaje_modificado'
  | 'fichaje_aprobado'
  | 'fichaje_rechazado'
  // Equipos
  | 'cambio_manager'
  | 'asignado_equipo'
  | 'nuevo_empleado_equipo'
  | 'cambio_puesto'
  | 'jornada_asignada'
  // Solicitudes
  | 'solicitud_creada'
  | 'solicitud_aprobada'
  | 'solicitud_rechazada'
  // Payroll/Nóminas
  | 'nomina_disponible'
  | 'nomina_error'
  | 'nomina_validada'
  | 'complementos_pendientes'
  | 'complemento_asignado'
  // Documentos
  | 'documento_solicitado'
  | 'documento_subido'
  | 'documento_rechazado'
  | 'documento_generado'
  | 'documento_pendiente_rellenar'
  | 'documento_eliminado'
  // Firmas digitales
  | 'firma_pendiente'
  | 'firma_completada'
  // Denuncias
  | 'denuncia_recibida'
  | 'denuncia_actualizada'
  // Onboarding
  | 'onboarding_completado';

export type CategoriaNotificacion = 'ausencias' | 'fichajes' | 'nominas' | 'fichas' | 'generales';

export type PrioridadNotificacion = 'baja' | 'normal' | 'alta' | 'critica';

type NotificacionMetadataBase = {
  prioridad?: PrioridadNotificacion;
  accionUrl?: string;
  accionTexto?: string;
};

export type NotificacionMetadata = NotificacionMetadataBase & {
  [key: string]: Prisma.JsonValue | undefined;
};

export type NotificacionEnvioOptions = {
  actorUsuarioId?: string;
  omitUsuarioIds?: readonly string[];
};

// ========================================
// FUNCIONES PÚBLICAS DE UTILIDAD
// ========================================

/**
 * Obtiene la categoría de una notificación según su tipo
 */
export function obtenerCategoria(tipo: TipoNotificacion): CategoriaNotificacion {
  // Ausencias
  if (
    tipo === 'ausencia_solicitada' ||
    tipo === 'ausencia_aprobada' ||
    tipo === 'ausencia_rechazada' ||
    tipo === 'ausencia_cancelada' ||
    tipo === 'campana_vacaciones_creada' ||
    tipo === 'campana_vacaciones_cuadrada' ||
    tipo === 'campana_vacaciones_completada'
  ) {
    return 'ausencias';
  }

  // Fichajes
  if (
    tipo === 'fichaje_autocompletado' ||
    tipo === 'fichaje_requiere_revision' ||
    tipo === 'fichaje_resuelto' ||
    tipo === 'fichaje_modificado'
  ) {
    return 'fichajes';
  }

  // Nóminas
  if (
    tipo === 'nomina_disponible' ||
    tipo === 'nomina_error' ||
    tipo === 'nomina_validada' ||
    tipo === 'complementos_pendientes'
  ) {
    return 'nominas';
  }

  // Fichas (documentos, firmas, empleados, equipos)
  if (
    tipo === 'documento_solicitado' ||
    tipo === 'documento_subido' ||
    tipo === 'documento_rechazado' ||
    tipo === 'documento_generado' ||
    tipo === 'documento_pendiente_rellenar' ||
    tipo === 'firma_pendiente' ||
    tipo === 'firma_completada' ||
    tipo === 'empleado_creado' ||
    tipo === 'cambio_puesto' ||
    tipo === 'jornada_asignada'
  ) {
    return 'fichas';
  }

  // Generales (solicitudes, equipos, denuncias, onboarding)
  return 'generales';
}

// ========================================
// FUNCIONES HELPER INTERNAS
// ========================================

/**
 * Obtiene usuarios que deben ser notificados según los roles
 */
async function obtenerUsuariosANotificar(
  prisma: PrismaClient,
  empresaId: string,
  roles: {
    hrAdmin?: boolean;
    manager?: string | null; // empleadoId del manager
    empleado?: string; // empleadoId del empleado
  }
): Promise<string[]> {
  const usuarioIds: string[] = [];

  // HR Admins
  if (roles.hrAdmin) {
    const hrAdmins = await prisma.usuarios.findMany({
      where: { empresaId, rol: UsuarioRol.hr_admin, activo: true },
      select: { id: true },
    });
    usuarioIds.push(...hrAdmins.map(u => u.id));
  }

  // Manager
  if (roles.manager) {
    const manager = await prisma.empleados.findUnique({
      where: { id: roles.manager, activo: true },
      select: { usuarioId: true, usuario: { select: { activo: true } } },
    });
    if (manager?.usuarioId && manager.usuario.activo && !usuarioIds.includes(manager.usuarioId)) {
      usuarioIds.push(manager.usuarioId);
    }
  }

  // Empleado
  if (roles.empleado) {
    const empleado = await prisma.empleados.findUnique({
      where: { id: roles.empleado, activo: true },
      select: { usuarioId: true, usuario: { select: { activo: true } } },
    });
    if (empleado?.usuarioId && empleado.usuario.activo && !usuarioIds.includes(empleado.usuarioId)) {
      usuarioIds.push(empleado.usuarioId);
    }
  }

  return usuarioIds;
}

/**
 * Crea notificaciones para múltiples usuarios
 */
async function crearNotificaciones(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    usuarioIds: string[];
    tipo: TipoNotificacion;
    mensaje: string;
    metadata: NotificacionMetadata;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, usuarioIds, tipo, mensaje, metadata } = params;

  const destinatarios = filtrarDestinatarios(usuarioIds, options);

  if (destinatarios.length === 0) return;

  await prisma.notificaciones.createMany({
    data: destinatarios.map(usuarioId => ({
      empresaId,
      usuarioId,
      tipo,
      mensaje,
      metadata,
      leida: false,
    })),
  });
}

function filtrarDestinatarios(usuarioIds: string[], options?: NotificacionEnvioOptions): string[] {
  const unicos = Array.from(new Set(usuarioIds));
  if (!options) {
    return unicos;
  }

  const exclusiones = new Set<string>();
  if (options.omitUsuarioIds) {
    for (const id of options.omitUsuarioIds) {
      if (id) {
        exclusiones.add(id);
      }
    }
  }
  if (options.actorUsuarioId) {
    exclusiones.add(options.actorUsuarioId);
  }

  if (exclusiones.size === 0) {
    return unicos;
  }

  return unicos.filter(id => !exclusiones.has(id));
}

const humanizeTexto = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-ES')
    .trim();

const formatLabel = (value: string) => {
  if (!value) return '';
  const humanized = humanizeTexto(value);
  if (!humanized) return '';
  return humanized.charAt(0).toLocaleUpperCase('es-ES') + humanized.slice(1);
};

/**
 * Formatea una fecha en formato corto español: "15 dic"
 */
const formatFechaCorta = (fecha: Date) => {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  return `${dia} ${mes}`;
};

const formatRange = (inicio: Date, fin: Date) => {
  const inicioStr = formatFechaCorta(inicio);
  const finStr = formatFechaCorta(fin);

  // Si es el mismo día, solo mostrar una fecha
  if (inicio.toDateString() === fin.toDateString()) {
    return inicioStr;
  }

  return `${inicioStr} al ${finStr}`;
};

const formatDias = (dias: number) => (dias === 1 ? '1 día' : `${dias} días`);

// ========================================
// AUSENCIAS
// ========================================

export async function crearNotificacionAusenciaSolicitada(
  prisma: PrismaClient,
  params: {
    ausenciaId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    tipo: string;
    fechaInicio: Date;
    fechaFin: Date;
    diasSolicitados: number;
  },
  options?: NotificacionEnvioOptions
) {
  const { ausenciaId, empresaId, empleadoId, empleadoNombre, tipo, fechaInicio, fechaFin, diasSolicitados } = params;
  const tipoLabel = formatLabel(tipo);
  const rangoFechas = formatRange(fechaInicio, fechaFin);
  const diasLabel = formatDias(diasSolicitados);

  // Obtener manager del empleado
  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    select: { managerId: true },
  });

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
    manager: empleado?.managerId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_solicitada',
    mensaje: `${empleadoNombre} ha solicitado ${diasLabel} de ${tipoLabel.toLowerCase()} del ${rangoFechas}`,
    metadata: {
      ausenciaId,
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      diasSolicitados,
      empleadoId,
      empleadoNombre,
      prioridad: 'alta',
      accionUrl: '/hr/horario/ausencias',
      accionTexto: 'Revisar solicitud',
    },
  }, options);
}

export async function crearNotificacionAusenciaAprobada(
  prisma: PrismaClient,
  params: {
    ausenciaId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    tipo: string;
    fechaInicio: Date;
    fechaFin: Date;
    diasSolicitados?: number;
  },
  options?: NotificacionEnvioOptions
) {
  const { ausenciaId, empresaId, empleadoId, tipo, fechaInicio, fechaFin, diasSolicitados } = params;
  const tipoLabel = formatLabel(tipo);
  const rangoFechas = formatRange(fechaInicio, fechaFin);

  // Calcular días si no se proporcionan
  const dias = diasSolicitados ?? Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const diasLabel = formatDias(dias);

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_aprobada',
    mensaje: `Tu solicitud de ${diasLabel} de ${tipoLabel.toLowerCase()} (${rangoFechas}) ha sido aprobada`,
    metadata: {
      ausenciaId,
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      diasSolicitados: dias,
      prioridad: 'normal',
      accionUrl: '/empleado/horario/ausencias',
      accionTexto: 'Ver ausencia',
    },
  }, options);
}

export async function crearNotificacionAusenciaRechazada(
  prisma: PrismaClient,
  params: {
    ausenciaId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    tipo: string;
    fechaInicio: Date;
    fechaFin: Date;
    diasSolicitados?: number;
    motivoRechazo?: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { ausenciaId, empresaId, empleadoId, tipo, fechaInicio, fechaFin, diasSolicitados, motivoRechazo } = params;
  const tipoLabel = formatLabel(tipo);
  const rangoFechas = formatRange(fechaInicio, fechaFin);

  // Calcular días si no se proporcionan
  const dias = diasSolicitados ?? Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const diasLabel = formatDias(dias);

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_rechazada',
    mensaje: `Tu solicitud de ${diasLabel} de ${tipoLabel.toLowerCase()} (${rangoFechas}) no ha sido aprobada${motivoRechazo ? `. Motivo: ${motivoRechazo}` : ''}`,
    metadata: {
      ausenciaId,
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      diasSolicitados: dias,
      ...(motivoRechazo && { motivoRechazo }),
      prioridad: 'normal',
      accionUrl: '/empleado/horario/ausencias',
      accionTexto: 'Ver detalles',
    },
  }, options);
}

export async function crearNotificacionAusenciaCancelada(
  prisma: PrismaClient,
  params: {
    ausenciaId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    tipo: string;
    fechaInicio: Date;
    fechaFin: Date;
    diasSolicitados?: number;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, empleadoId, empleadoNombre, tipo, fechaInicio, fechaFin, diasSolicitados } = params;
  const tipoLabel = formatLabel(tipo);
  const rangoFechas = formatRange(fechaInicio, fechaFin);

  // Calcular días si no se proporcionan
  const dias = diasSolicitados ?? Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const diasLabel = formatDias(dias);

  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    select: { managerId: true },
  });

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
    manager: empleado?.managerId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_cancelada',
    mensaje: `${empleadoNombre} ha cancelado ${diasLabel} de ${tipoLabel.toLowerCase()} (${rangoFechas})`,
    metadata: {
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      diasSolicitados: dias,
      empleadoId,
      empleadoNombre,
      prioridad: 'normal',
    },
  }, options);
}

/**
 * Notifica a HR/Admin y Manager cuando una ausencia es auto-aprobada
 * (tipos que no requieren aprobación: enfermedad, enfermedad_familiar, maternidad_paternidad)
 * NO notifica al empleado - el auto-aprobado se registra en AutoCompletado
 */
export async function crearNotificacionAusenciaAutoAprobada(
  prisma: PrismaClient,
  params: {
    ausenciaId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    managerId?: string | null;
    tipo: string;
    fechaInicio: Date;
    fechaFin: Date;
    diasSolicitados?: number;
  },
  options?: NotificacionEnvioOptions
) {
  const { ausenciaId, empresaId, empleadoId, empleadoNombre, managerId, tipo, fechaInicio, fechaFin, diasSolicitados } = params;
  const tipoLabel = formatLabel(tipo);
  const rangoFechas = formatRange(fechaInicio, fechaFin);

  // Calcular días si no se proporcionan
  const dias = diasSolicitados ?? Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const diasLabel = formatDias(dias);

  // Notificar a HR/Admin y Manager (NO al empleado)
  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
    manager: managerId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_aprobada',
    mensaje: `${empleadoNombre} ha registrado ${diasLabel} de ${tipoLabel.toLowerCase()} (${rangoFechas}) con aprobación automática`,
    metadata: {
      ausenciaId,
      empleadoId,
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      diasSolicitados: dias,
      autoAprobada: true,
      prioridad: 'normal',
      accionUrl: `/hr/horario/ausencias`,
      accionTexto: 'Ver ausencia',
    },
  }, options);
}

/**
 * Notifica a HR/Admin y Manager cuando se modifica una ausencia
 */
export async function crearNotificacionAusenciaModificada(
  prisma: PrismaClient,
  params: {
    ausenciaId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    tipo: string;
    fechaInicio: Date;
    fechaFin: Date;
    diasSolicitados: number;
    modificadoPor?: string | null;
  },
  options?: NotificacionEnvioOptions
) {
  const { ausenciaId, empresaId, empleadoId, empleadoNombre, tipo, fechaInicio, fechaFin, diasSolicitados, modificadoPor } = params;
  const tipoLabel = formatLabel(tipo);
  const rangoFechas = formatRange(fechaInicio, fechaFin);
  const diasLabel = formatDias(diasSolicitados);

  // Obtener manager del empleado
  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    select: { managerId: true },
  });

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
    manager: empleado?.managerId,
  });

  // Excluir al usuario que hizo la modificación si es HR/Manager
  const usuarioIdsFinal = modificadoPor 
    ? usuarioIds.filter(id => id !== modificadoPor)
    : usuarioIds;

  if (usuarioIdsFinal.length === 0) return;

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds: usuarioIdsFinal,
    tipo: 'ausencia_modificada',
    mensaje: `Se ha modificado la ausencia de ${empleadoNombre}: ${diasLabel} de ${tipoLabel.toLowerCase()} del ${rangoFechas}`,
    metadata: {
      ausenciaId,
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      diasSolicitados,
      empleadoId,
      empleadoNombre,
      prioridad: 'alta',
      accionUrl: '/hr/horario/ausencias',
      accionTexto: 'Revisar cambios',
    },
  }, options);
}

// ========================================
// FIRMAS DIGITALES
// ========================================

export async function crearNotificacionFirmaPendiente(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    empleadoId: string;
    firmaId: string;
    solicitudId: string;
    documentoId: string;
    documentoNombre: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, empleadoId, firmaId, solicitudId, documentoId, documentoNombre } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'firma_pendiente',
    mensaje: `Tienes pendiente firmar el documento "${documentoNombre}"`,
    metadata: {
      firmaId,
      solicitudId,
      documentoId,
      documentoNombre,
      prioridad: 'alta',
      icono: 'firma',
      accionTexto: 'Firmar documento',
      accionUrl: `/firma/firmar/${firmaId}`,
      url: `/firma/firmar/${firmaId}`,
      requiresSignature: true,
    },
  }, options);
}

export async function crearNotificacionFirmaCompletada(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    solicitudId: string;
    documentoId: string;
    documentoNombre: string;
    usuarioDestinoId?: string | null;
    pdfFirmadoS3Key?: string | null;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, solicitudId, documentoId, documentoNombre, usuarioDestinoId, pdfFirmadoS3Key } = params;

  let usuarioIds: string[] = [];

  if (usuarioDestinoId) {
    // El usuarioDestinoId puede ser un email o un userId
    // Intentar buscar el usuario primero por email, luego por id
    const usuario = await prisma.usuarios.findFirst({
      where: {
        empresaId,
        OR: [
          { email: usuarioDestinoId },
          { id: usuarioDestinoId },
        ],
        activo: true,
      },
      select: { id: true },
    });

    if (usuario) {
      usuarioIds = [usuario.id];
    } else {
      console.warn(`[crearNotificacionFirmaCompletada] Usuario no encontrado: ${usuarioDestinoId}`);
      // Fallback: notificar a todos los HR admins
      usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, { hrAdmin: true });
    }
  } else {
    usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, { hrAdmin: true });
  }

  if (!usuarioIds.length) {
    return;
  }

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'firma_completada',
    mensaje: `El documento "${documentoNombre}" ha sido firmado por todos los participantes`,
    metadata: {
      solicitudId,
      documentoId,
      documentoNombre,
      pdfFirmadoS3Key,
      icono: 'firma',
      prioridad: 'normal',
      accionTexto: 'Ver documento',
      accionUrl: '/hr/documentos',
      url: '/hr/documentos',
    },
  }, options);
}

// ========================================
// FICHAJES
// ========================================

export async function crearNotificacionFichajeAutocompletado(
  prisma: PrismaClient,
  params: {
    fichajeId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    fecha: Date;
    salidaSugerida: Date;
    razon: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { fichajeId, empresaId, empleadoId, fecha, salidaSugerida, razon } = params;

  // Solo notificar al empleado, NO a HR (para evitar spam)
  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'fichaje_autocompletado',
    mensaje: `Tu fichaje del ${formatFechaCorta(fecha)} se ha completado automáticamente con salida a las ${salidaSugerida.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. Motivo: ${razon}`,
    metadata: {
      fichajeId,
      fecha: fecha.toISOString(),
      salidaSugerida: salidaSugerida.toISOString(),
      razon,
      prioridad: 'normal',
      accionUrl: '/empleado/horario/fichajes',
      accionTexto: 'Ver fichaje',
    },
  }, options);
}

export async function crearNotificacionFichajeRequiereRevision(
  prisma: PrismaClient,
  params: {
    fichajeId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    fecha: Date;
    razon: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { fichajeId, empresaId, empleadoNombre, fecha, razon } = params;

  // Solo notificar a HR (casos que requieren atención)
  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'fichaje_requiere_revision',
    mensaje: `El fichaje de ${empleadoNombre} del ${formatFechaCorta(fecha)} requiere revisión. Motivo: ${razon}`,
    metadata: {
      fichajeId,
      fecha: fecha.toISOString(),
      razon,
      prioridad: 'alta',
      accionUrl: '/hr/horario/fichajes',
      accionTexto: 'Revisar ahora',
    },
  }, options);
}

export async function crearNotificacionFichajeResuelto(
  prisma: PrismaClient,
  params: {
    fichajeId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    fecha: Date;
  },
  options?: NotificacionEnvioOptions
) {
  const { fichajeId, empresaId, empleadoId, fecha } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'fichaje_resuelto',
    mensaje: `Tu fichaje del ${formatFechaCorta(fecha)} ha sido revisado y completado`,
    metadata: {
      fichajeId,
      fecha: fecha.toISOString(),
      prioridad: 'normal',
      accionUrl: '/empleado/horario/fichajes',
      accionTexto: 'Ver fichaje',
    },
  }, options);
}

export async function crearNotificacionFichajeModificado(
  prisma: PrismaClient,
  params: {
    fichajeId: string;
    empresaId: string;
    empleadoId: string;
    modificadoPorNombre: string;
    accion: 'creado' | 'editado' | 'eliminado';
    fechaFichaje: Date;
    detalles?: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { fichajeId, empresaId, empleadoId, modificadoPorNombre, accion, fechaFichaje, detalles } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  const accionTexto = {
    creado: 'creado un evento',
    editado: 'editado un evento',
    eliminado: 'eliminado un evento',
  }[accion];

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'fichaje_modificado',
    mensaje: `${modificadoPorNombre} ha ${accionTexto} en tu fichaje del ${formatFechaCorta(fechaFichaje)}${detalles ? `. Detalles: ${detalles}` : ''}`,
    metadata: {
      fichajeId,
      fecha: fechaFichaje.toISOString(),
      accion,
      prioridad: 'normal',
      accionUrl: '/empleado/horario/fichajes',
      accionTexto: 'Ver cambios',
    },
  }, options);
}

export async function crearNotificacionFichajeAprobado(
  prisma: PrismaClient,
  params: {
    fichajeId: string;
    empresaId: string;
    empleadoId: string;
    fecha: Date;
  },
  options?: NotificacionEnvioOptions
) {
  const { fichajeId, empresaId, empleadoId, fecha } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'fichaje_aprobado',
    mensaje: `Tu fichaje del ${formatFechaCorta(fecha)} ha sido aprobado y finalizado`,
    metadata: {
      fichajeId,
      fecha: fecha.toISOString(),
      prioridad: 'normal',
      accionUrl: '/empleado/horario/fichajes',
      accionTexto: 'Ver fichaje',
    },
  }, options);
}

export async function crearNotificacionFichajeRechazado(
  prisma: PrismaClient,
  params: {
    fichajeId: string;
    empresaId: string;
    empleadoId: string;
    fecha: Date;
    motivoRechazo?: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { fichajeId, empresaId, empleadoId, fecha, motivoRechazo } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'fichaje_rechazado',
    mensaje: `Tu fichaje del ${formatFechaCorta(fecha)} necesita ser corregido${motivoRechazo ? `. Motivo: ${motivoRechazo}` : ''}`,
    metadata: {
      fichajeId,
      fecha: fecha.toISOString(),
      ...(motivoRechazo && { motivoRechazo }),
      prioridad: 'alta',
      accionUrl: '/empleado/horario/fichajes',
      accionTexto: 'Corregir fichaje',
    },
  }, options);
}

// ========================================
// EQUIPOS Y GESTIÓN
// ========================================

export async function crearNotificacionCambioManager(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    nuevoManagerId: string;
    nuevoManagerNombre: string;
    anteriorManagerId?: string;
    anteriorManagerNombre?: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, empleadoId, empleadoNombre, nuevoManagerId, nuevoManagerNombre, anteriorManagerId, anteriorManagerNombre } = params;

  // Notificar a: empleado, nuevo manager, y anterior manager
  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
    manager: nuevoManagerId,
  });

  // Agregar anterior manager si existe
  if (anteriorManagerId) {
    const anteriorManager = await prisma.empleados.findUnique({
      where: { id: anteriorManagerId },
      select: { usuarioId: true },
    });
    if (anteriorManager?.usuarioId && !usuarioIds.includes(anteriorManager.usuarioId)) {
      usuarioIds.push(anteriorManager.usuarioId);
    }
  }

  // Notificación al empleado
  const empleadoUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  if (empleadoUsuarioIds.length > 0) {
    await crearNotificaciones(prisma, {
      empresaId,
      usuarioIds: empleadoUsuarioIds,
      tipo: 'cambio_manager',
      mensaje: `${nuevoManagerNombre} es ahora tu manager${anteriorManagerNombre ? ` (anteriormente ${anteriorManagerNombre})` : ''}`,
      metadata: {
        nuevoManagerId,
        nuevoManagerNombre,
        anteriorManagerId,
        anteriorManagerNombre,
        prioridad: 'alta',
      },
    }, options);
  }

  // Notificación al nuevo manager
  const nuevoManagerUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    manager: nuevoManagerId,
  });

  if (nuevoManagerUsuarioIds.length > 0) {
    await crearNotificaciones(prisma, {
      empresaId,
      usuarioIds: nuevoManagerUsuarioIds,
      tipo: 'nuevo_empleado_equipo',
      mensaje: `${empleadoNombre} ahora está bajo tu supervisión`,
      metadata: {
        empleadoId,
        empleadoNombre,
        prioridad: 'normal',
        accionUrl: '/manager/equipo',
        accionTexto: 'Ver equipo',
      },
    }, options);
  }
}

export async function crearNotificacionCambioPuesto(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    empleadoId: string;
    empleadoNombre?: string;
    puestoAnterior: string | null;
    puestoNuevo: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, empleadoId, empleadoNombre, puestoAnterior, puestoNuevo } = params;

  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    select: {
      usuarioId: true,
      managerId: true,
      nombre: true,
      apellidos: true,
    },
  });

  const nombreCompleto = empleadoNombre ?? `${empleado?.nombre ?? ''} ${empleado?.apellidos ?? ''}`.trim();

  // Notificar al empleado
  const empleadoUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  if (empleadoUsuarioIds.length > 0) {
    await crearNotificaciones(prisma, {
      empresaId,
      usuarioIds: empleadoUsuarioIds,
      tipo: 'cambio_puesto',
      mensaje: `Tu puesto ha cambiado a ${puestoNuevo.toLowerCase()}${puestoAnterior ? ` (antes: ${puestoAnterior.toLowerCase()})` : ''}`,
      metadata: {
        puestoAnterior,
        puestoNuevo,
        prioridad: 'normal',
      },
    }, options);
  }

  // Notificar a HR
  const hrUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  if (hrUsuarioIds.length > 0) {
    await crearNotificaciones(prisma, {
      empresaId,
      usuarioIds: hrUsuarioIds,
      tipo: 'cambio_puesto',
      mensaje: `${nombreCompleto || 'El empleado'} ahora ocupa el puesto de ${puestoNuevo.toLowerCase()}`,
      metadata: {
        empleadoId,
        empleadoNombre: nombreCompleto || undefined,
        puestoAnterior,
        puestoNuevo,
        prioridad: 'baja',
      },
    }, options);
  }

  // Notificar al manager actual si existe
  if (empleado?.managerId) {
    const managerUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
      manager: empleado.managerId,
    });

    if (managerUsuarioIds.length > 0) {
      await crearNotificaciones(prisma, {
        empresaId,
        usuarioIds: managerUsuarioIds,
        tipo: 'cambio_puesto',
        mensaje: `${nombreCompleto || 'Un miembro de tu equipo'} ahora ocupa el puesto de ${puestoNuevo.toLowerCase()}`,
        metadata: {
          empleadoId,
          empleadoNombre: nombreCompleto || undefined,
          puestoAnterior,
          puestoNuevo,
          prioridad: 'normal',
        },
      }, options);
    }
  }
}

export async function crearNotificacionJornadaAsignada(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    empleadoId: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, empleadoId } = params;

  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    select: {
      usuarioId: true,
      managerId: true,
      nombre: true,
      apellidos: true,
    },
  });

  const nombreCompleto = `${empleado?.nombre ?? ''} ${empleado?.apellidos ?? ''}`.trim();

  // Notificar al empleado
  const empleadoUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  if (empleadoUsuarioIds.length > 0) {
    await crearNotificaciones(prisma, {
      empresaId,
      usuarioIds: empleadoUsuarioIds,
      tipo: 'jornada_asignada',
      mensaje: `Se te ha asignado una nueva jornada`,
      metadata: {
        prioridad: 'normal',
      },
    }, options);
  }

  // Notificar a HR
  const hrUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  if (hrUsuarioIds.length > 0) {
    await crearNotificaciones(prisma, {
      empresaId,
      usuarioIds: hrUsuarioIds,
      tipo: 'jornada_asignada',
      mensaje: `${nombreCompleto || 'El empleado'} ahora tiene asignada una nueva jornada`,
      metadata: {
        empleadoId,
        empleadoNombre: nombreCompleto || undefined,
        prioridad: 'baja',
      },
    }, options);
  }

  // Notificar al manager actual si existe
  if (empleado?.managerId) {
    const managerUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
      manager: empleado.managerId,
    });

    if (managerUsuarioIds.length > 0) {
      await crearNotificaciones(prisma, {
        empresaId,
        usuarioIds: managerUsuarioIds,
        tipo: 'jornada_asignada',
        mensaje: `${nombreCompleto || 'Un miembro de tu equipo'} ahora tiene una nueva jornada asignada`,
        metadata: {
          empleadoId,
          empleadoNombre: nombreCompleto || undefined,
          prioridad: 'baja',
        },
      }, options);
    }
  }
}

// ========================================
// EMPLEADOS
// ========================================

export async function crearNotificacionEmpleadoCreado(
  prisma: PrismaClient,
  params: {
    empleadoId: string;
    empresaId: string;
    empleadoNombre: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empleadoId, empresaId, empleadoNombre } = params;

  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    select: {
      managerId: true,
    },
  });

  const hrUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  const managerUsuarioIds =
    empleado?.managerId
      ? await obtenerUsuariosANotificar(prisma, empresaId, {
          manager: empleado.managerId,
        })
      : [];

  const usuarioIds = Array.from(new Set([...hrUsuarioIds, ...managerUsuarioIds]));

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'empleado_creado',
    mensaje: `${empleadoNombre} se ha incorporado a la empresa`,
    metadata: {
      empleadoId,
      empleadoNombre,
      managerId: empleado?.managerId,
      prioridad: 'normal',
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
      accionTexto: 'Revisar ficha',
    },
  }, options);
}

export async function crearNotificacionAsignadoEquipo(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    equipoId: string;
    equipoNombre: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, empleadoId, empleadoNombre, equipoId, equipoNombre } = params;

  // Notificar al empleado
  const empleadoUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds: empleadoUsuarioIds,
    tipo: 'asignado_equipo',
    mensaje: `Has sido asignado al equipo ${equipoNombre}`,
    metadata: {
      equipoId,
      equipoNombre,
      prioridad: 'normal',
    },
  }, options);

  // Notificar al manager del equipo (si tiene)
  const equipo = await prisma.equipos.findUnique({
    where: { id: equipoId },
    select: { managerId: true },
  });

  if (equipo?.managerId) {
    const managerUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
      manager: equipo.managerId,
    });

    await crearNotificaciones(prisma, {
      empresaId,
      usuarioIds: managerUsuarioIds,
      tipo: 'nuevo_empleado_equipo',
      mensaje: `${empleadoNombre} se ha unido a tu equipo ${equipoNombre}`,
      metadata: {
        equipoId,
        equipoNombre,
        empleadoId,
        empleadoNombre,
        prioridad: 'normal',
        accionUrl: '/manager/equipo',
        accionTexto: 'Ver equipo',
      },
    }, options);
  }
}

// ========================================
// SOLICITUDES
// ========================================

export async function crearNotificacionSolicitudCreada(
  prisma: PrismaClient,
  params: {
    solicitudId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    tipo: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { solicitudId, empresaId, empleadoNombre, tipo } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  const tipoDescripcion = {
    cambio_datos: 'cambio de datos personales',
    fichaje_correccion: 'corrección de fichaje',
    ausencia_modificacion: 'modificación de ausencia',
    documento: 'documento',
  }[tipo] || tipo;

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'solicitud_creada',
    mensaje: `${empleadoNombre} ha enviado una solicitud de ${tipoDescripcion}`,
    metadata: {
      solicitudId,
      tipo,
      prioridad: 'alta',
      accionUrl: '/hr/solicitudes',
      accionTexto: 'Revisar solicitud',
    },
  }, options);
}

export async function crearNotificacionSolicitudAprobada(
  prisma: PrismaClient,
  params: {
    solicitudId: string;
    empresaId: string;
    empleadoId: string;
    tipo: string;
    aprobadoPor: 'ia' | 'manual';
  },
  options?: NotificacionEnvioOptions
) {
  const { solicitudId, empresaId, empleadoId, tipo, aprobadoPor } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  const tipoDescripcion = {
    cambio_datos: 'cambio de datos personales',
    fichaje_correccion: 'corrección de fichaje',
    ausencia_modificacion: 'modificación de ausencia',
    documento: 'documento',
  }[tipo] || tipo;

  const mensajeExtra = aprobadoPor === 'ia' ? ' automáticamente' : '';

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'solicitud_aprobada',
    mensaje: `Tu solicitud de ${tipoDescripcion} ha sido aprobada${mensajeExtra}`,
    metadata: {
      solicitudId,
      tipo,
      aprobadoPor,
      prioridad: 'normal',
      accionUrl: '/empleado/bandeja-entrada',
      accionTexto: 'Ver detalles',
    },
  }, options);
}

export async function crearNotificacionSolicitudRechazada(
  prisma: PrismaClient,
  params: {
    solicitudId: string;
    empresaId: string;
    empleadoId: string;
    tipo: string;
    motivoRechazo?: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { solicitudId, empresaId, empleadoId, tipo, motivoRechazo } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  const tipoDescripcion = {
    cambio_datos: 'cambio de datos personales',
    fichaje_correccion: 'corrección de fichaje',
    ausencia_modificacion: 'modificación de ausencia',
    documento: 'documento',
  }[tipo] || tipo;

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'solicitud_rechazada',
    mensaje: motivoRechazo
      ? `Tu solicitud de ${tipoDescripcion} no ha sido aprobada. Motivo: ${motivoRechazo}`
      : `Tu solicitud de ${tipoDescripcion} no ha sido aprobada. Contacta con RR.HH. para más detalles`,
    metadata: {
      solicitudId,
      tipo,
      ...(motivoRechazo && { motivoRechazo }),
      prioridad: 'normal',
      accionUrl: '/empleado/bandeja-entrada',
      accionTexto: 'Ver detalles',
    },
  }, options);
}

export async function crearNotificacionSolicitudRequiereRevision(
  prisma: PrismaClient,
  params: {
    solicitudId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    tipo: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { solicitudId, empresaId, empleadoNombre, tipo } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  const tipoDescripcion = {
    cambio_datos: 'cambio de datos personales',
    fichaje_correccion: 'corrección de fichaje',
    ausencia_modificacion: 'modificación de ausencia',
    documento: 'documento',
  }[tipo] || tipo;

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'solicitud_creada', // Reutilizamos el tipo pero con prioridad crítica
    mensaje: `${empleadoNombre} solicita ${tipoDescripcion} - la IA no pudo validar los datos y requiere revisión manual`,
    metadata: {
      solicitudId,
      tipo,
      requiereRevision: true,
      prioridad: 'critica',
      accionUrl: '/hr/bandeja-entrada',
      accionTexto: 'Revisar ahora',
    },
  }, options);
}

// ========================================
// PAYROLL / NÓMINAS
// ========================================

export async function crearNotificacionNominaDisponible(
  prisma: PrismaClient,
  params: {
    nominaId: string;
    empresaId: string;
    empleadoId: string;
    mes: number;
    año: number;
  },
  options?: NotificacionEnvioOptions
) {
  const { nominaId, empresaId, empleadoId, mes, año } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'nomina_disponible',
    mensaje: `Tu nómina de ${meses[mes - 1]} ${año} está disponible`,
    metadata: {
      nominaId,
      mes,
      año,
      prioridad: 'normal',
      accionUrl: '/empleado/nominas',
      accionTexto: 'Ver nómina',
    },
  }, options);
}

/**
 * @deprecated Esta función no se utiliza. Los errores de nómina se gestionan
 * directamente como alertas cuando se crea el evento de nómina, sin necesidad
 * de notificaciones adicionales.
 *
 * Mantener comentada para referencia pero no usar en nuevas implementaciones.
 */
export async function crearNotificacionNominaError(
  prisma: PrismaClient,
  params: {
    nominaId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    error: string;
  },
  options?: NotificacionEnvioOptions
) {
  // Función deprecada - no usar
  console.warn('[DEPRECATED] crearNotificacionNominaError no debería usarse. Los errores de nómina se gestionan como alertas directas.');

  const { nominaId, empresaId, empleadoNombre, error } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'nomina_error',
    mensaje: `Error al procesar la nómina de ${empleadoNombre}: ${error}`,
    metadata: {
      nominaId,
      error,
      prioridad: 'critica',
      accionUrl: '/hr/nominas',
      accionTexto: 'Revisar',
    },
  }, options);
}

export async function crearNotificacionNominaValidada(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    eventoNominaId: string;
    validadorNombre: string;
    complementosCount: number;
    accion: 'validar' | 'rechazar';
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, eventoNominaId, validadorNombre, complementosCount, accion } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  if (!usuarioIds.length) {
    return;
  }

  const complementoTexto = complementosCount === 1 ? 'complemento' : 'complementos';
  const mensaje =
    accion === 'validar'
      ? `${validadorNombre} ha validado ${complementosCount} ${complementoTexto} en el evento de nómina`
      : `${validadorNombre} ha rechazado ${complementosCount} ${complementoTexto} en el evento de nómina`;

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'nomina_validada',
    mensaje,
    metadata: {
      eventoNominaId,
      complementosCount,
      accion,
      prioridad: 'normal',
      accionUrl: '/hr/payroll/eventos',
      accionTexto: 'Revisar evento',
    },
  }, options);
}

// ========================================
// DOCUMENTOS
// ========================================

export async function crearNotificacionDocumentoSolicitado(
  prisma: PrismaClient,
  params: {
    documentoId: string;
    empresaId: string;
    empleadoId: string;
    tipoDocumento: string;
    fechaLimite?: Date;
  },
  options?: NotificacionEnvioOptions
) {
  const { documentoId, empresaId, empleadoId, tipoDocumento, fechaLimite } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  const mensajeLimite = fechaLimite
    ? `. Fecha límite: ${formatFechaCorta(fechaLimite)}`
    : '';

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'documento_solicitado',
    mensaje: `Se te ha solicitado el documento ${tipoDocumento}${mensajeLimite}`,
    metadata: {
      documentoId,
      tipoDocumento,
      ...(fechaLimite && { fechaLimite: fechaLimite.toISOString() }),
      prioridad: 'alta',
      accionUrl: '/empleado/mi-espacio/documentos',
      accionTexto: 'Subir documento',
    },
  }, options);
}

export async function crearNotificacionDocumentoSubido(
  prisma: PrismaClient,
  params: {
    documentoId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    tipoDocumento: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { documentoId, empresaId, empleadoNombre, tipoDocumento } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'documento_subido',
    mensaje: `${empleadoNombre} ha subido el documento ${tipoDocumento} para revisión`,
    metadata: {
      documentoId,
      tipoDocumento,
      prioridad: 'normal',
      accionUrl: '/hr/documentos',
      accionTexto: 'Revisar documento',
    },
  }, options);
}

export async function crearNotificacionDocumentoRechazado(
  prisma: PrismaClient,
  params: {
    documentoId: string;
    empresaId: string;
    empleadoId: string;
    tipoDocumento: string;
    motivo: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { documentoId, empresaId, empleadoId, tipoDocumento, motivo } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'documento_rechazado',
    mensaje: `Tu documento ${tipoDocumento} no ha sido aceptado. Motivo: ${motivo}`,
    metadata: {
      documentoId,
      tipoDocumento,
      motivo,
      prioridad: 'alta',
      accionUrl: '/empleado/mi-espacio/documentos',
      accionTexto: 'Volver a subir',
    },
  }, options);
}

export async function crearNotificacionDocumentoEliminado(
  prisma: PrismaClient,
  params: {
    documentoNombre: string;
    tipoDocumento: string;
    empresaId: string;
    empleadoId: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { documentoNombre, tipoDocumento, empresaId, empleadoId } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'documento_eliminado',
    mensaje: `El documento "${documentoNombre}" (${tipoDocumento}) ha sido eliminado de tu expediente por el departamento de RR.HH.`,
    metadata: {
      documentoNombre,
      tipoDocumento,
      prioridad: 'normal',
      accionUrl: '/empleado/mi-espacio/documentos',
      accionTexto: 'Ver documentos',
    },
  }, options);
}

/**
 * Notifica al empleado cuando se le ha generado un documento automáticamente
 */
export async function crearNotificacionDocumentoGeneradoEmpleado(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    empleadoId: string;
    documentoId: string;
    documentoNombre: string;
    documentoGeneradoId: string;
    plantillaId?: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, empleadoId, documentoId, documentoNombre, documentoGeneradoId, plantillaId } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'documento_generado',
    mensaje: `Se ha generado el documento "${documentoNombre}"`,
    metadata: {
      documentoId,
      documentoGeneradoId,
      plantillaId,
      prioridad: 'normal',
      accionUrl: '/empleado/mi-espacio/documentos',
      accionTexto: 'Ver documento',
    },
  }, options);
}

/**
 * Notifica al empleado que tiene un documento pendiente de completar
 * (documento con campos que el empleado debe rellenar)
 */
export async function crearNotificacionDocumentoPendienteRellenar(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    empleadoId: string;
    documentoGeneradoId: string;
    documentoId: string;
    documentoNombre: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, empleadoId, documentoGeneradoId, documentoId, documentoNombre } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'documento_pendiente_rellenar',
    mensaje: `Tienes pendiente completar los campos del documento "${documentoNombre}"`,
    metadata: {
      documentoId,
      documentoNombre,
      documentoGeneradoId,
      prioridad: 'alta',
      accionUrl: `/empleado/mi-espacio/documentos?documento=${documentoGeneradoId}`,
      accionTexto: 'Completar documento',
      requiresModal: true,
    },
  }, options);
}

/**
 * Notifica cuando se completa la generación masiva de documentos (lote)
 */
export async function crearNotificacionDocumentoGeneracionLote(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    usuarioId: string;
    total: number;
    exitosos: number;
    fallidos: number;
    jobId: string;
    mensajePersonalizado?: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, usuarioId, total, exitosos, fallidos, jobId, mensajePersonalizado } = params;

  // Determinar tipo de notificación según resultado
  let mensaje: string;
  let tipo: TipoNotificacion;
  let prioridad: PrioridadNotificacion;

  if (fallidos === 0) {
    // Todo exitoso
    tipo = 'documento_generado';
    mensaje = `Se han generado ${exitosos} documento${exitosos !== 1 ? 's' : ''} correctamente`;
    prioridad = 'normal';
  } else if (exitosos === 0) {
    // Todo falló
    tipo = 'documento_generado';
    mensaje = mensajePersonalizado || `No se pudo generar ninguno de los ${total} documentos solicitados`;
    prioridad = 'alta';
  } else {
    // Parcialmente exitoso
    tipo = 'documento_generado';
    mensaje = `Se generaron ${exitosos} de ${total} documentos (${fallidos} fallaron)`;
    prioridad = 'alta';
  }

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds: [usuarioId],
    tipo,
    mensaje,
    metadata: {
      jobId,
      total,
      exitosos,
      fallidos,
      estado: fallidos === 0 ? 'completado' : exitosos === 0 ? 'fallido' : 'parcial',
      prioridad,
      accionUrl: '/hr/organizacion/personas?panel=documentos',
      accionTexto: 'Ver documentos',
    },
  }, options);
}

// ========================================
// CAMPAÑAS DE VACACIONES
// ========================================

export async function crearNotificacionCampanaCreada(
  prisma: PrismaClient,
  params: {
    campanaId: string;
    empresaId: string;
    empleadosIds: string[];
    fechaInicio: Date;
    fechaFin: Date;
    titulo: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { campanaId, empresaId, empleadosIds, fechaInicio, fechaFin, titulo } = params;

  // Notificar a cada empleado individualmente
  for (const empleadoId of empleadosIds) {
    const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
      empleado: empleadoId,
    });

    if (usuarioIds.length > 0) {
      await crearNotificaciones(prisma, {
        empresaId,
        usuarioIds,
        tipo: 'campana_vacaciones_creada',
        mensaje: `Campaña "${titulo}": planifica tus vacaciones del ${formatFechaCorta(fechaInicio)} al ${formatFechaCorta(fechaFin)} e indica tus preferencias para coordinar con tu equipo`,
        metadata: {
          campanaId,
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString(),
          prioridad: 'alta',
          accionUrl: `/empleado/vacaciones/campanas/${campanaId}`,
          accionTexto: 'Ver campaña',
        },
      }, options);
    }
  }
}

export async function crearNotificacionCampanaCompletada(
  prisma: PrismaClient,
  params: {
    campanaId: string;
    empresaId: string;
    titulo: string;
    totalEmpleados: number;
  },
  options?: NotificacionEnvioOptions
) {
  const { campanaId, empresaId, titulo, totalEmpleados } = params;

  // Notificar a HR Admin y Managers
  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'campana_vacaciones_completada',
    mensaje: `La campaña "${titulo}" está lista para cuadrar - todos los empleados (${totalEmpleados}) han enviado sus preferencias`,
    metadata: {
      campanaId,
      totalEmpleados,
      prioridad: 'alta',
      accionUrl: `/hr/vacaciones/campanas/${campanaId}`,
      accionTexto: 'Cuadrar vacaciones',
    },
  }, options);
}

/**
 * Notifica a empleados cuando su campaña de vacaciones ha sido cuadrada
 * y ya pueden ver las fechas asignadas
 */
export async function crearNotificacionCampanaCuadrada(
  prisma: PrismaClient,
  params: {
    campanaId: string;
    empresaId: string;
    empleadosIds: string[];
    titulo: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { campanaId, empresaId, empleadosIds, titulo } = params;

  // Obtener IDs de usuarios de los empleados
  const empleados = await prisma.empleados.findMany({
    where: {
      id: { in: empleadosIds },
    },
    select: {
      usuarioId: true,
    },
  });

  const usuarioIds = empleados.map(e => e.usuarioId);

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'campana_vacaciones_cuadrada',
    mensaje: `Las vacaciones de la campaña "${titulo}" han sido cuadradas - ya puedes ver tus fechas asignadas`,
    metadata: {
      campanaId,
      prioridad: 'alta',
      accionUrl: `/empleado/horario/ausencias?campana=${campanaId}`,
      accionTexto: 'Ver vacaciones',
      requiresModal: true,
    },
  }, options);
}

// ========================================
// ONBOARDING
// ========================================

export async function crearNotificacionOnboardingCompletado(
  prisma: PrismaClient,
  params: {
    empleadoId: string;
    empresaId: string;
    empleadoNombre: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empleadoId, empresaId, empleadoNombre } = params;

  // Obtener manager del empleado
  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    select: { managerId: true },
  });

  // Notificar a HR Admin y Manager
  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
    manager: empleado?.managerId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'onboarding_completado',
    mensaje: `${empleadoNombre} ha completado su proceso de onboarding y está listo para comenzar`,
    metadata: {
      empleadoId,
      empleadoNombre,
      prioridad: 'normal',
      accionUrl: `/hr/empleados/${empleadoId}`,
      accionTexto: 'Ver empleado',
    },
  }, options);
}

// ========================================
// NÓMINAS - COMPLEMENTOS
// ========================================

export async function crearNotificacionComplementosPendientes(
  prisma: PrismaClient,
  params: {
    nominaId: string;
    empresaId: string;
    managerId: string;
    empleadosCount: number;
    mes: number;
    año: number;
  },
  options?: NotificacionEnvioOptions
) {
  const { nominaId, empresaId, managerId, empleadosCount, mes, año } = params;

  if (empleadosCount === 0) {
    return;
  }

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    manager: managerId,
  });

  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'complementos_pendientes',
    mensaje: `Tienes ${empleadosCount} ${empleadosCount === 1 ? 'empleado' : 'empleados'} en tu equipo que ${empleadosCount === 1 ? 'requiere' : 'requieren'} complementos de nómina para ${meses[mes - 1]} ${año}`,
    metadata: {
      nominaId,
      mes,
      año,
      empleadosCount,
      prioridad: 'alta',
      accionUrl: '/manager/bandeja-entrada?tab=solicitudes',
      accionTexto: 'Completar complementos',
      requiresModal: true, // Flag especial para abrir modal
    },
  }, options);
}

export async function crearNotificacionComplementoAsignado(
  prisma: PrismaClient,
  params: {
    empleadoId: string;
    empleadoNombre: string;
    empresaId: string;
    complementoNombre: string;
    importe?: number;
  },
  options?: NotificacionEnvioOptions
) {
  const { empleadoId, empleadoNombre, empresaId, complementoNombre, importe } = params;

  // Notificar al empleado
  const empleadoUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  if (empleadoUsuarioIds.length > 0) {
    await crearNotificaciones(prisma, {
      empresaId,
      usuarioIds: empleadoUsuarioIds,
      tipo: 'complemento_asignado',
      mensaje: `Se te ha asignado el complemento "${complementoNombre}"${importe ? ` de ${importe.toFixed(2)}€` : ''} que se aplicará en tus próximas nóminas`,
      metadata: {
        complementoNombre,
        ...(importe && { importe }),
        prioridad: 'normal',
        accionUrl: '/empleado/mi-espacio',
        accionTexto: 'Ver detalles',
      },
    }, options);
  }

  // Notificar al manager del empleado
  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    select: { managerId: true },
  });

  if (empleado?.managerId) {
    const managerUsuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
      manager: empleado.managerId,
    });

    if (managerUsuarioIds.length > 0) {
      await crearNotificaciones(prisma, {
        empresaId,
        usuarioIds: managerUsuarioIds,
        tipo: 'complemento_asignado',
        mensaje: `Se ha asignado el complemento "${complementoNombre}" a ${empleadoNombre}${importe ? ` por ${importe.toFixed(2)}€` : ''}`,
        metadata: {
          empleadoId,
          empleadoNombre,
          complementoNombre,
          ...(importe && { importe }),
          prioridad: 'normal',
        },
      }, options);
    }
  }
}

// ========================================
// DENUNCIAS
// ========================================

/**
 * Notifica a HR Admins cuando se recibe una nueva denuncia
 */
export async function crearNotificacionDenunciaRecibida(
  prisma: PrismaClient,
  params: {
    denunciaId: string;
    empresaId: string;
    esAnonima: boolean;
    descripcionBreve: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { denunciaId, empresaId, esAnonima, descripcionBreve } = params;

  // Notificar a todos los HR Admins
  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'denuncia_recibida',
    mensaje: `Se ha recibido una denuncia ${esAnonima ? 'anónima' : ''} en el canal de denuncias: ${descripcionBreve.substring(0, 100)}${descripcionBreve.length > 100 ? '...' : ''}`,
    metadata: {
      denunciaId,
      esAnonima,
      prioridad: 'critica',
      accionUrl: `/hr/organizacion/equipos?panel=denuncias&denunciaId=${denunciaId}`,
      accionTexto: 'Revisar denuncia',
    },
  }, options);
}

/**
 * Notifica al denunciante cuando su denuncia ha sido actualizada (solo si NO es anónima)
 */
export async function crearNotificacionDenunciaActualizada(
  prisma: PrismaClient,
  params: {
    denunciaId: string;
    empresaId: string;
    empleadoId: string; // Denunciante
    nuevoEstado: string;
    mensaje: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { denunciaId, empresaId, empleadoId, nuevoEstado, mensaje } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'denuncia_actualizada',
    mensaje,
    metadata: {
      denunciaId,
      nuevoEstado,
      prioridad: 'alta',
      accionUrl: `/empleado/mi-perfil?modal=denuncias`,
      accionTexto: 'Ver denuncia',
    },
  }, options);
}
