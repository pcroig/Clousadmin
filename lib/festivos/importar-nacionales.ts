// ========================================
// Importación de Festivos Nacionales de España
// ========================================

import { prisma } from '@/lib/prisma';

/**
 * Calcula la fecha de Viernes Santo para un año dado
 * Basado en el algoritmo de computación de Pascua de Gauss
 */
function calcularViernesSanto(año: number): Date {
  const a = año % 19;
  const b = Math.floor(año / 100);
  const c = año % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;

  // Domingo de Pascua
  const pascua = new Date(año, mes - 1, dia);
  
  // Viernes Santo es 2 días antes del Domingo de Pascua
  const viernesSanto = new Date(pascua);
  viernesSanto.setDate(pascua.getDate() - 2);
  
  return viernesSanto;
}

/**
 * Obtiene los festivos nacionales de España para un año específico
 */
function obtenerFestivosNacionalesAño(año: number): Array<{ fecha: Date; nombre: string }> {
  const viernesSanto = calcularViernesSanto(año);
  
  return [
    { fecha: new Date(año, 0, 1), nombre: 'Año Nuevo' },
    { fecha: new Date(año, 0, 6), nombre: 'Reyes Magos' },
    { fecha: viernesSanto, nombre: 'Viernes Santo' },
    { fecha: new Date(año, 4, 1), nombre: 'Día del Trabajador' },
    { fecha: new Date(año, 7, 15), nombre: 'Asunción de la Virgen' },
    { fecha: new Date(año, 9, 12), nombre: 'Fiesta Nacional de España' },
    { fecha: new Date(año, 10, 1), nombre: 'Todos los Santos' },
    { fecha: new Date(año, 11, 6), nombre: 'Día de la Constitución' },
    { fecha: new Date(año, 11, 8), nombre: 'Inmaculada Concepción' },
    { fecha: new Date(año, 11, 25), nombre: 'Navidad' },
  ];
}

/**
 * Importa festivos nacionales de España para un rango de años
 * 
 * @param empresaId - ID de la empresa
 * @param añoInicio - Año inicial (default: año actual)
 * @param añoFin - Año final (default: año actual + 1)
 * @returns Objeto con cantidad de festivos importados y omitidos
 */
export async function importarFestivosNacionales(
  empresaId: string,
  añoInicio?: number,
  añoFin?: number
): Promise<{
  importados: number;
  omitidos: number;
  años: number[];
}> {
  const añoActual = new Date().getFullYear();
  const inicio = añoInicio || añoActual;
  const fin = añoFin || añoActual + 1;

  console.info(`[Festivos] Importando festivos nacionales para empresa ${empresaId}, años ${inicio}-${fin}`);

  let importados = 0;
  let omitidos = 0;
  const años: number[] = [];

  for (let año = inicio; año <= fin; año++) {
    años.push(año);
    const festivosAño = obtenerFestivosNacionalesAño(año);

    for (const festivo of festivosAño) {
      try {
        // Usar upsert para evitar duplicados
        const result = await prisma.festivos.upsert({
          where: {
            empresaId_fecha: {
              empresaId,
              fecha: festivo.fecha,
            },
          },
          update: {}, // No actualizar si ya existe
          create: {
            empresaId,
            fecha: festivo.fecha,
            nombre: festivo.nombre,
            tipo: 'nacional',
            origen: 'manual',
            activo: true,
          },
        });

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          importados++;
        } else {
          omitidos++;
        }
      } catch (error) {
        console.error(`[Festivos] Error importando festivo ${festivo.nombre} (${festivo.fecha}):`, error);
        omitidos++;
      }
    }
  }

  console.info(`[Festivos] Importación completada: ${importados} importados, ${omitidos} omitidos`);

  return {
    importados,
    omitidos,
    años,
  };
}

/**
 * Verifica si una empresa tiene festivos importados
 */
export async function tieneFestivosImportados(empresaId: string): Promise<boolean> {
  const count = await prisma.festivos.count({
    where: {
      empresaId,
      tipo: 'nacional',
    },
  });

  return count > 0;
}

