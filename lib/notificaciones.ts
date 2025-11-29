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
    const hrAdmins = await prisma.usuario.findMany({
      where: { empresaId, rol: UsuarioRol.hr_admin, activo: true },
      select: { id: true },
    });
    usuarioIds.push(...hrAdmins.map(u => u.id));
  }

  // Manager
  if (roles.manager) {
    const manager = await prisma.empleado.findUnique({
      where: { id: roles.manager, activo: true },
      select: { usuarioId: true, usuario: { select: { activo: true } } },
    });
    if (manager?.usuarioId && manager.usuario.activo && !usuarioIds.includes(manager.usuarioId)) {
      usuarioIds.push(manager.usuarioId);
    }
  }

  // Empleado
  if (roles.empleado) {
    const empleado = await prisma.empleado.findUnique({
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
    titulo: string;
    mensaje: string;
    metadata: NotificacionMetadata;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, usuarioIds, tipo, titulo, mensaje, metadata } = params;

  const destinatarios = filtrarDestinatarios(usuarioIds, options);

  if (destinatarios.length === 0) return;

  await prisma.notificacion.createMany({
    data: destinatarios.map(usuarioId => ({
      empresaId,
      usuarioId,
      tipo,
      titulo,
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

const formatRange = (inicio: Date, fin: Date) =>
  `${inicio.toLocaleDateString('es-ES')} al ${fin.toLocaleDateString('es-ES')}`;

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
  const empleado = await prisma.empleado.findUnique({
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
    titulo: `Nueva solicitud: ${tipoLabel}`,
    mensaje: `${empleadoNombre} solicita ${diasLabel} de ${tipoLabel} del ${rangoFechas}.`,
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
  },
  options?: NotificacionEnvioOptions
) {
  const { ausenciaId, empresaId, empleadoId, tipo, fechaInicio, fechaFin } = params;
  const tipoLabel = formatLabel(tipo);
  const rangoFechas = formatRange(fechaInicio, fechaFin);

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_aprobada',
    titulo: `${tipoLabel} aprobada`,
    mensaje: `Tu ausencia del ${rangoFechas} ha sido aprobada.`,
    metadata: {
      ausenciaId,
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
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
    motivoRechazo?: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { ausenciaId, empresaId, empleadoId, tipo, fechaInicio, fechaFin, motivoRechazo } = params;
  const tipoLabel = formatLabel(tipo);
  const rangoFechas = formatRange(fechaInicio, fechaFin);

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_rechazada',
    titulo: `${tipoLabel} rechazada`,
    mensaje: `Tu solicitud del ${rangoFechas} no ha sido aprobada${motivoRechazo ? `. Motivo: ${motivoRechazo}` : '.'}`,
    metadata: {
      ausenciaId,
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
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
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, empleadoId, empleadoNombre, tipo, fechaInicio, fechaFin } = params;
  const tipoLabel = formatLabel(tipo);
  const rangoFechas = formatRange(fechaInicio, fechaFin);

  const empleado = await prisma.empleado.findUnique({
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
    titulo: `${tipoLabel} cancelada`,
    mensaje: `${empleadoNombre} ha cancelado su ${tipoLabel.toLocaleLowerCase('es-ES')} del ${rangoFechas}.`,
    metadata: {
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
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
  },
  options?: NotificacionEnvioOptions
) {
  const { ausenciaId, empresaId, empleadoId, empleadoNombre, managerId, tipo, fechaInicio, fechaFin } = params;
  const tipoLabel = formatLabel(tipo);
  const rangoFechas = formatRange(fechaInicio, fechaFin);

  // Notificar a HR/Admin y Manager (NO al empleado)
  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
    manager: managerId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_aprobada',
    titulo: `${empleadoNombre} registró ${tipoLabel}`,
    mensaje: `Ausencia registrada para ${empleadoNombre} del ${rangoFechas}.`,
    metadata: {
      ausenciaId,
      empleadoId,
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      autoAprobada: true,
      prioridad: 'normal',
      accionUrl: `/hr/horario/ausencias`,
      accionTexto: 'Ver ausencia',
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
    titulo: 'Documento pendiente de firma',
    mensaje: `Tienes un documento pendiente: ${documentoNombre}.`,
    metadata: {
      firmaId,
      solicitudId,
      documentoId,
      documentoNombre,
      prioridad: 'alta',
      icono: 'firma',
      accionTexto: 'Firmar documento',
      accionUrl: '/empleado/mi-espacio/documentos?tab=firmas',
      url: '/empleado/mi-espacio/documentos?tab=firmas',
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

  const usuarioIds = usuarioDestinoId ? [usuarioDestinoId] : await obtenerUsuariosANotificar(prisma, empresaId, { hrAdmin: true });

  if (!usuarioIds.length) {
    return;
  }

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'firma_completada',
    titulo: 'Documento firmado',
    mensaje: `El documento ${documentoNombre} ya fue firmado por todos los participantes.`,
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
    titulo: 'Fichaje completado',
    mensaje: `Tu fichaje del ${fecha.toLocaleDateString('es-ES')} se completó automáticamente con salida a las ${salidaSugerida.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. Motivo: ${razon}.`,
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
    titulo: `Fichaje pendiente de revisión`,
    mensaje: `${empleadoNombre} - ${fecha.toLocaleDateString('es-ES')}. Motivo: ${razon}.`,
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
    titulo: 'Fichaje completado',
    mensaje: `Tu fichaje del ${fecha.toLocaleDateString('es-ES')} ha sido revisado y completado.`,
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
    titulo: 'Fichaje modificado',
    mensaje: `${modificadoPorNombre} ha ${accionTexto} en tu fichaje del ${new Intl.DateTimeFormat('es-ES').format(fechaFichaje)}.${detalles ? ` Detalles: ${detalles}` : ''}`,
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
    titulo: 'Fichaje aprobado',
    mensaje: `Tu fichaje del ${fecha.toLocaleDateString('es-ES')} ha sido aprobado y finalizado.`,
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
    titulo: 'Fichaje requiere corrección',
    mensaje: `Tu fichaje del ${fecha.toLocaleDateString('es-ES')} necesita ser corregido${motivoRechazo ? `. Motivo: ${motivoRechazo}` : '.'}`,
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
    const anteriorManager = await prisma.empleado.findUnique({
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
      titulo: 'Nuevo manager asignado',
      mensaje: `${nuevoManagerNombre} es ahora tu manager${anteriorManagerNombre ? ` (anteriormente ${anteriorManagerNombre})` : ''}.`,
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
      titulo: 'Nuevo miembro en tu equipo',
      mensaje: `${empleadoNombre} ahora está bajo tu supervisión.`,
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

  const empleado = await prisma.empleado.findUnique({
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
      titulo: 'Actualización de puesto',
      mensaje: `Tu puesto ha cambiado a ${puestoNuevo}.${puestoAnterior ? ` Antes: ${puestoAnterior}.` : ''}`,
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
      titulo: 'Cambio de puesto registrado',
      mensaje: `${nombreCompleto || 'El empleado'} ahora ocupa el puesto ${puestoNuevo}.`,
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
        titulo: 'Cambio de puesto en tu equipo',
        mensaje: `${nombreCompleto || 'Un miembro de tu equipo'} ahora ocupa el puesto ${puestoNuevo}.`,
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
    jornadaNombre: string;
  },
  options?: NotificacionEnvioOptions
) {
  const { empresaId, empleadoId, jornadaNombre } = params;

  const empleado = await prisma.empleado.findUnique({
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
      titulo: 'Nueva jornada asignada',
      mensaje: `Se te ha asignado la jornada: ${jornadaNombre}.`,
      metadata: {
        jornadaNombre,
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
      titulo: 'Jornada actualizada',
      mensaje: `${nombreCompleto || 'El empleado'} ahora tiene asignada la jornada ${jornadaNombre}.`,
      metadata: {
        empleadoId,
        empleadoNombre: nombreCompleto || undefined,
        jornadaNombre,
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
        titulo: 'Actualización de jornada en tu equipo',
        mensaje: `${nombreCompleto || 'Un miembro de tu equipo'} ahora tiene la jornada ${jornadaNombre}.`,
        metadata: {
          empleadoId,
          empleadoNombre: nombreCompleto || undefined,
          jornadaNombre,
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

  const empleado = await prisma.empleado.findUnique({
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
    titulo: 'Nuevo empleado registrado',
    mensaje: `${empleadoNombre} se ha incorporado a la empresa.`,
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
    titulo: 'Asignado a equipo',
    mensaje: `Has sido asignado al equipo: ${equipoNombre}.`,
    metadata: {
      equipoId,
      equipoNombre,
      prioridad: 'normal',
    },
  }, options);

  // Notificar al manager del equipo (si tiene)
  const equipo = await prisma.equipo.findUnique({
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
      titulo: 'Nuevo miembro en tu equipo',
      mensaje: `${empleadoNombre} se ha unido a tu equipo: ${equipoNombre}.`,
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
    titulo: `Nueva solicitud de ${tipoDescripcion}`,
    mensaje: `${empleadoNombre} ha enviado una solicitud de ${tipoDescripcion}.`,
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
    titulo: `Tu solicitud de ${tipoDescripcion} fue aprobada`,
    mensaje: `Los cambios solicitados han sido aceptados${mensajeExtra}.`,
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
    titulo: `Tu solicitud de ${tipoDescripcion} fue rechazada`,
    mensaje: motivoRechazo
      ? `Motivo proporcionado: ${motivoRechazo}.`
      : 'No se ha indicado un motivo. Contacta con RR.HH. para más detalles.',
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
    titulo: `${empleadoNombre} solicita ${tipoDescripcion} - revisión manual necesaria`,
    mensaje: 'La IA no pudo validar los datos. Revisa la solicitud manualmente.',
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

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'nomina_disponible',
    titulo: 'Nómina disponible',
    mensaje: `Tu nómina de ${meses[mes - 1]} ${año} está disponible.`,
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
    titulo: 'Error en nómina',
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

  const titulo =
    accion === 'validar'
      ? 'Complementos validados'
      : 'Complementos rechazados';
  const mensaje =
    accion === 'validar'
      ? `${validadorNombre} ha validado ${complementosCount} complemento(s) en el evento de nómina.`
      : `${validadorNombre} ha rechazado ${complementosCount} complemento(s) en el evento de nómina.`;

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'nomina_validada',
    titulo,
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
    ? ` Fecha límite: ${fechaLimite.toLocaleDateString('es-ES')}.`
    : '';

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'documento_solicitado',
    titulo: `Documento requerido: ${tipoDocumento}`,
    mensaje: `Por favor, sube el documento solicitado.${mensajeLimite}`,
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
    titulo: `Nuevo documento: ${tipoDocumento}`,
    mensaje: `${empleadoNombre} ha subido un documento para revisión.`,
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
    titulo: `${tipoDocumento} rechazado`,
    mensaje: `Tu documento no ha sido aceptado. Motivo: ${motivo}`,
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
    titulo: `Documento eliminado: ${tipoDocumento}`,
    mensaje: `El documento "${documentoNombre}" ha sido eliminado de tu expediente por el departamento de RR.HH.`,
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
    titulo: 'Documento disponible',
    mensaje: `Se ha generado el documento "${documentoNombre}".`,
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
    titulo: 'Documento pendiente de completar',
    mensaje: `Tienes que completar los campos del documento "${documentoNombre}".`,
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
  let titulo: string;
  let mensaje: string;
  let tipo: TipoNotificacion;
  let prioridad: PrioridadNotificacion;

  if (fallidos === 0) {
    // Todo exitoso
    tipo = 'documento_generado';
    titulo = 'Documentos generados exitosamente';
    mensaje = `Se han generado ${exitosos} documento${exitosos !== 1 ? 's' : ''} correctamente.`;
    prioridad = 'normal';
  } else if (exitosos === 0) {
    // Todo falló
    tipo = 'documento_generado';
    titulo = 'Error en generación de documentos';
    mensaje = mensajePersonalizado || `No se pudo generar ninguno de los ${total} documentos solicitados.`;
    prioridad = 'alta';
  } else {
    // Parcialmente exitoso
    tipo = 'documento_generado';
    titulo = 'Documentos generados parcialmente';
    mensaje = `Se generaron ${exitosos} de ${total} documentos. ${fallidos} fallaron.`;
    prioridad = 'alta';
  }

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds: [usuarioId],
    tipo,
    titulo,
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
        titulo: `Campaña de vacaciones: ${titulo}`,
        mensaje: `Planifica tus vacaciones del ${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}. Indica tus preferencias para coordinar con tu equipo.`,
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
    titulo: `Campaña "${titulo}" lista para cuadrar`,
    mensaje: `Todos los empleados (${totalEmpleados}) han enviado sus preferencias. Procede a asignar las fechas finales.`,
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
  const empleados = await prisma.empleado.findMany({
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
    titulo: 'Vacaciones asignadas',
    mensaje: `Las vacaciones de la campaña "${titulo}" han sido cuadradas. Ya puedes ver tus fechas asignadas.`,
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
  const empleado = await prisma.empleado.findUnique({
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
    titulo: 'Onboarding completado',
    mensaje: `${empleadoNombre} ha completado su proceso de onboarding y está listo para comenzar.`,
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

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'complementos_pendientes',
    titulo: 'Complementos de nómina pendientes',
    mensaje: `Tienes ${empleadosCount} empleado(s) en tu equipo que requieren complementos de nómina para ${meses[mes - 1]} ${año}. Por favor, completa la información.`,
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
      titulo: `Nuevo complemento: ${complementoNombre}`,
      mensaje: `Se te ha asignado el complemento "${complementoNombre}"${importe ? ` por ${importe.toFixed(2)}€` : ''}. Se aplicará en tus próximas nóminas.`,
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
  const empleado = await prisma.empleado.findUnique({
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
        titulo: `Complemento asignado a ${empleadoNombre}`,
        mensaje: `Se ha asignado el complemento "${complementoNombre}" a ${empleadoNombre}${importe ? ` por ${importe.toFixed(2)}€` : ''}.`,
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
    titulo: 'Nueva denuncia recibida',
    mensaje: `Se ha recibido una denuncia ${esAnonima ? 'anónima' : ''} en el canal de denuncias. ${descripcionBreve.substring(0, 100)}${descripcionBreve.length > 100 ? '...' : ''}`,
    metadata: {
      denunciaId,
      esAnonima,
      prioridad: 'critica',
      accionUrl: `/hr/organizacion/personas?panel=denuncias&denunciaId=${denunciaId}`,
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
    titulo: 'Actualización en tu denuncia',
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
