// ========================================
// API: Promedios de Fichajes
// ========================================
// Calcula hora media de entrada, salida y jornada promedio

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { EstadoFichaje, UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

// GET /api/fichajes/promedios - Obtener promedios de fichajes
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const empleadoId = searchParams.get('empleadoId');
    const diasStr = searchParams.get('dias') || '30'; // Últimos 30 días por defecto

    if (!empleadoId) {
      return badRequestResponse('empleadoId es requerido');
    }

    // Verificar acceso
    if (session.user.rol === UsuarioRol.empleado && empleadoId !== session.user.empleadoId) {
      return badRequestResponse('No autorizado');
    }

    const dias = parseInt(diasStr);
    const fechaDesde = new Date();
    fechaDesde.setDate(fechaDesde.getDate() - dias);
    fechaDesde.setHours(0, 0, 0, 0);

    // Obtener fichajes del período
    const fichajes = await prisma.fichaje.findMany({
      where: {
        empleadoId,
        fecha: {
          gte: fechaDesde,
        },
        estado: EstadoFichaje.finalizado,
      },
      include: {
        eventos: {
          orderBy: {
            hora: 'asc',
          },
        },
      },
    });

    if (fichajes.length === 0) {
      return successResponse({
        horaMediaEntrada: null,
        horaMediaSalida: null,
        horasPromedio: 0,
        fichajesAnalizados: 0,
      });
    }

    // Calcular promedios
    let sumaMinutosEntrada = 0;
    let sumaMinutosSalida = 0;
    let sumaHorasTrabajadas = 0;
    let fichajesConEntrada = 0;
    let fichajesConSalida = 0;

    for (const fichaje of fichajes) {
      const entrada = fichaje.eventos.find((e) => e.tipo === 'entrada');
      const salida = fichaje.eventos.find((e) => e.tipo === 'salida');

      if (entrada) {
        const horaEntrada = new Date(entrada.hora);
        const minutosDesdeMedianoche = horaEntrada.getHours() * 60 + horaEntrada.getMinutes();
        sumaMinutosEntrada += minutosDesdeMedianoche;
        fichajesConEntrada++;
      }

      if (salida) {
        const horaSalida = new Date(salida.hora);
        const minutosDesdeMedianoche = horaSalida.getHours() * 60 + horaSalida.getMinutes();
        sumaMinutosSalida += minutosDesdeMedianoche;
        fichajesConSalida++;
      }

      if (fichaje.horasTrabajadas) {
        sumaHorasTrabajadas += Number(fichaje.horasTrabajadas);
      }
    }

    // Calcular promedios
    const minutosPromedioEntrada = fichajesConEntrada > 0 ? Math.round(sumaMinutosEntrada / fichajesConEntrada) : 0;
    const minutosPromedioSalida = fichajesConSalida > 0 ? Math.round(sumaMinutosSalida / fichajesConSalida) : 0;
    const horasPromedio = fichajes.length > 0 ? Math.round((sumaHorasTrabajadas / fichajes.length) * 10) / 10 : 0;

    // Convertir minutos a formato HH:mm
    const formatearMinutos = (minutos: number): string => {
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const horaMediaEntrada = fichajesConEntrada > 0 ? formatearMinutos(minutosPromedioEntrada) : null;
    const horaMediaSalida = fichajesConSalida > 0 ? formatearMinutos(minutosPromedioSalida) : null;

    console.info(`[Promedios Fichajes] ${empleadoId}: Entrada ${horaMediaEntrada}, Salida ${horaMediaSalida}, Promedio ${horasPromedio}h`);

    return successResponse({
      horaMediaEntrada,
      horaMediaSalida,
      horasPromedio,
      fichajesAnalizados: fichajes.length,
      periodoAnalizado: `Últimos ${dias} días`,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes/promedios');
  }
}


