// ========================================
// Onboarding - Employee Onboarding Utilities
// ========================================
// Manages the multi-step onboarding process for new employees

import { prisma, Prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { encryptEmpleadoData } from '@/lib/empleado-crypto';
import { validarDocumentosRequeridosCompletos } from '@/lib/documentos/onboarding';
import { obtenerOnboardingConfig } from '@/lib/onboarding-config';

/**
 * Helper function to safely convert values to Prisma JSON input
 */
function toJsonValue<T extends Record<string, any>>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

/**
 * Progreso del onboarding
 */
export interface ProgresoOnboarding {
  datos_personales: boolean;
  datos_bancarios: boolean;
  datos_documentos: boolean;
}

/**
 * Datos temporales almacenados durante el onboarding
 */
export interface DatosTemporales {
  datos_personales?: {
    nif: string;
    nss: string;
    telefono: string;
    direccionCalle: string;
    direccionNumero: string;
    direccionPiso?: string;
    codigoPostal: string;
    ciudad: string;
    direccionProvincia: string;
    estadoCivil?: string;
    numeroHijos?: number;
  };
  datos_bancarios?: {
    iban: string;
    titularCuenta: string;
  };
  datos_documentos?: {
    documentosSubidos: string[]; // Array de IDs de documentos
  };
}

/**
 * Tipos de retorno para crearOnboarding
 */
type CrearOnboardingSuccess = {
  success: true;
  token: string;
  url: string;
  onboarding: any;
};

type CrearOnboardingError = {
  success: false;
  error: string;
};

export type CrearOnboardingResult = CrearOnboardingSuccess | CrearOnboardingError;

/**
 * Crear registro de onboarding para un empleado
 */
export async function crearOnboarding(
  empleadoId: string,
  empresaId: string
): Promise<CrearOnboardingResult> {
  try {
    // Verificar si ya existe un onboarding activo
    const onboardingExistente = await prisma.onboardingEmpleado.findUnique({
      where: { empleadoId },
    });

    if (onboardingExistente && !onboardingExistente.completado) {
      // Si existe y no está completado, eliminar para crear uno nuevo
      await prisma.onboardingEmpleado.delete({
        where: { id: onboardingExistente.id },
      });
    }

    // Generar token único
    const token = randomBytes(32).toString('hex');
    const tokenExpira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const onboarding = await prisma.onboardingEmpleado.create({
      data: {
        empresaId,
        empleadoId,
        token,
        tokenExpira,
        progreso: {
          datos_personales: false,
          datos_bancarios: false,
          datos_documentos: false,
        },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/onboarding/${token}`;

    return {
      success: true,
      token,
      url,
      onboarding,
    };
  } catch (error) {
    console.error('[crearOnboarding] Error:', error);
    return {
      success: false,
      error: 'Error al crear el onboarding',
    };
  }
}

/**
 * Verificar si un token de onboarding es válido
 */
export async function verificarTokenOnboarding(token: string) {
  try {
    const onboarding = await prisma.onboardingEmpleado.findUnique({
      where: { token },
      include: {
        empleado: {
          include: {
            usuario: true,
          },
        },
        empresa: true,
      },
    });

    if (!onboarding) {
      return { valido: false, error: 'Token de onboarding no encontrado' };
    }

    if (onboarding.completado) {
      return { valido: false, error: 'Onboarding ya completado' };
    }

    if (new Date() > onboarding.tokenExpira) {
      return { valido: false, error: 'Token expirado' };
    }

    return { valido: true, onboarding };
  } catch (error) {
    console.error('[verificarTokenOnboarding] Error:', error);
    return {
      valido: false,
      error: 'Error al verificar el token',
    };
  }
}

/**
 * Guardar datos personales (Paso 1)
 */
export async function guardarDatosPersonales(
  token: string,
  datos: DatosTemporales['datos_personales']
) {
  try {
    // Verificar token
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return {
        success: false,
        error: verificacion.error || 'Token inválido',
      };
    }

    const { onboarding } = verificacion;

    // Obtener datos temporales actuales
    const datosTemporalesActuales = (onboarding.datosTemporales as unknown as DatosTemporales) || {};
    const progresoActual = onboarding.progreso as unknown as ProgresoOnboarding;

    // Actualizar con los nuevos datos personales
    const datosTemporalesNuevos: DatosTemporales = {
      ...datosTemporalesActuales,
      datos_personales: datos,
    };

    const progresoNuevo: ProgresoOnboarding = {
      ...progresoActual,
      datos_personales: true,
    };

    // Guardar en la base de datos
    await prisma.onboardingEmpleado.update({
      where: { id: onboarding.id },
      data: {
        datosTemporales: toJsonValue(datosTemporalesNuevos),
        progreso: toJsonValue(progresoNuevo),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[guardarDatosPersonales] Error:', error);
    return {
      success: false,
      error: 'Error al guardar datos personales',
    };
  }
}

/**
 * Guardar datos bancarios (Paso 2)
 */
export async function guardarDatosBancarios(
  token: string,
  datos: DatosTemporales['datos_bancarios']
) {
  try {
    // Verificar token
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return {
        success: false,
        error: verificacion.error || 'Token inválido',
      };
    }

    const { onboarding } = verificacion;

    // Obtener datos temporales actuales
    const datosTemporalesActuales = (onboarding.datosTemporales as unknown as DatosTemporales) || {};
    const progresoActual = onboarding.progreso as unknown as ProgresoOnboarding;

    // Actualizar con los nuevos datos bancarios
    const datosTemporalesNuevos: DatosTemporales = {
      ...datosTemporalesActuales,
      datos_bancarios: datos,
    };

    const progresoNuevo: ProgresoOnboarding = {
      ...progresoActual,
      datos_bancarios: true,
    };

    // Guardar en la base de datos
    await prisma.onboardingEmpleado.update({
      where: { id: onboarding.id },
      data: {
        datosTemporales: toJsonValue(datosTemporalesNuevos),
        progreso: toJsonValue(progresoNuevo),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[guardarDatosBancarios] Error:', error);
    return {
      success: false,
      error: 'Error al guardar datos bancarios',
    };
  }
}

/**
 * Guardar progreso de documentos (Paso 3)
 * Actualiza el progreso cuando se suben documentos
 */
export async function guardarProgresoDocumentos(token: string) {
  try {
    // Verificar token
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return {
        success: false,
        error: verificacion.error || 'Token inválido',
      };
    }

    const { onboarding } = verificacion;
    const progresoActual = onboarding.progreso as unknown as ProgresoOnboarding;

    // Actualizar progreso de documentos
    const progresoNuevo: ProgresoOnboarding = {
      ...progresoActual,
      datos_documentos: true,
    };

    // Guardar en la base de datos
    await prisma.onboardingEmpleado.update({
      where: { id: onboarding.id },
      data: {
        progreso: toJsonValue(progresoNuevo),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[guardarProgresoDocumentos] Error:', error);
    return {
      success: false,
      error: 'Error al guardar progreso de documentos',
    };
  }
}

/**
 * Finalizar onboarding - Traspasar datos temporales a Empleado
 */
export async function finalizarOnboarding(token: string) {
  try {
    // Verificar token
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return {
        success: false,
        error: verificacion.error || 'Token inválido',
      };
    }

    const { onboarding } = verificacion;

    // Validar que todos los pasos estén completados
    const progreso = onboarding.progreso as unknown as ProgresoOnboarding;
    if (!progreso.datos_personales || !progreso.datos_bancarios) {
      return {
        success: false,
        error: 'Faltan pasos por completar (datos personales o bancarios)',
      };
    }

    // Obtener datos temporales
    const datosTemporales = onboarding.datosTemporales as unknown as DatosTemporales;
    if (!datosTemporales.datos_personales || !datosTemporales.datos_bancarios) {
      return {
        success: false,
        error: 'Datos incompletos',
      };
    }

    // Validar documentos requeridos (solo si hay documentos requeridos configurados)
    const configResult = await obtenerOnboardingConfig(onboarding.empresaId);
    if (configResult.success && configResult.config) {
      const documentosRequeridos = configResult.config.documentosRequeridos;
      
      // Si hay documentos requeridos, validar que todos estén completos
      if (documentosRequeridos && Array.isArray(documentosRequeridos) && documentosRequeridos.length > 0) {
        // Solo validar documentos que son requeridos (requerido: true)
        const docsRequeridos = documentosRequeridos.filter((d: any) => d.requerido === true);
        
        if (docsRequeridos.length > 0) {
          const validacionDocs = await validarDocumentosRequeridosCompletos(
            onboarding.empresaId,
            onboarding.empleadoId,
            docsRequeridos
          );

          if (validacionDocs.success && !validacionDocs.completo) {
            const docsFaltantes = validacionDocs.documentosFaltantes || [];
            const nombresDocsFaltantes = docsFaltantes.map((d) => d.nombre).join(', ');
            return {
              success: false,
              error: `Faltan documentos requeridos: ${nombresDocsFaltantes}`,
            };
          }
        }
      }
    }

    const { datos_personales, datos_bancarios } = datosTemporales;

    // Preparar datos del empleado
    const datosEmpleado = {
      // Datos personales
      nif: datos_personales.nif,
      nss: datos_personales.nss,
      telefono: datos_personales.telefono,
      direccionCalle: datos_personales.direccionCalle,
      direccionNumero: datos_personales.direccionNumero,
      direccionPiso: datos_personales.direccionPiso,
      codigoPostal: datos_personales.codigoPostal,
      ciudad: datos_personales.ciudad,
      direccionProvincia: datos_personales.direccionProvincia,
      estadoCivil: datos_personales.estadoCivil,
      numeroHijos: datos_personales.numeroHijos || 0,

      // Datos bancarios
      iban: datos_bancarios.iban,
      titularCuenta: datos_bancarios.titularCuenta,

      // Marcar onboarding completo
      onboardingCompletado: true,
      onboardingCompletadoEn: new Date(),
    };

    // Encriptar campos sensibles antes de guardar
    const datosEmpleadoEncriptados = encryptEmpleadoData(datosEmpleado);

    // Traspasar datos encriptados a Empleado
    await prisma.empleado.update({
      where: { id: onboarding.empleadoId },
      data: datosEmpleadoEncriptados,
    });

    // Marcar onboarding como completado
    await prisma.onboardingEmpleado.update({
      where: { id: onboarding.id },
      data: {
        completado: true,
        fechaCompletado: new Date(),
      },
    });

    // Crear notificación para HR
    await crearNotificacionOnboarding(
      onboarding.empleadoId,
      onboarding.empresaId
    );

    console.log(
      `[finalizarOnboarding] Onboarding completado para empleado ${onboarding.empleadoId}`
    );

    return {
      success: true,
      empleadoId: onboarding.empleadoId,
    };
  } catch (error) {
    console.error('[finalizarOnboarding] Error:', error);
    return {
      success: false,
      error: 'Error al finalizar el onboarding',
    };
  }
}

/**
 * Crear notificación para HR cuando se completa el onboarding
 */
export async function crearNotificacionOnboarding(
  empleadoId: string,
  empresaId: string
) {
  try {
    // Obtener empleado
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: {
        nombre: true,
        apellidos: true,
      },
    });

    if (!empleado) {
      console.error('[crearNotificacionOnboarding] Empleado no encontrado');
      return;
    }

    // Obtener usuarios HR de la empresa
    const usuariosHR = await prisma.usuario.findMany({
      where: {
        empresaId,
        rol: 'hr_admin',
        activo: true,
      },
      select: {
        id: true,
      },
    });

    // Crear notificaciones para todos los HR admins
    const notificaciones = usuariosHR.map((usuario) => ({
      empresaId,
      usuarioId: usuario.id,
      tipo: 'onboarding_completado',
      titulo: 'Onboarding completado',
      mensaje: `${empleado.nombre} ${empleado.apellidos} ha completado su onboarding`,
      metadata: {
        empleadoId,
        accionUrl: `/hr/organizacion/personas/${empleadoId}`,
      },
      leida: false,
    }));

    await prisma.notificacion.createMany({
      data: notificaciones,
    });

    console.log(
      `[crearNotificacionOnboarding] Notificaciones creadas para ${usuariosHR.length} HR admins`
    );
  } catch (error) {
    console.error('[crearNotificacionOnboarding] Error:', error);
  }
}

/**
 * Obtener onboarding de un empleado
 */
export async function obtenerOnboardingPorEmpleado(empleadoId: string) {
  try {
    const onboarding = await prisma.onboardingEmpleado.findUnique({
      where: { empleadoId },
      include: {
        empleado: true,
        empresa: true,
      },
    });

    return onboarding;
  } catch (error) {
    console.error('[obtenerOnboardingPorEmpleado] Error:', error);
    return null;
  }
}

