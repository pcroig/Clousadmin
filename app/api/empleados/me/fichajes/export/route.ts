// ========================================
// API Exportación Fichajes (Excel)
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import {
  badRequestResponse,
  handleApiError,
  isNextResponse,
  requireAuth,
} from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { formatearHorasMinutos, formatFechaEs, formatHoraEs } from '@/lib/utils/formatters';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    if (!session.user.empleadoId) {
      return badRequestResponse('No tienes un empleado asignado.');
    }

    const { searchParams } = new URL(req.url);
    const anioParam = searchParams.get('anio');
    const anio = anioParam ? parseInt(anioParam) : new Date().getFullYear();

    // Obtener fichajes
    const fichajes = await prisma.fichaje.findMany({
      where: {
        empleadoId: session.user.empleadoId,
        fecha: {
          gte: new Date(anio, 0, 1),
          lt: new Date(anio + 1, 0, 1),
        },
      },
      include: {
        eventos: {
          orderBy: { hora: 'asc' },
        },
        solicitudesCorreccion: {
          where: { estado: 'rechazada' },
          select: { motivo: true, respuesta: true },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    // Preparar datos para Excel
    const datos = fichajes.map((f) => {
      const entrada = f.eventos.find((e) => e.tipo === 'entrada')?.hora;
      const salida = f.eventos.find((e) => e.tipo === 'salida')?.hora;
      const horas = Number(f.horasTrabajadas) || 0;
      const pausas = Number(f.horasEnPausa) || 0;
      
      const discrepancias = f.solicitudesCorreccion
        .map(s => `Solicitud rechazada: ${s.motivo} (Resp: ${s.respuesta || 'Sin motivo'})`)
        .join('; ');

      return {
        Fecha: formatFechaEs(f.fecha),
        Estado: f.estado,
        Entrada: entrada ? formatHoraEs(entrada) : '-',
        Salida: salida ? formatHoraEs(salida) : '-',
        'Horas Trabajadas': formatearHorasMinutos(horas),
        'Tiempo en Pausa': formatearHorasMinutos(pausas),
        Discrepancias: discrepancias || '-',
      };
    });

    if (datos.length === 0) {
        // Añadir fila vacía para que el excel no falle o esté vacío
        datos.push({
            Fecha: '-', Estado: '-', Entrada: '-', Salida: '-', 
            'Horas Trabajadas': '-', 'Tiempo en Pausa': '-', Discrepancias: 'Sin registros para este año'
        });
    }

    // Generar Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 12 }, // Fecha
      { wch: 15 }, // Estado
      { wch: 10 }, // Entrada
      { wch: 10 }, // Salida
      { wch: 15 }, // Horas
      { wch: 15 }, // Pausas
      { wch: 50 }, // Discrepancias
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, `Fichajes ${anio}`);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Respuesta
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="fichajes_${anio}.xlsx"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'API Exportar Fichajes');
  }
}

