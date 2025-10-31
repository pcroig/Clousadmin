// ========================================
// API Calendario - Importar ICS/CSV
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    let fechas: { fecha: Date; nombre: string }[] = [];

    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (Array.isArray(body.fechas)) {
        fechas = body.fechas
          .map((f: any) => ({
            fecha: new Date(f.fecha || f.fechaISO),
            nombre: f.nombre || 'No laborable',
          }))
          .filter((f: any) => !isNaN(f.fecha.getTime()));
      } else {
        return NextResponse.json({ error: 'JSON inválido: se espera { fechas: [...] }' }, { status: 400 });
      }
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
      }
      const texto = await file.text();
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'ics') {
        fechas = parsearICS(texto);
      } else if (extension === 'csv') {
        fechas = parsearCSV(texto);
      } else {
        return NextResponse.json({ error: 'Formato no soportado. Use .ics o .csv' }, { status: 400 });
      }
    }

    // Crear festivos en BD (tipo empresa, origen manual)
    const promises = fechas.map((f) =>
      prisma.festivo.upsert({
        where: {
          empresaId_fecha: {
            empresaId: session.user.empresaId,
            fecha: f.fecha,
          },
        },
        update: {
          nombre: f.nombre,
          tipo: 'empresa',
          origen: 'manual',
          activo: true,
        },
        create: {
          empresaId: session.user.empresaId,
          fecha: f.fecha,
          nombre: f.nombre,
          tipo: 'empresa',
          origen: 'manual',
          activo: true,
        },
      })
    );

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      importados: fechas.length,
    });
  } catch (error) {
    console.error('[API POST Calendario Importar]', error);
    return NextResponse.json({ error: 'Error al importar calendario' }, { status: 500 });
  }
}

function parsearICS(texto: string): { fecha: Date; nombre: string }[] {
  const fechas: { fecha: Date; nombre: string }[] = [];
  const lineas = texto.split('\n');

  let eventoActual: { fecha?: Date; nombre?: string } = {};

  for (const linea of lineas) {
    const lineaTrim = linea.trim();

    if (lineaTrim.startsWith('DTSTART;VALUE=DATE:') || lineaTrim.startsWith('DTSTART:')) {
      const fechaStr = lineaTrim.split(':')[1]?.substring(0, 8);
      if (fechaStr && fechaStr.length === 8) {
        const año = parseInt(fechaStr.substring(0, 4));
        const mes = parseInt(fechaStr.substring(4, 6)) - 1;
        const dia = parseInt(fechaStr.substring(6, 8));
        eventoActual.fecha = new Date(año, mes, dia);
      }
    }

    if (lineaTrim.startsWith('SUMMARY:')) {
      eventoActual.nombre = lineaTrim.substring(8).trim();
    }

    if (lineaTrim === 'END:VEVENT' && eventoActual.fecha && eventoActual.nombre) {
      fechas.push({ fecha: eventoActual.fecha, nombre: eventoActual.nombre });
      eventoActual = {};
    }
  }

  return fechas;
}

function parsearCSV(texto: string): { fecha: Date; nombre: string }[] {
  const fechas: { fecha: Date; nombre: string }[] = [];
  const lineas = texto.split('\n').slice(1); // Saltar cabecera

  for (const linea of lineas) {
    const [fechaStr, nombre] = linea.split(',').map((s) => s.trim().replace(/"/g, ''));
    if (fechaStr && nombre) {
      const fecha = new Date(fechaStr);
      if (!isNaN(fecha.getTime())) {
        fechas.push({ fecha, nombre });
      }
    }
  }

  return fechas;
}

