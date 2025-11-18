import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsHR, handleApiError } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { decryptEmpleadoData } from '@/lib/empleado-crypto';
import { logAccesoSensibles, obtenerLogAuditoria } from '@/lib/auditoria';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { session } = authResult;

    const empleado = await prisma.empleado.findFirst({
      where: {
        id: params.id,
        empresaId: session.user.empresaId,
      },
      include: {
        usuario: true,
        equipos: {
          include: {
            equipo: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
        ausencias: {
          select: {
            id: true,
            tipo: true,
            fechaInicio: true,
            fechaFin: true,
            diasLaborables: true,
            estado: true,
            motivo: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 100,
        },
        fichajes: {
          select: {
            id: true,
            fecha: true,
            estado: true,
            horasTrabajadas: true,
            eventos: {
              select: {
                id: true,
                tipo: true,
                hora: true,
                ubicacion: true,
              },
            },
          },
          orderBy: {
            fecha: 'desc',
          },
          take: 60,
        },
        documentos: {
          select: {
            id: true,
            nombre: true,
            tipoDocumento: true,
            createdAt: true,
            carpetaId: true,
          },
          take: 200,
        },
        contratos: {
          select: {
            id: true,
            fechaInicio: true,
            fechaFin: true,
            tipoContrato: true,
            salarioBrutoAnual: true,
          },
          orderBy: {
            fechaInicio: 'desc',
          },
          take: 50,
        },
      },
    });

    if (!empleado) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }

    const empleadoDesencriptado = decryptEmpleadoData(empleado);
    const auditoria = await obtenerLogAuditoria(
      session.user.empresaId,
      empleado.id,
      { limite: 50 }
    );

    const payload = {
      metadata: {
        generatedAt: new Date().toISOString(),
        empresaId: session.user.empresaId,
        empleadoId: empleado.id,
      },
      empleado: {
        ...empleadoDesencriptado,
        salarioBrutoAnual: empleadoDesencriptado.salarioBrutoAnual
          ? Number(empleadoDesencriptado.salarioBrutoAnual)
          : null,
        salarioBrutoMensual: empleadoDesencriptado.salarioBrutoMensual
          ? Number(empleadoDesencriptado.salarioBrutoMensual)
          : null,
      },
      usuario: {
        id: empleado.usuario?.id ?? null,
        email: empleado.usuario?.email ?? null,
        rol: empleado.usuario?.rol ?? null,
        ultimoAcceso: empleado.usuario?.ultimoAcceso ?? null,
        activo: empleado.usuario?.activo ?? null,
      },
      equipos: empleado.equipos.map((eq) => ({
        id: eq.equipo.id,
        nombre: eq.equipo.nombre,
      })),
      ausencias: empleado.ausencias,
      fichajes: empleado.fichajes.map((f) => ({
        ...f,
        horasTrabajadas: f.horasTrabajadas ? Number(f.horasTrabajadas) : null,
      })),
      contratos: empleado.contratos.map((c) => ({
        ...c,
        salarioBrutoAnual: c.salarioBrutoAnual ? Number(c.salarioBrutoAnual) : null,
      })),
      documentos: empleado.documentos,
      auditoria,
    };

    await logAccesoSensibles({
      request,
      session,
      recurso: 'empleado',
      accion: 'exportacion',
      empleadoAccedidoId: empleado.id,
      camposAccedidos: ['perfil_completo'],
      motivo: 'derecho_acceso',
    });

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="empleado-${empleado.id}-export.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/[id]/export');
  }
}



