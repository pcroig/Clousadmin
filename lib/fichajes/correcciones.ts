// ========================================
// Helpers para solicitudes de corrección de fichajes
// ========================================

import { actualizarCalculosFichaje } from '@/lib/calculos/fichajes';
import { EstadoSolicitudCorreccionFichaje } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

export interface CorreccionFichajePayload {
  nuevaFecha?: string | null;
  nuevaHora?: string | null;
}

export function normalizarFechaCorreccion(nuevaFecha?: string | null): Date | null {
  if (!nuevaFecha) {
    return null;
  }

  const fecha = new Date(nuevaFecha);
  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

export function normalizarHoraCorreccion(
  value: string,
  baseFecha: Date
): Date | null {
  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) {
    return asDate;
  }

  const [horasStr, minutosStr] = value.split(':');
  const horas = Number(horasStr);
  const minutos = Number(minutosStr);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) {
    return null;
  }

  const resultado = new Date(baseFecha);
  resultado.setHours(horas, minutos, 0, 0);
  return resultado;
}

export async function aplicarCorreccionFichaje({
  fichajeId,
  payload,
  motivoEdicion,
  usuarioId,
}: {
  fichajeId: string;
  payload: CorreccionFichajePayload;
  motivoEdicion: string;
  usuarioId: string;
}): Promise<void> {
  const fichaje = await prisma.fichaje.findUnique({
    where: { id: fichajeId },
    include: {
      eventos: {
        orderBy: { hora: 'desc' },
        take: 1,
      },
    },
  });

  if (!fichaje) {
    throw new Error(`Fichaje ${fichajeId} no encontrado`);
  }

  const eventoObjetivo = fichaje.eventos.at(0);
  if (!eventoObjetivo) {
    throw new Error('El fichaje no tiene eventos registrados para corregir');
  }

  const fechaActualizada = normalizarFechaCorreccion(payload.nuevaFecha);
  if (fechaActualizada) {
    await prisma.fichaje.update({
      where: { id: fichajeId },
      data: { fecha: fechaActualizada },
    });
  }

  if (payload.nuevaHora) {
    const baseFecha = fechaActualizada ?? fichaje.fecha;
    const nuevaHora = normalizarHoraCorreccion(payload.nuevaHora, baseFecha);

    if (!nuevaHora) {
      throw new Error('Formato de hora inválido');
    }

    await prisma.fichajeEvento.update({
      where: { id: eventoObjetivo.id },
      data: {
        hora: nuevaHora,
        editado: true,
        motivoEdicion,
        editadoPor: usuarioId,
        horaOriginal: eventoObjetivo.horaOriginal ?? eventoObjetivo.hora,
      },
    });
  }

  await actualizarCalculosFichaje(fichajeId);
}

