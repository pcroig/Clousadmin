// ========================================
// Sistema Centralizado de Notificaciones
// ========================================
// Servicio eficiente y escalable para gestionar notificaciones

import { PrismaClient } from '@prisma/client';

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
  // Empleados
  | 'empleado_creado'
  // Fichajes
  | 'fichaje_autocompletado'
  | 'fichaje_requiere_revision'
  | 'fichaje_resuelto'
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
  // Documentos
  | 'documento_solicitado'
  | 'documento_subido'
  | 'documento_rechazado'
  // Denuncias
  | 'denuncia_recibida'
  | 'denuncia_actualizada';

export type PrioridadNotificacion = 'baja' | 'normal' | 'alta' | 'critica';

export interface NotificacionMetadata {
  prioridad?: PrioridadNotificacion;
  accionUrl?: string;
  accionTexto?: string;
  [key: string]: any;
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
      where: { id: roles.manager },
      select: { usuarioId: true },
    });
    if (manager?.usuarioId && !usuarioIds.includes(manager.usuarioId)) {
      usuarioIds.push(manager.usuarioId);
    }
  }

  // Empleado
  if (roles.empleado) {
    const empleado = await prisma.empleado.findUnique({
      where: { id: roles.empleado },
      select: { usuarioId: true },
    });
    if (empleado?.usuarioId && !usuarioIds.includes(empleado.usuarioId)) {
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
  }
) {
  const { empresaId, usuarioIds, tipo, titulo, mensaje, metadata } = params;

  if (usuarioIds.length === 0) return;

  await prisma.notificacion.createMany({
    data: usuarioIds.map(usuarioId => ({
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
  }
) {
  const { ausenciaId, empresaId, empleadoId, empleadoNombre, tipo, fechaInicio, fechaFin, diasSolicitados } = params;

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
    titulo: `${empleadoNombre} solicita ${formatDias(diasSolicitados)} de ${formatLabel(tipo)}`,
    mensaje: `${empleadoNombre} ha solicitado ${formatDias(diasSolicitados)} de ${formatLabel(tipo)} (${formatRange(fechaInicio, fechaFin)}).`,
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
  });
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
  }
) {
  const { ausenciaId, empresaId, empleadoId, tipo, fechaInicio, fechaFin } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_aprobada',
    titulo: `${formatLabel(tipo)} aprobada`,
    mensaje: `Tu solicitud de ${formatLabel(tipo)} (${formatRange(fechaInicio, fechaFin)}) ha sido aprobada.`,
    metadata: {
      ausenciaId,
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      prioridad: 'normal',
      accionUrl: '/empleado/horario/ausencias',
      accionTexto: 'Ver ausencia',
    },
  });
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
  }
) {
  const { ausenciaId, empresaId, empleadoId, tipo, fechaInicio, fechaFin, motivoRechazo } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_rechazada',
    titulo: `${formatLabel(tipo)} rechazada`,
    mensaje: `Tu solicitud de ${formatLabel(tipo)} (${formatRange(fechaInicio, fechaFin)}) ha sido rechazada${motivoRechazo ? `: ${motivoRechazo}` : '.'}`,
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
  });
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
  }
) {
  const { empresaId, empleadoId, empleadoNombre, tipo, fechaInicio, fechaFin } = params;

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
    titulo: `${empleadoNombre} canceló ${formatLabel(tipo).toLocaleLowerCase('es-ES')}`,
    mensaje: `Periodo cancelado: ${formatRange(fechaInicio, fechaFin)}.`,
    metadata: {
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      empleadoId,
      empleadoNombre,
      prioridad: 'normal',
    },
  });
}

