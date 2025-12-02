// ========================================
// Resumen de Plantilla - Estados diarios
// ========================================

import { EstadoAusencia, TipoFichajeEvento } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { obtenerNombreDia } from '@/lib/utils/fechas';

import { obtenerEmpleadosDisponibles } from './fichajes';

import type { DiaConfig, JornadaConfig } from './fichajes-helpers';

export interface EmpleadoResumen {
  id: string;
  nombre: string;
  primerNombre?: string;
  apellidos?: string;
  avatar?: string;
  email?: string;
  puesto?: string;
  equipoNombre?: string;
}

interface PlantillaCategoria {
  count: number;
  empleados: EmpleadoResumen[];
}

export interface PlantillaResumen {
  trabajando: PlantillaCategoria;
  enPausa: PlantillaCategoria;
  ausentes: PlantillaCategoria;
  sinFichar: PlantillaCategoria;
  fueraDeHorario: PlantillaCategoria;
}

function normalizarFecha(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

type EmpleadoMapInput = {
  id: string;
  nombre: string;
  apellidos: string;
  fotoUrl: string | null;
  email?: string | null;
  puesto?: string | null;
  equipos?: Array<{
    equipo?: {
      nombre?: string | null;
    } | null;
  }>;
};

function mapearEmpleado(empleado: EmpleadoMapInput): EmpleadoResumen {
  const equipoNombre = empleado.equipos?.[0]?.equipo?.nombre ?? undefined;

  return {
    id: empleado.id,
    nombre: `${empleado.nombre} ${empleado.apellidos}`.trim(),
    primerNombre: empleado.nombre,
    apellidos: empleado.apellidos,
    avatar: empleado.fotoUrl ?? undefined,
    email: empleado.email ?? undefined,
    puesto: empleado.puesto ?? undefined,
    equipoNombre,
  };
}

/**
 * Determina si un empleado está dentro de su horario laboral en este momento
 */
function estaEnHorarioLaboral(
  jornadaConfig: unknown,
  fecha: Date,
  horaActual: Date
): { enHorario: boolean; yaInicioHorario: boolean } {
  if (!jornadaConfig || typeof jornadaConfig !== 'object') {
    // Sin jornada configurada, asumimos que está en horario
    return { enHorario: true, yaInicioHorario: true };
  }

  const config = jornadaConfig as JornadaConfig;
  const nombreDia = obtenerNombreDia(fecha);
  const configDia = config[nombreDia] as DiaConfig | undefined;

  // Si el día no está activo o no tiene configuración, no está en horario
  if (!configDia || configDia.activo === false) {
    return { enHorario: false, yaInicioHorario: false };
  }

  // Para jornada fija
  if (config.tipo === 'fija' && configDia.entrada && configDia.salida) {
    const [horaEntrada, minEntrada] = configDia.entrada.split(':').map(Number);
    const [horaSalida, minSalida] = configDia.salida.split(':').map(Number);

    const horaActualMs = horaActual.getHours() * 60 + horaActual.getMinutes();
    const horaEntradaMs = horaEntrada * 60 + minEntrada;
    const horaSalidaMs = horaSalida * 60 + minSalida;

    const yaInicioHorario = horaActualMs >= horaEntradaMs;
    const enHorario = horaActualMs >= horaEntradaMs && horaActualMs <= horaSalidaMs;

    return { enHorario, yaInicioHorario };
  }

  // Para jornada flexible, asumimos horario amplio (ej. 7:00 - 22:00)
  if (config.tipo === 'flexible') {
    const horaActualMs = horaActual.getHours() * 60 + horaActual.getMinutes();
    
    // Horario flexible típico: 7:00 - 22:00
    const horaEntradaMs = 7 * 60;
    const horaSalidaMs = 22 * 60;

    const yaInicioHorario = horaActualMs >= horaEntradaMs;
    const enHorario = horaActualMs >= horaEntradaMs && horaActualMs <= horaSalidaMs;

    return { enHorario, yaInicioHorario };
  }

  // Por defecto, asumimos horario estándar 9:00 - 18:00
  const horaActualMs = horaActual.getHours() * 60 + horaActual.getMinutes();
  const yaInicioHorario = horaActualMs >= 9 * 60;
  const enHorario = horaActualMs >= 9 * 60 && horaActualMs <= 18 * 60;

  return { enHorario, yaInicioHorario };
}

/**
 * Obtiene el estado agregado diario de la plantilla de una empresa.
 * Incluye:
 * - Trabajando: empleados fichados, en horario, NO en pausa, NO ficharon salida.
 * - En pausa: empleados que han fichado pero están actualmente en pausa.
 * - Ausentes: empleados con alguna ausencia activa (medio día o día completo).
 * - Sin fichar: empleados cuya hora de entrada ya pasó pero no han fichado.
 * - Fuera de horario: empleados que no están en su horario laboral y no han fichado.
 */
export async function obtenerResumenPlantilla(
  empresaId: string,
  fechaReferencia: Date = new Date()
): Promise<PlantillaResumen> {
  const fecha = normalizarFecha(fechaReferencia);
  const horaActual = new Date();

  const [empleadosDisponibles, fichajesHoy, ausenciasActivas, todosEmpleados] = await Promise.all([
    obtenerEmpleadosDisponibles(empresaId, fecha),
    prisma.fichajes.findMany({
      where: {
        empresaId,
        fecha,
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            fotoUrl: true,
            email: true,
            puesto: true,
            equipos: {
              select: {
                equipo: {
                  select: {
                    nombre: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        eventos: {
          orderBy: {
            hora: 'asc',
          },
          select: {
            tipo: true,
            hora: true,
          },
        },
      },
    }),
    prisma.ausencias.findMany({
      where: {
        empresaId,
        estado: {
          in: [EstadoAusencia.confirmada, EstadoAusencia.pendiente],
        },
        fechaInicio: {
          lte: fecha,
        },
        fechaFin: {
          gte: fecha,
        },
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            fotoUrl: true,
            email: true,
            puesto: true,
            equipos: {
              select: {
                equipo: {
                  select: {
                    nombre: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    }),
    // Obtener todos los empleados activos con su jornada para calcular horarios
    prisma.empleados.findMany({
      where: {
        empresaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        fotoUrl: true,
        email: true,
        puesto: true,
        equipos: {
          select: {
            equipo: {
              select: {
                nombre: true,
              },
            },
          },
          take: 1,
        },
        jornada: {
          select: {
            config: true,
          },
        },
      },
    }),
  ]);

  const empleadosDisponiblesSet = new Set(empleadosDisponibles.map((empleado) => empleado.id));

  // Crear mapa de jornadas para búsqueda rápida
  const jornadaMap = new Map<string, unknown>();
  for (const emp of todosEmpleados) {
    if (emp.jornada?.config) {
      jornadaMap.set(emp.id, emp.jornada.config);
    }
  }

  // 1. AUSENTES
  const ausentesMapa = new Map<string, EmpleadoResumen>();
  const ausentesDiaCompleto = new Set<string>();
  const ausentesIds = new Set<string>();

  for (const ausencia of ausenciasActivas) {
    ausentesIds.add(ausencia.empleadoId);

    if (!ausentesMapa.has(ausencia.empleadoId)) {
      ausentesMapa.set(ausencia.empleadoId, mapearEmpleado(ausencia.empleado));
    }

    if (!ausencia.medioDia) {
      ausentesDiaCompleto.add(ausencia.empleadoId);
    }
  }

  // 2. TRABAJANDO y EN PAUSA (empleados que han fichado)
  const empleadosConEntrada = new Set<string>();
  const trabajandoMapa = new Map<string, EmpleadoResumen>();
  const enPausaMapa = new Map<string, EmpleadoResumen>();

  for (const fichaje of fichajesHoy) {
    const tieneEntrada = fichaje.eventos.some(
      (evento) => evento.tipo === TipoFichajeEvento.entrada
    );

    if (!tieneEntrada) {
      continue;
    }

    empleadosConEntrada.add(fichaje.empleadoId);

    // Si tienen ausencia de día completo, no los mostramos como trabajando
    if (ausentesDiaCompleto.has(fichaje.empleadoId)) {
      continue;
    }

    const ultimoEvento = fichaje.eventos[fichaje.eventos.length - 1];

    // Si ya fichó salida, no está trabajando
    if (!ultimoEvento || ultimoEvento.tipo === TipoFichajeEvento.salida) {
      continue;
    }

    const empleadoResumen = mapearEmpleado(fichaje.empleado);

    // Determinar si está en pausa o trabajando según el último evento
    if (ultimoEvento.tipo === TipoFichajeEvento.pausa_inicio) {
      enPausaMapa.set(fichaje.empleadoId, empleadoResumen);
    } else {
      // último evento es entrada o pausa_fin -> está trabajando
      trabajandoMapa.set(fichaje.empleadoId, empleadoResumen);
    }
  }

  // 3. SIN FICHAR y FUERA DE HORARIO (resto de empleados activos)
  const sinFicharMapa = new Map<string, EmpleadoResumen>();
  const fueraDeHorarioMapa = new Map<string, EmpleadoResumen>();

  for (const empleado of todosEmpleados) {
    if (ausentesIds.has(empleado.id) || empleadosConEntrada.has(empleado.id)) {
      continue;
    }

    const jornadaConfig = jornadaMap.get(empleado.id);
    const { enHorario, yaInicioHorario } = estaEnHorarioLaboral(jornadaConfig, fecha, horaActual);
    const estaProgramado = empleadosDisponiblesSet.has(empleado.id);

    const empleadoResumen = mapearEmpleado(empleado);

    if (estaProgramado && yaInicioHorario && enHorario) {
      sinFicharMapa.set(empleado.id, empleadoResumen);
    } else {
      fueraDeHorarioMapa.set(empleado.id, empleadoResumen);
    }
  }

  const ordenarPorNombre = (a: EmpleadoResumen, b: EmpleadoResumen) =>
    a.nombre.localeCompare(b.nombre, 'es');

  const trabajando = Array.from(trabajandoMapa.values()).sort(ordenarPorNombre);
  const enPausa = Array.from(enPausaMapa.values()).sort(ordenarPorNombre);
  const ausentes = Array.from(ausentesMapa.values()).sort(ordenarPorNombre);
  const sinFichar = Array.from(sinFicharMapa.values()).sort(ordenarPorNombre);
  const fueraDeHorario = Array.from(fueraDeHorarioMapa.values()).sort(ordenarPorNombre);

  return {
    trabajando: {
      count: trabajando.length,
      empleados: trabajando,
    },
    enPausa: {
      count: enPausa.length,
      empleados: enPausa,
    },
    ausentes: {
      count: ausentes.length,
      empleados: ausentes,
    },
    sinFichar: {
      count: sinFichar.length,
      empleados: sinFichar,
    },
    fueraDeHorario: {
      count: fueraDeHorario.length,
      empleados: fueraDeHorario,
    },
  };
}

/**
 * Obtiene el resumen de plantilla de un equipo específico (filtrado por managerId).
 * IMPORTANTE: Solo incluye empleados que tienen al manager especificado como managerId.
 */
export async function obtenerResumenPlantillaEquipo(
  empresaId: string,
  managerId: string,
  fechaReferencia: Date = new Date()
): Promise<PlantillaResumen> {
  const fecha = normalizarFecha(fechaReferencia);
  const horaActual = new Date();

  // Obtener empleados del equipo del manager (solo activos)
  const empleadosEquipo = await prisma.empleados.findMany({
    where: {
      empresaId,
      managerId,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      fotoUrl: true,
      email: true,
      puesto: true,
      equipos: {
        select: {
          equipo: {
            select: {
              nombre: true,
            },
          },
        },
        take: 1,
      },
      jornada: {
        select: {
          config: true,
        },
      },
    },
  });

  const empleadoIds = empleadosEquipo.map((e) => e.id);

  // Si no hay empleados en el equipo, retornar vacío
  if (empleadoIds.length === 0) {
    return {
      trabajando: { count: 0, empleados: [] },
      enPausa: { count: 0, empleados: [] },
      ausentes: { count: 0, empleados: [] },
      sinFichar: { count: 0, empleados: [] },
      fueraDeHorario: { count: 0, empleados: [] },
    };
  }

  // Obtener empleados disponibles del equipo (solo los del manager)
  const empleadosDisponibles = await obtenerEmpleadosDisponibles(empresaId, fecha);
  const empleadosDisponiblesEquipo = empleadosDisponibles.filter((e) =>
    empleadoIds.includes(e.id)
  );

  const [fichajesHoy, ausenciasActivas] = await Promise.all([
    prisma.fichajes.findMany({
      where: {
        empresaId,
        fecha,
        empleadoId: {
          in: empleadoIds, // ✅ Solo fichajes del equipo
        },
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            fotoUrl: true,
            email: true,
            puesto: true,
            equipos: {
              select: {
                equipo: {
                  select: {
                    nombre: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        eventos: {
          orderBy: {
            hora: 'asc',
          },
          select: {
            tipo: true,
            hora: true,
          },
        },
      },
    }),
    prisma.ausencias.findMany({
      where: {
        empresaId,
        estado: {
          in: [EstadoAusencia.confirmada, EstadoAusencia.pendiente],
        },
        fechaInicio: {
          lte: fecha,
        },
        fechaFin: {
          gte: fecha,
        },
        empleadoId: {
          in: empleadoIds, // ✅ Solo ausencias del equipo
        },
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            fotoUrl: true,
            email: true,
            puesto: true,
            equipos: {
              select: {
                equipo: {
                  select: {
                    nombre: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  const jornadaMap = new Map<string, unknown>();
  for (const emp of empleadosEquipo) {
    if (emp.jornada?.config) {
      jornadaMap.set(emp.id, emp.jornada.config);
    }
  }

  // 1. AUSENTES
  const ausentesMapa = new Map<string, EmpleadoResumen>();
  const ausentesDiaCompleto = new Set<string>();
  const ausentesIds = new Set<string>();

  for (const ausencia of ausenciasActivas) {
    ausentesIds.add(ausencia.empleadoId);

    if (!ausentesMapa.has(ausencia.empleadoId)) {
      ausentesMapa.set(ausencia.empleadoId, mapearEmpleado(ausencia.empleado));
    }

    if (!ausencia.medioDia) {
      ausentesDiaCompleto.add(ausencia.empleadoId);
    }
  }

  // 2. TRABAJANDO y EN PAUSA (empleados que han fichado)
  const empleadosConEntrada = new Set<string>();
  const trabajandoMapa = new Map<string, EmpleadoResumen>();
  const enPausaMapa = new Map<string, EmpleadoResumen>();

  for (const fichaje of fichajesHoy) {
    const tieneEntrada = fichaje.eventos.some(
      (evento) => evento.tipo === TipoFichajeEvento.entrada
    );

    if (!tieneEntrada) {
      continue;
    }

    empleadosConEntrada.add(fichaje.empleadoId);

    // Si tienen ausencia de día completo, no los mostramos como trabajando
    if (ausentesDiaCompleto.has(fichaje.empleadoId)) {
      continue;
    }

    const ultimoEvento = fichaje.eventos[fichaje.eventos.length - 1];

    // Si ya fichó salida, no está trabajando
    if (!ultimoEvento || ultimoEvento.tipo === TipoFichajeEvento.salida) {
      continue;
    }

    const empleadoResumen = mapearEmpleado(fichaje.empleado);

    // Determinar si está en pausa o trabajando según el último evento
    if (ultimoEvento.tipo === TipoFichajeEvento.pausa_inicio) {
      enPausaMapa.set(fichaje.empleadoId, empleadoResumen);
    } else {
      // último evento es entrada o pausa_fin -> está trabajando
      trabajandoMapa.set(fichaje.empleadoId, empleadoResumen);
    }
  }

  // 3. SIN FICHAR y FUERA DE HORARIO (empleados disponibles que no han fichado)
  const empleadosDisponiblesSet = new Set(empleadosDisponiblesEquipo.map((emp) => emp.id));
  const sinFicharMapa = new Map<string, EmpleadoResumen>();
  const fueraDeHorarioMapa = new Map<string, EmpleadoResumen>();

  for (const empleado of empleadosEquipo) {
    if (ausentesIds.has(empleado.id) || empleadosConEntrada.has(empleado.id)) {
      continue;
    }

    const jornadaConfig = jornadaMap.get(empleado.id);
    const { enHorario, yaInicioHorario } = estaEnHorarioLaboral(jornadaConfig, fecha, horaActual);
    const estaProgramado = empleadosDisponiblesSet.has(empleado.id);

    const empleadoResumen = mapearEmpleado(empleado);

    if (estaProgramado && yaInicioHorario && enHorario) {
      sinFicharMapa.set(empleado.id, empleadoResumen);
    } else {
      fueraDeHorarioMapa.set(empleado.id, empleadoResumen);
    }
  }

  const ordenarPorNombre = (a: EmpleadoResumen, b: EmpleadoResumen) =>
    a.nombre.localeCompare(b.nombre, 'es');

  const trabajando = Array.from(trabajandoMapa.values()).sort(ordenarPorNombre);
  const enPausa = Array.from(enPausaMapa.values()).sort(ordenarPorNombre);
  const ausentes = Array.from(ausentesMapa.values()).sort(ordenarPorNombre);
  const sinFichar = Array.from(sinFicharMapa.values()).sort(ordenarPorNombre);
  const fueraDeHorario = Array.from(fueraDeHorarioMapa.values()).sort(ordenarPorNombre);

  return {
    trabajando: {
      count: trabajando.length,
      empleados: trabajando,
    },
    enPausa: {
      count: enPausa.length,
      empleados: enPausa,
    },
    ausentes: {
      count: ausentes.length,
      empleados: ausentes,
    },
    sinFichar: {
      count: sinFichar.length,
      empleados: sinFichar,
    },
    fueraDeHorario: {
      count: fueraDeHorario.length,
      empleados: fueraDeHorario,
    },
  };
}


