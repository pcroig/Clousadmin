// ========================================
// API Fichajes - GET, POST
// ========================================
// NUEVO MODELO: Fichaje = día completo, POST crea eventos dentro del fichaje

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validarEvento, validarLimitesJornada, calcularHorasTrabajadas, calcularTiempoEnPausa } from '@/lib/calculos/fichajes';
import { z } from 'zod';

const fichajeEventoCreateSchema = z.object({
  tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']),
  fecha: z.string().optional(), // Opcional, default hoy
  hora: z.string().optional(), // Opcional, default ahora
  ubicacion: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar sesión
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Obtener parámetros de query
    const searchParams = req.nextUrl.searchParams;
    const empleadoId = searchParams.get('empleadoId');
    const fecha = searchParams.get('fecha');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const estado = searchParams.get('estado');
    const propios = searchParams.get('propios');

    // 3. Construir filtros
    const where: any = {
      empresaId: session.user.empresaId,
    };

    // Filtrar por empleado
    if (empleadoId) {
      // Verificar permisos
      if (session.user.rol === 'empleado' && empleadoId !== session.user.empleadoId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      where.empleadoId = empleadoId;
    } else if (propios === '1' || propios === 'true') {
      // Forzar a devolver solo los fichajes del usuario autenticado (para widgets), independientemente del rol
      if (session.user.empleadoId) {
        where.empleadoId = session.user.empleadoId;
      } else {
        return NextResponse.json(
          { error: 'No tienes un empleado asignado. Contacta con HR.' },
          { status: 400 }
        );
      }
    } else if (session.user.rol === 'empleado') {
      // Empleados solo ven sus propios fichajes
      if (session.user.empleadoId) {
        where.empleadoId = session.user.empleadoId;
      } else {
        return NextResponse.json(
          { error: 'No tienes un empleado asignado. Contacta con HR.' },
          { status: 400 }
        );
      }
    }

    // Filtrar por fecha
    if (fecha) {
      // Crear fecha sin hora para evitar problemas de zona horaria
      const fechaParsed = new Date(fecha);
      const fechaSoloFecha = new Date(fechaParsed.getFullYear(), fechaParsed.getMonth(), fechaParsed.getDate());
      where.fecha = fechaSoloFecha;
    } else if (fechaInicio && fechaFin) {
      // Filtrar por rango
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      where.fecha = {
        gte: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()),
        lte: new Date(fin.getFullYear(), fin.getMonth(), fin.getDate()),
      };
    }

    // Filtrar por estado
    if (estado && estado !== 'todos') {
      where.estado = estado;
    }

    // 4. Obtener fichajes con sus eventos
    const fichajes = await prisma.fichaje.findMany({
      where,
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            puesto: true,
          },
        },
        eventos: {
          orderBy: {
            hora: 'asc',
          },
        },
      },
      orderBy: [
        { fecha: 'desc' },
      ],
      take: 500, // Límite para performance
    });

    return NextResponse.json(fichajes);
  } catch (error) {
    console.error('[API GET Fichajes]', error);
    
    // Mejorar logging de errores para diagnóstico
    if (error instanceof Error) {
      console.error('[API GET Fichajes] Mensaje:', error.message);
      console.error('[API GET Fichajes] Stack:', error.stack);
      
      // Error de Prisma
      if (error.message.includes('Prisma') || error.message.includes('prisma')) {
        return NextResponse.json(
          { 
            error: 'Error de conexión a la base de datos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            suggestion: 'Verifica que Prisma Client esté generado y la base de datos esté accesible'
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Error al obtener fichajes',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar sesión
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Validar body
    const body = await req.json();
    const validatedData = fichajeEventoCreateSchema.parse(body);

    // 3. Determinar fecha y hora
    const fechaBase = validatedData.fecha ? new Date(validatedData.fecha) : new Date();
    const fecha = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate());
    const hora = validatedData.hora ? new Date(validatedData.hora) : new Date();
    
    console.log('[POST Fichaje]', {
      tipo: validatedData.tipo,
      fecha: fecha.toISOString(),
      hora: hora.toISOString(),
    });

    // 4. Validar que el empleado puede fichar
    const empleadoId = session.user.empleadoId;
    
    if (!empleadoId) {
      return NextResponse.json(
        { error: 'No tienes un empleado asignado. Contacta con HR.' },
        { status: 400 }
      );
    }

    const validacion = await validarEvento(validatedData.tipo, empleadoId);

    if (!validacion.valido) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    // 5. Validar límites de jornada
    const validacionLimites = await validarLimitesJornada(empleadoId, hora);

    if (!validacionLimites.valido) {
      return NextResponse.json(
        { error: validacionLimites.error },
        { status: 400 }
      );
    }

    // 6. Buscar o crear fichaje del día
    let fichaje = await prisma.fichaje.findUnique({
      where: {
        empleadoId_fecha: {
          empleadoId,
          fecha,
        },
      },
      include: {
        eventos: true,
      },
    });

    if (!fichaje) {
      // Crear fichaje del día (solo si es entrada)
      if (validatedData.tipo !== 'entrada') {
        return NextResponse.json(
          { error: 'Debes iniciar la jornada primero (entrada)' },
          { status: 400 }
        );
      }

      fichaje = await prisma.fichaje.create({
        data: {
          empresaId: session.user.empresaId,
          empleadoId,
          fecha,
          estado: 'en_curso',
        },
        include: {
          eventos: true,
        },
      });

      console.log('[POST Fichaje] Fichaje creado:', fichaje.id);
    }

    // 7. Crear evento dentro del fichaje
    const evento = await prisma.fichajeEvento.create({
      data: {
        fichajeId: fichaje.id,
        tipo: validatedData.tipo,
        hora,
        ubicacion: validatedData.ubicacion,
      },
    });

    console.log('[POST Fichaje] Evento creado:', evento.id, evento.tipo);

    // 8. Actualizar cálculos del fichaje
    const todosEventos = [...fichaje.eventos, evento];
    const horasTrabajadas = calcularHorasTrabajadas(todosEventos);
    const horasEnPausa = calcularTiempoEnPausa(todosEventos);

    // 9. Si es salida manual, cambiar estado a finalizado solo si es fichaje completo manual
    let nuevoEstado = fichaje.estado;
    if (validatedData.tipo === 'salida' && !fichaje.autoCompletado) {
      // Verificar que tiene entrada
      const tieneEntrada = todosEventos.some(e => e.tipo === 'entrada');
      if (tieneEntrada) {
        nuevoEstado = 'finalizado';
      }
    }

    // 10. Actualizar fichaje con cálculos y estado
    const fichajeActualizado = await prisma.fichaje.update({
      where: { id: fichaje.id },
      data: {
        horasTrabajadas,
        horasEnPausa,
        estado: nuevoEstado,
      },
      include: {
        eventos: {
          orderBy: {
            hora: 'asc',
          },
        },
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
          },
        },
      },
    });

    return NextResponse.json(fichajeActualizado, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[API POST Fichajes]', error);
    return NextResponse.json(
      { error: 'Error al crear fichaje' },
      { status: 500 }
    );
  }
}