export async function crearNotificacionAusenciaAutoAprobada(
  prisma: PrismaClient,
  params: {
    ausenciaId: string;
    empresaId: string;
    empleadoId: string;
    tipo: string;
    fechaInicio: Date;
    fechaFin: Date;
  }
) {
  const { ausenciaId, empresaId, empleadoId, tipo, fechaInicio, fechaFin } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'ausencia_aprobada',
    titulo: `${formatLabel(tipo)} aprobada automáticamente`,
    mensaje: `Tu solicitud (${formatRange(fechaInicio, fechaFin)}) ha sido aprobada automáticamente.`,
    metadata: {
      ausenciaId,
      tipo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      autoAprobada: true,
      prioridad: 'normal',
      accionUrl: '/empleado/horario/ausencias',
      accionTexto: 'Ver ausencia',
    },
  });
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
  }
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
    titulo: 'Fichaje autocompletado',
    mensaje: `Tu fichaje del ${fecha.toLocaleDateString('es-ES')} ha sido completado automáticamente. Salida: ${salidaSugerida.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. Razón: ${razon}.`,
    metadata: {
      fichajeId,
      fecha: fecha.toISOString(),
      salidaSugerida: salidaSugerida.toISOString(),
      razon,
      prioridad: 'normal',
      accionUrl: '/empleado/horario/fichajes',
      accionTexto: 'Ver fichaje',
    },
  });
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
  }
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
    titulo: 'Fichaje requiere revisión',
    mensaje: `Fichaje de ${empleadoNombre} del ${fecha.toLocaleDateString('es-ES')} requiere revisión manual. Motivo: ${razon}.`,
    metadata: {
      fichajeId,
      fecha: fecha.toISOString(),
      razon,
      prioridad: 'alta',
      accionUrl: '/hr/horario/fichajes',
      accionTexto: 'Revisar ahora',
    },
  });
}

export async function crearNotificacionFichajeResuelto(
  prisma: PrismaClient,
  params: {
    fichajeId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    fecha: Date;
  }
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
  });
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
  }
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
      titulo: 'Cambio de manager',
      mensaje: `Tu manager ahora es ${nuevoManagerNombre}.${anteriorManagerNombre ? ` Antes: ${anteriorManagerNombre}.` : ''}`,
      metadata: {
        nuevoManagerId,
        nuevoManagerNombre,
        anteriorManagerId,
        anteriorManagerNombre,
        prioridad: 'alta',
      },
    });
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
    });
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
  }
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
    });
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
    });
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
      });
    }
  }
}

export async function crearNotificacionJornadaAsignada(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    empleadoId: string;
    jornadaNombre: string;
  }
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
    });
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
    });
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
      });
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
  }
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
  });
}

export async function crearNotificacionAsignadoEquipo(
  prisma: PrismaClient,
  params: {
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    equipoId: string;
    equipoNombre: string;
  }
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
  });

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
    });
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
  }
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
    titulo: `${empleadoNombre} solicita ${tipoDescripcion}`,
    mensaje: 'Revisa los cambios propuestos antes de la fecha límite.',
    metadata: {
      solicitudId,
      tipo,
      prioridad: 'alta',
      accionUrl: '/hr/solicitudes',
      accionTexto: 'Revisar solicitud',
    },
  });
}

export async function crearNotificacionSolicitudAprobada(
  prisma: PrismaClient,
  params: {
    solicitudId: string;
    empresaId: string;
    empleadoId: string;
    tipo: string;
    aprobadoPor: 'ia' | 'manual';
  }
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
  });
}

export async function crearNotificacionSolicitudRechazada(
  prisma: PrismaClient,
  params: {
    solicitudId: string;
    empresaId: string;
    empleadoId: string;
    tipo: string;
    motivoRechazo?: string;
  }
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
  });
}

export async function crearNotificacionSolicitudRequiereRevision(
  prisma: PrismaClient,
  params: {
    solicitudId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    tipo: string;
  }
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
  });
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
  }
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
  });
}

export async function crearNotificacionNominaError(
  prisma: PrismaClient,
  params: {
    nominaId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    error: string;
  }
) {
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
  });
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
  }
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
    titulo: 'Documento solicitado',
    mensaje: `Se te ha solicitado el documento: ${tipoDocumento}.${mensajeLimite}`,
    metadata: {
      documentoId,
      tipoDocumento,
      ...(fechaLimite && { fechaLimite: fechaLimite.toISOString() }),
      prioridad: 'alta',
      accionUrl: '/empleado/documentos',
      accionTexto: 'Subir documento',
    },
  });
}

