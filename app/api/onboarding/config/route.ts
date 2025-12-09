// ========================================
// API Route: Onboarding Config - GET/PUT
// ========================================
// Manage workflow configuration for employee onboarding

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import type { WorkflowAccion } from '@/lib/onboarding-config-types';
import { validarWorkflowAccion, CAMPOS_DISPONIBLES } from '@/lib/onboarding-config-types';
import { prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { UsuarioRol } from '@/lib/constants/enums';

/**
 * Genera el workflow predeterminado para nuevas empresas
 */
async function generarWorkflowPredeterminado(empresaId: string): Promise<WorkflowAccion[]> {
  // Buscar o crear carpeta "Otros"
  let carpetaOtros = await prisma.carpetas.findFirst({
    where: {
      empresaId,
      nombre: 'Otros',
      esSistema: true,
      empleadoId: null,
    },
  });

  if (!carpetaOtros) {
    carpetaOtros = await prisma.carpetas.create({
      data: {
        empresaId,
        nombre: 'Otros',
        esSistema: true,
        compartida: true,
      },
    });
  }

  const timestamp = Date.now();
  const workflowPredeterminado: WorkflowAccion[] = [
    {
      id: `default-${timestamp}-1`,
      orden: 0,
      tipo: 'rellenar_campos',
      titulo: 'Datos Básicos',
      activo: true,
      config: {
        campos: CAMPOS_DISPONIBLES.map(c => c.id),
      },
    },
    {
      id: `default-${timestamp}-2`,
      orden: 1,
      tipo: 'solicitar_docs',
      titulo: 'Solicitar Documentos',
      activo: true,
      config: {
        documentosRequeridos: [
          {
            id: `doc-${timestamp}`,
            nombre: 'DNI',
            requerido: true,
            carpetaDestinoId: carpetaOtros.id,
          },
        ],
      },
    },
  ];

  return workflowPredeterminado;
}

/**
 * GET /api/onboarding/config
 * Obtener workflow configurado para la empresa
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getSession();
    if (!session || !session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea HR o Admin
    if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.platform_admin) {
      return NextResponse.json({ error: 'Solo HR o Administrador puede acceder' }, { status: 403 });
    }

    // Obtener config de onboarding
    const config = await prisma.onboarding_configs.findUnique({
      where: { empresaId: session.user.empresaId },
      select: { workflowAcciones: true },
    });

    console.log('[GET /api/onboarding/config] Config encontrada:', {
      exists: !!config,
      workflowAcciones: config?.workflowAcciones,
      type: typeof config?.workflowAcciones,
      isArray: Array.isArray(config?.workflowAcciones),
    });

    // Si no existe config o está vacía, generar workflow predeterminado
    if (!config || !config.workflowAcciones) {
      console.log('[GET /api/onboarding/config] Generando workflow predeterminado (config null)');
      const workflowPredeterminado = await generarWorkflowPredeterminado(session.user.empresaId);
      return NextResponse.json({ workflowAcciones: workflowPredeterminado });
    }

    const workflowAcciones = config.workflowAcciones as unknown as WorkflowAccion[];

    // Si el workflow está vacío, retornar el predeterminado
    if (!Array.isArray(workflowAcciones) || workflowAcciones.length === 0) {
      console.log('[GET /api/onboarding/config] Generando workflow predeterminado (array vacío)');
      const workflowPredeterminado = await generarWorkflowPredeterminado(session.user.empresaId);
      return NextResponse.json({ workflowAcciones: workflowPredeterminado });
    }

    console.log('[GET /api/onboarding/config] Retornando workflow existente:', workflowAcciones.length, 'acciones');
    return NextResponse.json({
      workflowAcciones,
    });
  } catch (error) {
    console.error('[GET /api/onboarding/config] Error:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

/**
 * PUT /api/onboarding/config
 * Guardar workflow actualizado
 */
export async function PUT(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getSession();
    if (!session || !session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea HR o Admin
    if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.platform_admin) {
      return NextResponse.json({ error: 'Solo HR o Administrador puede modificar' }, { status: 403 });
    }

    // Parsear body
    const body = (await req.json()) as { workflowAcciones?: WorkflowAccion[] };
    const { workflowAcciones } = body;

    // Validar que sea array
    if (!Array.isArray(workflowAcciones)) {
      return NextResponse.json({ error: 'workflowAcciones debe ser un array' }, { status: 400 });
    }

    // Validar cada acción
    for (let i = 0; i < workflowAcciones.length; i++) {
      const accion = workflowAcciones[i];
      const esValido = validarWorkflowAccion(accion);
      if (!esValido) {
        console.error(`[PUT /api/onboarding/config] Acción inválida en índice ${i}:`, JSON.stringify(accion, null, 2));
        return NextResponse.json(
          { error: `Acción inválida en posición ${i + 1}: verifica que todos los campos estén completos` },
          { status: 400 }
        );
      }
    }

    // Verificar si existe config de onboarding, si no, crearla
    const configExistente = await prisma.onboarding_configs.findUnique({
      where: { empresaId: session.user.empresaId },
    });

    if (!configExistente) {
      // Crear config nueva con workflow
      await prisma.onboarding_configs.create({
        data: {
          empresaId: session.user.empresaId,
          workflowAcciones: asJsonValue(workflowAcciones),
          camposRequeridos: asJsonValue({}),
          documentosRequeridos: asJsonValue([]),
          plantillasDocumentos: asJsonValue([]),
        },
      });
    } else {
      // Actualizar config existente
      await prisma.onboarding_configs.update({
        where: { empresaId: session.user.empresaId },
        data: {
          workflowAcciones: asJsonValue(workflowAcciones),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PUT /api/onboarding/config] Error:', error);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}
