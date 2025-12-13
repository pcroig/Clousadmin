/**
 * ENDPOINT DE DIAGNÓSTICO
 * URL: GET /api/debug/fichajes
 *
 * Este endpoint verifica:
 * 1. Si hay sesión activa
 * 2. Qué datos devuelve la query
 * 3. Si el problema está en el backend o frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizarFechaSinHora } from '@/lib/utils/fechas';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  const diagnostico: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    url: req.url,
  };

  try {
    // 1. Verificar sesión
    diagnostico.paso1 = 'Verificando sesión...';
    const session = await getSession();

    if (!session || !session.user) {
      diagnostico.error = 'NO HAY SESIÓN ACTIVA';
      diagnostico.solucion = 'Cierra sesión, limpia cookies, e inicia sesión de nuevo';
      return NextResponse.json(diagnostico, { status: 401 });
    }

    diagnostico.sesion = {
      usuarioId: session.user.id,
      email: session.user.email,
      rol: session.user.rol,
      empresaId: session.user.empresaId,
      empleadoId: session.user.empleadoId,
    };

    // 2. Verificar empresa
    diagnostico.paso2 = 'Verificando empresa...';
    if (!session.user.empresaId) {
      diagnostico.error = 'LA SESIÓN NO TIENE EMPRESA_ID';
      diagnostico.solucion = 'Contacta con soporte - sesión corrupta';
      return NextResponse.json(diagnostico, { status: 400 });
    }

    const empresa = await prisma.empresas.findUnique({
      where: { id: session.user.empresaId },
      select: { id: true, nombre: true, activo: true },
    });

    diagnostico.empresa = empresa;

    // 3. Consultar fichajes (rango de esta semana)
    diagnostico.paso3 = 'Consultando fichajes...';

    const fechaInicio = normalizarFechaSinHora(new Date('2025-12-08'));
    const fechaFin = normalizarFechaSinHora(new Date('2025-12-14'));

    diagnostico.rangoConsultado = {
      inicio: fechaInicio.toISOString(),
      fin: fechaFin.toISOString(),
    };

    const fichajes = await prisma.fichajes.findMany({
      where: {
        empresaId: session.user.empresaId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
          },
        },
        eventos: true,
      },
      orderBy: { fecha: 'desc' },
      take: 10,
    });

    diagnostico.resultados = {
      total: fichajes.length,
      fichajes: fichajes.map(f => ({
        id: f.id.substring(0, 12) + '...',
        fecha: format(f.fecha, 'yyyy-MM-dd'),
        estado: f.estado,
        empleado: `${f.empleado.nombre} ${f.empleado.apellidos}`,
        eventos: f.eventos.length,
        horasTrabajadas: f.horasTrabajadas,
      })),
    };

    // 4. Conclusión
    if (fichajes.length === 0) {
      diagnostico.conclusion = '❌ NO SE ENCONTRARON FICHAJES EN EL RANGO';
      diagnostico.posiblesCausas = [
        'Los fichajes están en otra empresa',
        'Los fichajes están en otras fechas',
        'No existen fichajes para esta empresa',
      ];
    } else {
      diagnostico.conclusion = '✅ EL BACKEND FUNCIONA CORRECTAMENTE';
      diagnostico.mensaje = `Se encontraron ${fichajes.length} fichajes. Si no los ves en el frontend, el problema está en React o en el navegador.`;
      diagnostico.pasosSiguientes = [
        '1. Abre la consola del navegador (F12)',
        '2. Ve a Network',
        '3. Recarga la página',
        '4. Busca la request a /api/fichajes',
        '5. Verifica qué devuelve (debería tener data: [...])',
        '6. Si devuelve vacío, verifica los filtros (estado, equipo, búsqueda)',
      ];
    }

    return NextResponse.json(diagnostico, { status: 200 });

  } catch (error) {
    diagnostico.error = 'ERROR INESPERADO';
    diagnostico.detalles = error instanceof Error ? error.message : String(error);
    return NextResponse.json(diagnostico, { status: 500 });
  }
}
