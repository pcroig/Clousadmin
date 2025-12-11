// ========================================
// Creación de Nóminas Base
// ========================================
// Crea registros de nóminas base para todos los empleados activos
// con información inicial calculada (salario, días, alertas)
// Estado inicial: 'pendiente'

import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { generarAlertasParaNomina } from '@/lib/calculos/alertas-nomina';
import { prisma } from '@/lib/prisma';
import { normalizarFechaSinHora } from '@/lib/utils/fechas';

interface CrearNominasBaseOptions {
  eventoId: string;
  empresaId: string;
  mes: number;
  anio: number;
}

export interface CrearNominasBaseResult {
  nominasCreadas: number;
  empleadosActivos: number;
  alertasGeneradas: number;
  empleadosConComplementos: number;
}

/**
 * Crea registros de nóminas base para todos los empleados activos
 *
 * Responsabilidades:
 * ✅ Calcular salario base (con tipoPagas del contrato)
 * ✅ Calcular días trabajados y ausencias
 * ✅ Detectar complementos pendientes
 * ✅ Generar alertas iniciales
 * ✅ Estado inicial: 'pendiente'
 *
 * NO calcula (se hace en "Generar Pre-nóminas"):
 * ❌ totalComplementos (suma numérica de complementos)
 * ❌ Asignación de compensaciones de horas
 * ❌ Cálculos finales de totalBruto
 *
 * @param options - eventoId, empresaId, mes, anio
 * @returns Estadísticas de nóminas creadas
 */
export async function crearNominasBase(
  options: CrearNominasBaseOptions
): Promise<CrearNominasBaseResult> {
  const { eventoId, empresaId, mes, anio } = options;

  // Calcular rango del mes (normalizado a UTC para consistencia con BD)
  const inicioMes = normalizarFechaSinHora(new Date(anio, mes - 1, 1));
  const finMes = normalizarFechaSinHora(new Date(anio, mes, 0));
  // Ajustar finMes a 23:59:59.999 para incluir todo el último día
  finMes.setHours(23, 59, 59, 999);

  // 1. Obtener empleados activos con datos necesarios
  const empleados = await prisma.empleados.findMany({
    where: {
      empresaId,
      activo: true,
    },
    include: {
      contratos: {
        where: {
          fechaInicio: { lte: finMes },
          OR: [
            { fechaFin: null },
            { fechaFin: { gte: inicioMes } },
          ],
        },
        orderBy: { fechaInicio: 'desc' },
        take: 1,
      },
      empleado_complementos: {
        where: {
          activo: true,
        },
      },
      ausencias: {
        where: {
          estado: { in: ['confirmada', 'completada'] },
          fechaInicio: { lte: finMes },
          fechaFin: { gte: inicioMes } ,
        },
      },
    },
  });

  if (empleados.length === 0) {
    // Sin empleados activos, actualizar evento y retornar
    await prisma.eventos_nomina.update({
      where: { id: eventoId },
      data: {
        totalEmpleados: 0,
        prenominasGeneradas: 0,
        empleadosConComplementos: 0,
      },
    });

    return {
      nominasCreadas: 0,
      empleadosActivos: 0,
      alertasGeneradas: 0,
      empleadosConComplementos: 0,
    };
  }

  // 2. Resolver jornadas en batch (optimización)
  const { resolverJornadasBatch } = await import('@/lib/jornadas/resolver-batch');

  // Mapear empleados al tipo esperado por resolverJornadasBatch
  const empleadosConEquipos = empleados.map(emp => ({
    ...emp,
    equipos: [], // No necesitamos equipos para esta operación
  }));

  const jornadasResueltas = await resolverJornadasBatch(empleadosConEquipos);

  let nominasCreadas = 0;
  let alertasGeneradas = 0;
  let empleadosConComplementos = 0;

  // 3. Crear nóminas para cada empleado
  for (const empleado of empleados) {
    const contratoActivo = empleado.contratos[0] || null;
    const jornada = jornadasResueltas.get(empleado.id);

    // Calcular salario base con tipoPagas
    const salarioBase = calcularSalarioBase(empleado, contratoActivo);

    // Calcular días trabajados y ausencias
    const diasMes = finMes.getDate();
    const diasAusencias = calcularDiasAusencias(
      empleado.ausencias,
      inicioMes,
      finMes
    );
    const diasTrabajados = diasMes - diasAusencias;

    // Detectar complementos pendientes
    const tieneComplementos = empleado.empleado_complementos.length > 0;
    if (tieneComplementos) {
      empleadosConComplementos++;
    }

    // Crear nómina base
    const nomina = await prisma.nominas.create({
      data: {
        empleadoId: empleado.id,
        contratoId: contratoActivo?.id || null,
        eventoNominaId: eventoId,
        mes,
        anio,
        estado: 'pendiente',

        // ✅ Calculados al crear
        salarioBase,
        diasTrabajados,
        diasAusencias,
        complementosPendientes: tieneComplementos,

        // ⚠️ Valores iniciales (se completan en "Generar Pre-nóminas")
        totalComplementos: new Decimal(0),
        totalDeducciones: new Decimal(0),
        totalBruto: salarioBase, // Inicial = salarioBase
        totalNeto: salarioBase, // Inicial = salarioBase
      },
    });

    nominasCreadas++;

    // Generar alertas iniciales
    const numAlertas = await generarAlertasParaNomina(
      nomina.id,
      empleado.id,
      empresaId,
      mes,
      anio
    );
    alertasGeneradas += numAlertas;
  }

  return {
    nominasCreadas,
    empleadosActivos: empleados.length,
    alertasGeneradas,
    empleadosConComplementos,
  };
}

