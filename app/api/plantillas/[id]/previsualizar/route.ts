/**
 * API: /api/plantillas/[id]/previsualizar
 * GET: Generar una previsualización temporal para una plantilla y empleado
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import {
  type DatosEmpleado,
  extraerVariablesDePlantilla,
  resolverVariables,
} from '@/lib/plantillas';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/s3';

const PREVIEW_TTL_SECONDS = 60 * 10; // 10 minutos

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get('empleadoId');

    if (!empleadoId) {
      return NextResponse.json(
        { error: 'Debes indicar un empleado para previsualizar' },
        { status: 400 }
      );
    }

    // Await params en Next.js 15+
    const { id } = await params;

    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id },
      select: {
        id: true,
        empresaId: true,
        formato: true,
        nombre: true,
        s3Key: true,
      },
    });

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    if (plantilla.empresaId && plantilla.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const empleado = await prisma.empleado.findFirst({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            cif: true,
            email: true,
            telefono: true,
            direccion: true,
            web: true,
          },
        },
        jornada: {
          select: {
            nombre: true,
            horasSemanales: true,
          },
        },
        manager: {
          select: {
            nombre: true,
            apellidos: true,
            email: true,
          },
        },
        puestoRelacion: {
          select: {
            nombre: true,
            descripcion: true,
          },
        },
        contratos: {
          orderBy: { fechaInicio: 'desc' },
          take: 1,
          select: {
            id: true,
            tipoContrato: true,
            fechaInicio: true,
            fechaFin: true,
            salarioBrutoAnual: true,
          },
        },
        ausencias: {
          orderBy: { fechaInicio: 'desc' },
          take: 1,
          select: {
            id: true,
            tipo: true,
            fechaInicio: true,
            fechaFin: true,
            diasSolicitados: true,
            estado: true,
          },
        },
      },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado en tu empresa' },
        { status: 404 }
      );
    }

    if (plantilla.formato !== 'docx') {
      return NextResponse.json(
        { error: 'La previsualización solo está disponible para plantillas DOCX' },
        { status: 400 }
      );
    }

    const variables = await extraerVariablesDePlantilla(plantilla.s3Key);

    const empresaData = {
      id: empleado.empresa.id,
      nombre: empleado.empresa.nombre,
      cif: empleado.empresa.cif ?? undefined,
      email: empleado.empresa.email ?? undefined,
      telefono: empleado.empresa.telefono ?? undefined,
      direccion: empleado.empresa.direccion ?? undefined,
      web: empleado.empresa.web ?? undefined,
    };

    const empleadoData: DatosEmpleado = {
      id: empleado.id,
      nombre: empleado.nombre,
      apellidos: empleado.apellidos,
      email: empleado.email,
      nif: empleado.nif ?? undefined,
      nss: empleado.nss ?? undefined,
      telefono: empleado.telefono ?? undefined,
      fechaNacimiento: empleado.fechaNacimiento ?? undefined,
      direccionCalle: empleado.direccionCalle ?? undefined,
      direccionNumero: empleado.direccionNumero ?? undefined,
      direccionPiso: empleado.direccionPiso ?? undefined,
      codigoPostal: empleado.codigoPostal ?? undefined,
      ciudad: empleado.ciudad ?? undefined,
      direccionProvincia: empleado.direccionProvincia ?? undefined,
      estadoCivil: empleado.estadoCivil ?? undefined,
      numeroHijos: empleado.numeroHijos ?? undefined,
      genero: empleado.genero ?? undefined,
      iban: empleado.iban ?? undefined,
      titularCuenta: empleado.titularCuenta ?? undefined,
      puesto: empleado.puesto ?? undefined,
      fechaAlta: empleado.fechaAlta,
      fechaBaja: empleado.fechaBaja ?? undefined,
      tipoContrato: empleado.tipoContrato ?? undefined,
      salarioBrutoAnual: empleado.salarioBrutoAnual
        ? Number(empleado.salarioBrutoAnual)
        : undefined,
      salarioBrutoMensual: empleado.salarioBrutoMensual
        ? Number(empleado.salarioBrutoMensual)
        : undefined,
      empresa: empresaData,
      jornada: empleado.jornada
        ? {
            nombre: empleado.jornada.nombre,
            horasSemanales: Number(empleado.jornada.horasSemanales),
          }
        : undefined,
      manager: empleado.manager
        ? {
            nombre: empleado.manager.nombre,
            apellidos: empleado.manager.apellidos,
            email: empleado.manager.email,
          }
        : undefined,
      puestoRelacion: empleado.puestoRelacion
        ? {
            nombre: empleado.puestoRelacion.nombre,
            descripcion: empleado.puestoRelacion.descripcion ?? undefined,
          }
        : undefined,
      contratos: empleado.contratos?.map((contrato) => ({
        id: contrato.id,
        tipoContrato: contrato.tipoContrato,
        fechaInicio: contrato.fechaInicio,
        fechaFin: contrato.fechaFin ?? undefined,
        salarioBrutoAnual: contrato.salarioBrutoAnual
          ? Number(contrato.salarioBrutoAnual)
          : 0,
      })),
      ausencias: empleado.ausencias?.map((ausencia) => ({
        id: ausencia.id,
        tipo: ausencia.tipo,
        fechaInicio: ausencia.fechaInicio,
        fechaFin: ausencia.fechaFin,
        diasSolicitados: Number(ausencia.diasSolicitados),
        estado: ausencia.estado,
      })),
    };

    const valoresResueltos = await resolverVariables(variables, empleadoData);

    const previewUrl = await getSignedDownloadUrl(plantilla.s3Key, {
      expiresIn: PREVIEW_TTL_SECONDS,
    });
    const variablesConValor = Object.entries(valoresResueltos)
      .filter(([, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') {
          return value.trim().length > 0;
        }
        return String(value).trim().length > 0;
      })
      .map(([key]) => key);

    const variablesSinValor = Array.from(
      new Set(
        variables.filter((variable) => {
          const valor = valoresResueltos[variable];
          if (valor === null || valor === undefined) return true;
          if (typeof valor === 'string') {
            return valor.trim().length === 0;
          }
          return String(valor).trim().length === 0;
        })
      )
    );

    return NextResponse.json({
      success: true,
      previewUrl,
      variablesResueltas: valoresResueltos,
      variablesFaltantes: variablesSinValor, // compat legacy
      variablesConValor,
      variablesSinValor,
      totalVariables: variables.length,
    });
  } catch (error) {
    console.error('[API] Error al generar previsualización:', error);
    return NextResponse.json(
      {
        error: 'Error al generar previsualización',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

