// ========================================
// API Route: /api/festivos/importar
// POST - Importar festivos desde archivo (.ics o .csv)
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { parseFestivosDesdeArchivo } from '@/lib/festivos/importar-desde-archivo';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

function buildDate(fecha: string): Date {
  // Asegurar zona horaria UTC para evitar desfases
  return new Date(`${fecha}T00:00:00.000Z`);
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    if (session.user.rol !== UsuarioRol.hr_admin) {
      return badRequestResponse('No tienes permisos para importar festivos');
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return badRequestResponse('Archivo inválido');
    }

    if (file.size === 0) {
      return badRequestResponse('El archivo está vacío');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return badRequestResponse('El archivo supera el tamaño máximo permitido (2MB)');
    }

    const arrayBuffer = await file.arrayBuffer();
    const contenido = Buffer.from(arrayBuffer).toString('utf-8');

    let festivosArchivo;
    try {
      festivosArchivo = parseFestivosDesdeArchivo(file.name || 'festivos.csv', file.type, contenido);
    } catch (error) {
      return badRequestResponse(error instanceof Error ? error.message : 'Archivo inválido');
    }

    if (!festivosArchivo.length) {
      return badRequestResponse('No se detectaron festivos válidos en el archivo');
    }

    const { importados, actualizados, errores } = await prisma.$transaction(async (tx) => {
      let creados = 0;
      let updates = 0;
      let failed = 0;

      for (const festivo of festivosArchivo) {
        try {
          const resultado = await tx.festivo.upsert({
            where: {
              empresaId_fecha: {
                empresaId: session.user.empresaId,
                fecha: buildDate(festivo.fecha),
              },
            },
            update: {
              nombre: festivo.nombre,
              activo: festivo.activo ?? true,
              tipo: 'empresa',
              origen: 'upload',
            },
            create: {
              empresaId: session.user.empresaId,
              fecha: buildDate(festivo.fecha),
              nombre: festivo.nombre,
              tipo: 'empresa',
              origen: 'upload',
              activo: festivo.activo ?? true,
            },
          });

          if (resultado.createdAt.getTime() === resultado.updatedAt.getTime()) {
            creados++;
          } else {
            updates++;
          }
        } catch (error) {
          console.error('[Festivos][Importar Archivo] Error importando festivo:', error);
          failed++;
        }
      }

      return { importados: creados, actualizados: updates, errores: failed };
    });

    return successResponse({
      message: 'Importación de calendario completada',
      procesados: festivosArchivo.length,
      importados,
      actualizados,
      errores,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/festivos/importar');
  }
}