/**
 * Calcula salario base mensual según tipoPagas del contrato
 *
 * Prioridad:
 * 1. contrato.salarioBaseAnual / tipoPagas
 * 2. empleado.salarioBaseMensual
 * 3. empleado.salarioBaseAnual / 12
 * 4. 0 (generará alerta crítica)
 *
 * @param empleado - Empleado con salarios
 * @param contrato - Contrato activo con tipoPagas
 * @returns Salario base mensual
 */
function calcularSalarioBase(
  empleado: {
    salarioBaseMensual: Prisma.Decimal | null;
    salarioBaseAnual: Prisma.Decimal | null;
  },
  contrato: {
    salarioBaseAnual: Prisma.Decimal | null;
    tipoPagas: number;
  } | null
): Decimal {
  // Prioridad 1: Salario anual del contrato / tipoPagas
  if (contrato?.salarioBaseAnual) {
    const tipoPagas = contrato.tipoPagas || 12;
    return new Decimal(contrato.salarioBaseAnual)
      .div(tipoPagas)
      .toDecimalPlaces(2);
  }

  // Prioridad 2: Salario mensual del empleado
  if (empleado.salarioBaseMensual) {
    return new Decimal(empleado.salarioBaseMensual).toDecimalPlaces(2);
  }

  // Prioridad 3: Salario anual del empleado / 12
  if (empleado.salarioBaseAnual) {
    return new Decimal(empleado.salarioBaseAnual).div(12).toDecimalPlaces(2);
  }

  // Sin salario definido (se generará alerta crítica)
  return new Decimal(0);
}

/**
 * Calcula días de ausencias confirmadas en el rango del mes
 *
 * @param ausencias - Ausencias del empleado
 * @param inicioMes - Primer día del mes
 * @param finMes - Último día del mes
 * @returns Total de días de ausencias
 */
function calcularDiasAusencias(
  ausencias: Array<{ fechaInicio: Date; fechaFin: Date }>,
  inicioMes: Date,
  finMes: Date
): number {
  let totalDias = 0;

  for (const ausencia of ausencias) {
    // Normalizar fechas de ausencia para comparación correcta
    const ausenciaInicio = normalizarFechaSinHora(ausencia.fechaInicio);
    const ausenciaFin = normalizarFechaSinHora(ausencia.fechaFin);

    // Intersección con el rango del mes
    const inicio = ausenciaInicio > inicioMes ? ausenciaInicio : inicioMes;
    const fin = ausenciaFin < finMes ? ausenciaFin : finMes;

    // ✅ Validar que hay intersección (ausencia no está fuera del rango del mes)
    if (inicio > fin) {
      continue; // No hay intersección, saltar esta ausencia
    }

    // Calcular días (inclusivo)
    // Si usamos Math.ceil, NO debemos sumar +1 adicional
    // Ejemplo: inicio=1 ene, fin=1 ene → diffTime=0 → diffDays=0 días → +1 = 1 día ✅
    // Ejemplo: inicio=1 ene, fin=2 ene → diffTime=86400000 → diffDays=1 día → +1 = 2 días ✅
    const diffTime = fin.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    totalDias += diffDays;
  }

  return totalDias;
}
