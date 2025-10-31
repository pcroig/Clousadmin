// ========================================
// API Route: Ausencias
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { ausenciaCreateSchema } from '@/lib/validaciones/schemas';
import {
  calcularDias,
  validarSaldoSuficiente,
  actualizarSaldo,
} from '@/lib/calculos/ausencias';

// GET /api/ausencias - Listar ausencias
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');
    const empleadoId = searchParams.get('empleadoId');

    // Filtros base
    const where: any = {
      empresaId: session.user.empresaId,
    };

    // Filtrar por estado si se proporciona
    if (estado && estado !== 'todas') {
      where.estado = estado;
    }

    // Filtrar por empleado si se proporciona
    if (empleadoId) {
      where.empleadoId = empleadoId;
    }

    // Si es empleado, solo ver sus propias ausencias
    if (session.user.rol === 'empleado' && session.user.empleadoId) {
      where.empleadoId = session.user.empleadoId;
    }

    const ausencias = await prisma.ausencia.findMany({
      where,
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            puesto: true,
            fotoUrl: true,
          }
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(ausencias);
  } catch (error) {
    console.error('Error fetching ausencias:', error);
    return NextResponse.json(
      { error: 'Error al obtener ausencias' },
      { status: 500 }
    );
  }
}

// POST /api/ausencias - Crear solicitud de ausencia
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.user.empleadoId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = ausenciaCreateSchema.parse(body);

    // Convertir fechas a Date si son strings
    const fechaInicio = new Date(validatedData.fechaInicio);
    const fechaFin = new Date(validatedData.fechaFin);

    // Validar fechas
    if (fechaInicio > fechaFin) {
      return NextResponse.json(
        { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      );
    }

    // Calcular días (naturales, laborables, solicitados)
    const { diasNaturales, diasLaborables, diasSolicitados } = await calcularDias(
      fechaInicio,
      fechaFin,
      session.user.empresaId
    );

    // Aplicar medio día si corresponde
    const diasSolicitadosFinal = validatedData.medioDia
      ? diasSolicitados * 0.5
      : diasSolicitados;

    // Determinar si descuenta saldo según el tipo (solo vacaciones)
    const descuentaSaldo = validatedData.tipo === 'vacaciones';

    // Tipos que se auto-aprueban inmediatamente (enfermedad, maternidad, etc.)
    const tiposAutoAprobados = ['enfermedad', 'enfermedad_familiar', 'maternidad_paternidad'];
    const esAutoAprobada = tiposAutoAprobados.includes(validatedData.tipo);

    // Validar saldo si descuenta (solo vacaciones)
    if (descuentaSaldo) {
      const año = fechaInicio.getFullYear();
      const validacion = await validarSaldoSuficiente(
        session.user.empleadoId,
        año,
        diasSolicitadosFinal
      );

      if (!validacion.suficiente) {
        return NextResponse.json(
          { 
            error: validacion.mensaje,
            saldoDisponible: validacion.saldoActual,
            diasSolicitados: diasSolicitadosFinal
          },
          { status: 400 }
        );
      }
    }

    // Obtener equipoId del empleado si no se proporcionó
    let equipoId = validatedData.equipoId;
    if (!equipoId) {
      const empleadoEquipo = await prisma.empleadoEquipo.findFirst({
        where: { empleadoId: session.user.empleadoId },
        orderBy: { fechaIncorporacion: 'desc' },
      });
      equipoId = empleadoEquipo?.equipoId || undefined;
    }

    // Crear ausencia
    const ausencia = await prisma.ausencia.create({
      data: {
        empleadoId: session.user.empleadoId,
        empresaId: session.user.empresaId,
        equipoId,
        tipo: validatedData.tipo,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        medioDia: validatedData.medioDia || false,
        diasNaturales,
        diasLaborables,
        diasSolicitados: diasSolicitadosFinal,
        descripcion: validatedData.descripcion,
        motivo: validatedData.motivo,
        justificanteUrl: validatedData.justificanteUrl,
        descuentaSaldo: esAutoAprobada ? false : descuentaSaldo, // No descuenta saldo si es auto-aprobada
        diasIdeales: validatedData.diasIdeales ? JSON.parse(JSON.stringify(validatedData.diasIdeales)) : null,
        diasPrioritarios: validatedData.diasPrioritarios ? JSON.parse(JSON.stringify(validatedData.diasPrioritarios)) : null,
        diasAlternativos: validatedData.diasAlternativos ? JSON.parse(JSON.stringify(validatedData.diasAlternativos)) : null,
        estado: esAutoAprobada ? 'auto_aprobada' : 'pendiente_aprobacion',
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            puesto: true,
            fotoUrl: true,
          }
        }
      }
    });

    // Actualizar saldo si descuenta (solo para vacaciones)
    if (descuentaSaldo && !esAutoAprobada) {
      const año = fechaInicio.getFullYear();
      await actualizarSaldo(
        session.user.empleadoId,
        año,
        'solicitar',
        diasSolicitadosFinal
      );
    }

    // Crear notificación para HR/Manager (si requiere aprobación o informativa)
    if (esAutoAprobada) {
      // Notificación informativa para HR/Manager
      const usuariosHR = await prisma.usuario.findMany({
        where: {
          empresaId: session.user.empresaId,
          rol: { in: ['hr_admin', 'manager'] },
        },
        select: { id: true },
      });

      await Promise.all(
        usuariosHR.map((usr) =>
          prisma.notificacion.create({
            data: {
              usuarioId: usr.id,
              tipo: 'ausencia_auto_aprobada',
              titulo: 'Nueva ausencia auto-aprobada',
              mensaje: `${session.user.nombre} ${session.user.apellidos} ha solicitado ${validatedData.tipo} del ${fechaInicio.toLocaleDateString('es-ES')} al ${fechaFin.toLocaleDateString('es-ES')}`,
              metadata: {
                ausenciaId: ausencia.id,
                tipo: validatedData.tipo,
                empleadoId: session.user.empleadoId,
              } as any,
            },
          })
        )
      );
    } else {
      // Notificación pendiente de aprobación
      const usuariosHR = await prisma.usuario.findMany({
        where: {
          empresaId: session.user.empresaId,
          rol: { in: ['hr_admin', 'manager'] },
        },
        select: { id: true },
      });

      await Promise.all(
        usuariosHR.map((usr) =>
          prisma.notificacion.create({
            data: {
              usuarioId: usr.id,
              tipo: 'ausencia_pendiente',
              titulo: 'Nueva solicitud de ausencia',
              mensaje: `${session.user.nombre} ${session.user.apellidos} solicita ${validatedData.tipo}`,
              metadata: {
                ausenciaId: ausencia.id,
                tipo: validatedData.tipo,
                empleadoId: session.user.empleadoId,
              } as any,
            },
          })
        )
      );
    }

    return NextResponse.json(ausencia, { status: 201 });
  } catch (error) {
    console.error('Error creating ausencia:', error);

    // Manejar errores de validación Zod
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al crear ausencia' },
      { status: 500 }
    );
  }
}

