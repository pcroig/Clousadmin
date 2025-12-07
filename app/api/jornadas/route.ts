// ========================================
// API Jornadas - GET, POST
// ========================================

import { NextRequest } from 'next/server';

import {
  createdResponse,
  handleApiError,
  requireAuthAsHR,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { obtenerEtiquetaJornada } from '@/lib/jornadas/helpers';
import { prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { jornadaCreateSchema } from '@/lib/validaciones/schemas';

import type { JornadaConfig } from '@/lib/calculos/fichajes-helpers';

// GET /api/jornadas - Listar jornadas (solo HR Admin)
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Obtener jornadas de la empresa
    const jornadas = await prisma.jornadas.findMany({
      where: {
        empresaId: session.user.empresaId,
        activa: true,
      },
      orderBy: {
        createdAt: 'asc', // Order by creation date since 'nombre' no longer exists
      },
      include: {
        _count: {
          select: {
            empleados: true,
          },
        },
        empleados: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            fotoUrl: true,
          },
          take: 10, // Limitar para performance
          where: {
            activo: true,
          },
        },
      },
    });

    // Generate 'nombre' field for backward compatibility and add empleadosPreview
    const jornadasConNombre = jornadas.map((jornada) => ({
      ...jornada,
      nombre: obtenerEtiquetaJornada({
        id: jornada.id,
        horasSemanales: Number(jornada.horasSemanales),
        config: jornada.config as JornadaConfig | null,
      }),
      empleadosPreview: jornada.empleados, // Para mostrar avatares apilados
    }));

    return successResponse(jornadasConNombre);
  } catch (error) {
    return handleApiError(error, 'API GET /api/jornadas');
  }
}

// POST /api/jornadas - Crear nueva jornada (solo HR Admin)
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body (sin empresaId, se usa el de la sesión)
    const schemaSinEmpresaId = jornadaCreateSchema.omit({ empresaId: true });
    const validationResult = await validateRequest(req, schemaSinEmpresaId);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Usar empresaId de la sesión (más seguro)
    const empresaId = session.user.empresaId;

    // Crear configuración por defecto si no se proporciona
    let config: JornadaConfig;
    if (validatedData.config) {
      config = { ...(validatedData.config as JornadaConfig) };
    } else if (validatedData.tipo === 'fija') {
      // Configuración por defecto: L-V 9:00-18:00 con 1h pausa
      config = {
        lunes: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '14:00', pausa_fin: '15:00' },
        martes: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '14:00', pausa_fin: '15:00' },
        miercoles: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '14:00', pausa_fin: '15:00' },
        jueves: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '14:00', pausa_fin: '15:00' },
        viernes: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '14:00', pausa_fin: '15:00' },
        sabado: { activo: false },
        domingo: { activo: false },
      };
    } else {
      // Jornada flexible: todos los días activos
      config = {
        lunes: { activo: true },
        martes: { activo: true },
        miercoles: { activo: true },
        jueves: { activo: true },
        viernes: { activo: true },
        sabado: { activo: false },
        domingo: { activo: false },
      };
    }

    // NOTE: limiteInferior and limiteSuperior are NO LONGER stored per-jornada
    // They are now global in Empresa.config (limiteInferiorFichaje/limiteSuperiorFichaje)

    // Añadir tipo al config si se proporciona (para referencia)
    if (validatedData.tipo) {
      config.tipo = validatedData.tipo;
    }

    // Validar que no haya jornada duplicada asignada al mismo nivel
    // (esto se validará al asignar, pero es bueno tenerlo aquí también)

    // Crear jornada (without 'nombre' field)
    const jornada = await prisma.jornadas.create({
      data: {
        empresaId: empresaId,
        horasSemanales: validatedData.horasSemanales,
        config: asJsonValue(config),
        esPredefinida: false,
        activa: true,
      },
    });

    return createdResponse(jornada);
  } catch (error) {
    return handleApiError(error, 'API POST /api/jornadas');
  }
}

