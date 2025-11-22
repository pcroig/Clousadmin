// ========================================
// Resumen de Plantilla - Estados diarios
// ========================================

import { EstadoAusencia, TipoFichajeEvento } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

import { obtenerEmpleadosDisponibles } from './fichajes';

interface EmpleadoResumen {
  nombre: string;
  avatar?: string;
}

interface PlantillaCategoria {
  count: number;
  empleados: EmpleadoResumen[];
}

export interface PlantillaResumen {
  trabajando: PlantillaCategoria;
  ausentes: PlantillaCategoria;
  sinFichar: PlantillaCategoria;
}

function normalizarFecha(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function mapearEmpleado(nombre: string, apellidos: string, fotoUrl: string | null): EmpleadoResumen {
  return {
    nombre: `${nombre} ${apellidos}`.trim(),
    avatar: fotoUrl ?? undefined,
  };
}

/**
 * Obtiene el estado agregado diario de la plantilla de una empresa.
 * Incluye:
 * - Trabajando: empleados con fichaje iniciado (entrada) y sin evento de salida.
 * - Ausentes: empleados con alguna ausencia activa (medio día o día completo).
 * - Sin fichar: empleados que deberían fichar hoy y aún no tienen entrada registrada.
 */
export async function obtenerResumenPlantilla(
  empresaId: string,
  fechaReferencia: Date = new Date()
): Promise<PlantillaResumen> {
  const fecha = normalizarFecha(fechaReferencia);

  const [empleadosDisponibles, fichajesHoy, ausenciasActivas] = await Promise.all([
    obtenerEmpleadosDisponibles(empresaId, fecha),
    prisma.fichaje.findMany({
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
    prisma.ausencia.findMany({
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
          },
        },
      },
    }),
  ]);

  const ausentesMapa = new Map<string, EmpleadoResumen>();
  const ausentesDiaCompleto = new Set<string>();
  const ausentesIds = new Set<string>();

  for (const ausencia of ausenciasActivas) {
    ausentesIds.add(ausencia.empleadoId);

    if (!ausentesMapa.has(ausencia.empleadoId)) {
      ausentesMapa.set(
        ausencia.empleadoId,
        mapearEmpleado(
          ausencia.empleado.nombre,
          ausencia.empleado.apellidos,
          ausencia.empleado.fotoUrl
        )
      );
    }

    if (!ausencia.medioDia) {
      ausentesDiaCompleto.add(ausencia.empleadoId);
    }
  }

  const empleadosConEntrada = new Set<string>();
  const trabajandoMapa = new Map<string, EmpleadoResumen>();

  for (const fichaje of fichajesHoy) {
    const tieneEntrada = fichaje.eventos.some(
      (evento) => evento.tipo === TipoFichajeEvento.entrada
    );

    if (!tieneEntrada) {
      continue;
    }

    empleadosConEntrada.add(fichaje.empleadoId);

    if (ausentesDiaCompleto.has(fichaje.empleadoId)) {
      continue;
    }

    const ultimoEvento = fichaje.eventos[fichaje.eventos.length - 1];

    if (!ultimoEvento || ultimoEvento.tipo === TipoFichajeEvento.salida) {
      continue;
    }

    trabajandoMapa.set(
      fichaje.empleadoId,
      mapearEmpleado(
        fichaje.empleado.nombre,
        fichaje.empleado.apellidos,
        fichaje.empleado.fotoUrl
      )
    );
  }

  const sinFicharMapa = new Map<string, EmpleadoResumen>();

  for (const empleado of empleadosDisponibles) {
    if (ausentesIds.has(empleado.id)) {
      continue;
    }

    if (empleadosConEntrada.has(empleado.id)) {
      continue;
    }

    sinFicharMapa.set(
      empleado.id,
      mapearEmpleado(empleado.nombre, empleado.apellidos, empleado.fotoUrl)
    );
  }

  const ordenarPorNombre = (a: EmpleadoResumen, b: EmpleadoResumen) =>
    a.nombre.localeCompare(b.nombre, 'es');

  const trabajando = Array.from(trabajandoMapa.values()).sort(ordenarPorNombre);
  const ausentes = Array.from(ausentesMapa.values()).sort(ordenarPorNombre);
  const sinFichar = Array.from(sinFicharMapa.values()).sort(ordenarPorNombre);

  return {
    trabajando: {
      count: trabajando.length,
      empleados: trabajando,
    },
    ausentes: {
      count: ausentes.length,
      empleados: ausentes,
    },
    sinFichar: {
      count: sinFichar.length,
      empleados: sinFichar,
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

  // Obtener IDs de empleados del equipo del manager (solo activos)
  const empleadosEquipo = await prisma.empleado.findMany({
    where: {
      empresaId,
      managerId,
      activo: true,
    },
    select: {
      id: true,
    },
  });

  const empleadoIds = empleadosEquipo.map((e) => e.id);

  // Si no hay empleados en el equipo, retornar vacío
  if (empleadoIds.length === 0) {
    return {
      trabajando: { count: 0, empleados: [] },
      ausentes: { count: 0, empleados: [] },
      sinFichar: { count: 0, empleados: [] },
    };
  }

  // Obtener empleados disponibles del equipo (solo los del manager)
  const empleadosDisponibles = await obtenerEmpleadosDisponibles(empresaId, fecha);
  const empleadosDisponiblesEquipo = empleadosDisponibles.filter((e) =>
    empleadoIds.includes(e.id)
  );

  const [fichajesHoy, ausenciasActivas] = await Promise.all([
    prisma.fichaje.findMany({
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
    prisma.ausencia.findMany({
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
          },
        },
      },
    }),
  ]);

  const ausentesMapa = new Map<string, EmpleadoResumen>();
  const ausentesDiaCompleto = new Set<string>();
  const ausentesIds = new Set<string>();

  for (const ausencia of ausenciasActivas) {
    ausentesIds.add(ausencia.empleadoId);

    if (!ausentesMapa.has(ausencia.empleadoId)) {
      ausentesMapa.set(
        ausencia.empleadoId,
        mapearEmpleado(
          ausencia.empleado.nombre,
          ausencia.empleado.apellidos,
          ausencia.empleado.fotoUrl
        )
      );
    }

    if (!ausencia.medioDia) {
      ausentesDiaCompleto.add(ausencia.empleadoId);
    }
  }

  const empleadosConEntrada = new Set<string>();
  const trabajandoMapa = new Map<string, EmpleadoResumen>();

  for (const fichaje of fichajesHoy) {
    const tieneEntrada = fichaje.eventos.some(
      (evento) => evento.tipo === TipoFichajeEvento.entrada
    );

    if (!tieneEntrada) {
      continue;
    }

    empleadosConEntrada.add(fichaje.empleadoId);

    if (ausentesDiaCompleto.has(fichaje.empleadoId)) {
      continue;
    }

    const ultimoEvento = fichaje.eventos[fichaje.eventos.length - 1];

    if (!ultimoEvento || ultimoEvento.tipo === TipoFichajeEvento.salida) {
      continue;
    }

    trabajandoMapa.set(
      fichaje.empleadoId,
      mapearEmpleado(
        fichaje.empleado.nombre,
        fichaje.empleado.apellidos,
        fichaje.empleado.fotoUrl
      )
    );
  }

  const sinFicharMapa = new Map<string, EmpleadoResumen>();

  for (const empleado of empleadosDisponiblesEquipo) {
    if (ausentesIds.has(empleado.id)) {
      continue;
    }

    if (empleadosConEntrada.has(empleado.id)) {
      continue;
    }

    sinFicharMapa.set(
      empleado.id,
      mapearEmpleado(empleado.nombre, empleado.apellidos, empleado.fotoUrl)
    );
  }

  const ordenarPorNombre = (a: EmpleadoResumen, b: EmpleadoResumen) =>
    a.nombre.localeCompare(b.nombre, 'es');

  const trabajando = Array.from(trabajandoMapa.values()).sort(ordenarPorNombre);
  const ausentes = Array.from(ausentesMapa.values()).sort(ordenarPorNombre);
  const sinFichar = Array.from(sinFicharMapa.values()).sort(ordenarPorNombre);

  return {
    trabajando: {
      count: trabajando.length,
      empleados: trabajando,
    },
    ausentes: {
      count: ausentes.length,
      empleados: ausentes,
    },
    sinFichar: {
      count: sinFichar.length,
      empleados: sinFichar,
    },
  };
}


