// ========================================
// Cálculo de días consecutivos sin fichar
// ========================================

import { prisma } from '@/lib/prisma';
import { esDiaLaboral } from './fichajes';

/**
 * Calcula los días laborables consecutivos sin fichar para un empleado
 * Solo cuenta días laborables (considera jornada, festivos, ausencias)
 */
export async function calcularDiasSinFichar(empleadoId: string): Promise<number> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  let diasSinFichar = 0;
  const fechaActual = new Date(hoy);
  fechaActual.setDate(fechaActual.getDate() - 1); // Empezar desde ayer
  
  // Retroceder máximo 30 días para evitar bucles infinitos
  const limite = 30;
  let diasRevisados = 0;
  
  while (diasRevisados < limite) {
    // Verificar si era día laboral
    const eraLaboral = await esDiaLaboral(empleadoId, fechaActual);
    
    if (!eraLaboral) {
      // Si no era laboral, seguir retrocediendo sin romper la racha
      fechaActual.setDate(fechaActual.getDate() - 1);
      diasRevisados++;
      continue;
    }
    
    // Verificar si tiene fichaje ese día
    const fichaje = await prisma.fichaje.findUnique({
      where: {
        empleadoId_fecha: {
          empleadoId,
          fecha: fechaActual,
        },
      },
      include: {
        eventos: true,
      },
    });
    
    // Si no tiene fichaje o el fichaje está vacío (sin eventos), incrementar contador
    if (!fichaje || fichaje.eventos.length === 0) {
      diasSinFichar++;
      fechaActual.setDate(fechaActual.getDate() - 1);
      diasRevisados++;
    } else {
      // Si tiene fichaje con eventos, romper la racha
      break;
    }
  }
  
  return diasSinFichar;
}

/**
 * Obtiene información de días sin fichar para múltiples empleados
 */
export async function obtenerDiasSinFicharPorEmpleado(
  empleadoIds: string[]
): Promise<Record<string, number>> {
  const resultados: Record<string, number> = {};
  
  // Procesar en paralelo para mejor performance
  await Promise.all(
    empleadoIds.map(async (empleadoId) => {
      try {
        const dias = await calcularDiasSinFichar(empleadoId);
        resultados[empleadoId] = dias;
      } catch (error) {
        console.error(`[diasSinFichar] Error para empleado ${empleadoId}:`, error);
        resultados[empleadoId] = 0;
      }
    })
  );
  
  return resultados;
}











