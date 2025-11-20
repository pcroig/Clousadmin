// ========================================
// API Route: Onboarding Config - Gestión de configuración de onboarding
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  obtenerOnboardingConfig,
  actualizarCamposRequeridos,
  actualizarDocumentosRequeridos,
  actualizarPlantillasDocumentos,
  type CamposRequeridos,
  type DocumentoRequerido,
  type PlantillaDocumento,
} from '@/lib/onboarding-config';
import { z } from 'zod';

import { UsuarioRol } from '@/lib/constants/enums';

// Schema de validación para campos requeridos
const camposRequeridosSchema = z.object({
  datos_personales: z.object({
    nif: z.boolean(),
    nss: z.boolean(),
    telefono: z.boolean(),
    direccionCalle: z.boolean(),
    direccionNumero: z.boolean(),
    direccionPiso: z.boolean(),
    codigoPostal: z.boolean(),
    ciudad: z.boolean(),
    direccionProvincia: z.boolean(),
    estadoCivil: z.boolean(),
    numeroHijos: z.boolean(),
  }),
  datos_bancarios: z.object({
    iban: z.boolean(),
    titularCuenta: z.boolean(),
  }),
});

// Schema de validación para documento requerido
const documentoRequeridoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().optional(),
  requerido: z.boolean(),
  requiereVisualizacion: z.boolean().optional().default(false),
  requiereFirma: z.boolean().optional().default(false),
  carpetaDestino: z.string().optional().nullable(),
});

// Schema de validación para plantilla de documento
const plantillaDocumentoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  s3Key: z.string(),
  tipoDocumento: z.string(),
  descripcion: z.string().optional(),
});

// GET /api/hr/onboarding-config - Obtener configuración de onboarding
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const resultado = await obtenerOnboardingConfig(session.user.empresaId);

    if (!resultado.success) {
      return NextResponse.json(
        { success: false, error: resultado.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      config: resultado.config,
    });
  } catch (error) {
    console.error('[GET /api/hr/onboarding-config] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH /api/hr/onboarding-config - Actualizar configuración de onboarding
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { tipo, data } = body;

    if (!tipo) {
      return NextResponse.json(
        { success: false, error: 'Tipo de actualización requerido' },
        { status: 400 }
      );
    }

    let resultado;

    switch (tipo) {
      case 'campos_requeridos': {
        const validacion = camposRequeridosSchema.safeParse(data);
        if (!validacion.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'Datos inválidos',
              details: validacion.error.flatten().fieldErrors,
            },
            { status: 400 }
          );
        }

        resultado = await actualizarCamposRequeridos(
          session.user.empresaId,
          validacion.data as CamposRequeridos
        );
        break;
      }

      case 'documentos_requeridos': {
        if (!Array.isArray(data)) {
          return NextResponse.json(
            { success: false, error: 'Datos inválidos: se esperaba un array' },
            { status: 400 }
          );
        }

        // Validar cada documento
        for (const doc of data) {
          const validacion = documentoRequeridoSchema.safeParse(doc);
          if (!validacion.success) {
            return NextResponse.json(
              {
                success: false,
                error: 'Documento inválido',
                details: validacion.error.flatten().fieldErrors,
              },
              { status: 400 }
            );
          }
        }

        resultado = await actualizarDocumentosRequeridos(
          session.user.empresaId,
          data as DocumentoRequerido[]
        );
        break;
      }

      case 'plantillas_documentos': {
        if (!Array.isArray(data)) {
          return NextResponse.json(
            { success: false, error: 'Datos inválidos: se esperaba un array' },
            { status: 400 }
          );
        }

        // Validar cada plantilla
        for (const plantilla of data) {
          const validacion = plantillaDocumentoSchema.safeParse(plantilla);
          if (!validacion.success) {
            return NextResponse.json(
              {
                success: false,
                error: 'Plantilla inválida',
                details: validacion.error.flatten().fieldErrors,
              },
              { status: 400 }
            );
          }
        }

        resultado = await actualizarPlantillasDocumentos(
          session.user.empresaId,
          data as PlantillaDocumento[]
        );
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de actualización no válido' },
          { status: 400 }
        );
    }

    if (!resultado.success) {
      return NextResponse.json(
        { success: false, error: resultado.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada correctamente',
      config: resultado.config,
    });
  } catch (error) {
    console.error('[PATCH /api/hr/onboarding-config] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

























