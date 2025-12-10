// ========================================
// API Festivos Nacionales - España
// ========================================

import { NextRequest } from 'next/server';

import { handleApiError, requireAuth, successResponse } from '@/lib/api-handler';
import { normalizeToUTCDate, toDateInputValue } from '@/lib/utils/dates';

// GET /api/festivos/nacionales - Obtener festivos nacionales de España
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(req.url);
    const año = parseInt(searchParams.get('año') || new Date().getFullYear().toString());

    // Festivos nacionales de España (fijos)
    const festivosNacionales = [
      { mes: 0, dia: 1, nombre: 'Año Nuevo' },
      { mes: 0, dia: 6, nombre: 'Reyes Magos' },
      { mes: 4, dia: 1, nombre: 'Día del Trabajador' },
      { mes: 7, dia: 15, nombre: 'Asunción de la Virgen' },
      { mes: 9, dia: 12, nombre: 'Fiesta Nacional de España' },
      { mes: 10, dia: 1, nombre: 'Todos los Santos' },
      { mes: 11, dia: 6, nombre: 'Día de la Constitución' },
      { mes: 11, dia: 8, nombre: 'Inmaculada Concepción' },
      { mes: 11, dia: 25, nombre: 'Navidad' },
    ];

    // Festivos móviles (aproximación simple - en producción usar librería)
    const semanaSemanaSanta = calcularSemanaSanta(año);
    const festivosMoviles = [
      { fecha: semanaSemanaSanta.juevesSanto, nombre: 'Jueves Santo' },
      { fecha: semanaSemanaSanta.viernesSanto, nombre: 'Viernes Santo' },
    ];

    const festivos = [
      ...festivosNacionales.map((f) => {
        // Normalizar a UTC para evitar problemas de timezone
        const fecha = new Date(año, f.mes, f.dia);
        return {
          fecha: toDateInputValue(normalizeToUTCDate(fecha)),
          nombre: f.nombre,
          tipo: 'nacional',
        };
      }),
      ...festivosMoviles.map((f) => ({
        fecha: toDateInputValue(normalizeToUTCDate(f.fecha)),
        nombre: f.nombre,
        tipo: 'nacional',
      })),
    ];

    return successResponse({ año, festivos });
  } catch (error) {
    return handleApiError(error, 'API GET /api/festivos/nacionales');
  }
}

// Cálculo simplificado de Semana Santa (algoritmo de Gauss)
function calcularSemanaSanta(año: number) {
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

  const domingoPascua = new Date(año, mes - 1, dia);
  const juevesSanto = new Date(domingoPascua);
  juevesSanto.setDate(domingoPascua.getDate() - 3);
  const viernesSanto = new Date(domingoPascua);
  viernesSanto.setDate(domingoPascua.getDate() - 2);

  return { juevesSanto, viernesSanto };
}