export async function crearNotificacionDocumentoSubido(
  prisma: PrismaClient,
  params: {
    documentoId: string;
    empresaId: string;
    empleadoId: string;
    empleadoNombre: string;
    tipoDocumento: string;
  }
) {
  const { documentoId, empresaId, empleadoNombre, tipoDocumento } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'documento_subido',
    titulo: 'Documento subido',
    mensaje: `${empleadoNombre} ha subido el documento: ${tipoDocumento}.`,
    metadata: {
      documentoId,
      tipoDocumento,
      prioridad: 'normal',
      accionUrl: '/hr/documentos',
      accionTexto: 'Revisar documento',
    },
  });
}

export async function crearNotificacionDocumentoRechazado(
  prisma: PrismaClient,
  params: {
    documentoId: string;
    empresaId: string;
    empleadoId: string;
    tipoDocumento: string;
    motivo: string;
  }
) {
  const { documentoId, empresaId, empleadoId, tipoDocumento, motivo } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    empleado: empleadoId,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'documento_rechazado',
    titulo: 'Documento rechazado',
    mensaje: `Tu documento ${tipoDocumento} ha sido rechazado. Motivo: ${motivo}`,
    metadata: {
      documentoId,
      tipoDocumento,
      motivo,
      prioridad: 'alta',
      accionUrl: '/empleado/documentos',
      accionTexto: 'Volver a subir',
    },
  });
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
  }
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
        tipo: 'solicitud_creada', // Reutilizamos tipo genérico
        titulo: 'Nueva campaña de vacaciones',
        mensaje: `Se ha iniciado la campaña "${titulo}" para planificar tus vacaciones del ${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}. Por favor, indica tus preferencias.`,
        metadata: {
          campanaId,
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString(),
          prioridad: 'alta',
          accionUrl: `/empleado/vacaciones/campanas/${campanaId}`,
          accionTexto: 'Ver campaña',
        },
      });
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
  }
) {
  const { campanaId, empresaId, titulo, totalEmpleados } = params;

  // Notificar a HR Admin
  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    hrAdmin: true,
  });

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'solicitud_creada',
    titulo: 'Campaña de vacaciones completada',
    mensaje: `Todos los empleados (${totalEmpleados}) han completado sus preferencias para la campaña "${titulo}". Ya puedes cuadrar las vacaciones.`,
    metadata: {
      campanaId,
      totalEmpleados,
      prioridad: 'alta',
      accionUrl: `/hr/vacaciones/campanas/${campanaId}`,
      accionTexto: 'Cuadrar vacaciones',
    },
  });
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
  }
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
    tipo: 'solicitud_creada',
    titulo: 'Onboarding completado',
    mensaje: `${empleadoNombre} ha completado su proceso de onboarding y está listo para comenzar.`,
    metadata: {
      empleadoId,
      empleadoNombre,
      prioridad: 'normal',
      accionUrl: `/hr/empleados/${empleadoId}`,
      accionTexto: 'Ver empleado',
    },
  });
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
  }
) {
  const { nominaId, empresaId, managerId, empleadosCount, mes, año } = params;

  const usuarioIds = await obtenerUsuariosANotificar(prisma, empresaId, {
    manager: managerId,
  });

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'solicitud_creada',
    titulo: 'Complementos de nómina pendientes',
    mensaje: `Tienes ${empleadosCount} empleado(s) en tu equipo que requieren complementos de nómina para ${meses[mes - 1]} ${año}. Por favor, completa la información.`,
    metadata: {
      nominaId,
      mes,
      año,
      empleadosCount,
      prioridad: 'alta',
      accionUrl: '/manager/bandeja-entrada',
      accionTexto: 'Completar complementos',
      requiresModal: true, // Flag especial para abrir modal
    },
  });
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
  }
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
      accionUrl: `/hr/denuncias/${denunciaId}`,
      accionTexto: 'Revisar denuncia',
    },
  });
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
  }
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
      accionUrl: `/empleado/denuncias/${denunciaId}`,
      accionTexto: 'Ver denuncia',
    },
  });
}
