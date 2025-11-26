// ========================================
// Onboarding - Employee Onboarding Utilities
// ========================================
// Manages the multi-step onboarding process for new employees

import { randomBytes } from 'crypto';

import { hashPassword } from '@/lib/auth';
import { validarDocumentosRequeridosCompletos } from '@/lib/documentos/onboarding';
import { getBaseUrl } from '@/lib/email';
import { encryptEmpleadoData } from '@/lib/empleado-crypto';
import { crearNotificacionOnboardingCompletado } from '@/lib/notificaciones';
import { obtenerOnboardingConfig } from '@/lib/onboarding-config';
import { prisma, Prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { uploadToS3 } from '@/lib/s3';

/**
 * Tipo de onboarding
 */
export type TipoOnboarding = 'completo' | 'simplificado';

/**
 * Progreso del onboarding completo (nuevos empleados)
 */
export interface ProgresoOnboardingCompleto {
  credenciales_completadas: boolean;
  datos_personales: boolean;
  datos_bancarios: boolean;
  datos_documentos: boolean;
  pwa_explicacion: boolean;
}

/**
 * Progreso del onboarding simplificado (empleados existentes)
 */
export interface ProgresoOnboardingSimplificado {
  credenciales_completadas: boolean;
  integraciones: boolean;
  pwa_explicacion: boolean;
}

/**
 * Union type para progreso de onboarding (soporta ambos tipos)
 */
export type ProgresoOnboarding = ProgresoOnboardingCompleto | ProgresoOnboardingSimplificado;

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
  credenciales?: {
    password: string; // Contraseña hasheada (no se almacena en datos temporales por seguridad)
    avatarUrl?: string; // URL del avatar si se sube
  };
}

/**
 * Tipos de retorno para crearOnboarding
 */
type CrearOnboardingSuccess = {
  success: true;
  token: string;
  url: string;
  onboarding: Record<string, unknown>;
};

type CrearOnboardingError = {
  success: false;
  error: string;
};

export type CrearOnboardingResult = CrearOnboardingSuccess | CrearOnboardingError;

/**
 * Crear registro de onboarding para un empleado
 */
export interface CrearOnboardingOptions {
  baseUrl?: string;
}

export async function crearOnboarding(
  empleadoId: string,
  empresaId: string,
  tipoOnboarding: TipoOnboarding = 'completo',
  options?: CrearOnboardingOptions
): Promise<CrearOnboardingResult> {
  try {
    // Generar token único antes de la transacción
    const token = randomBytes(32).toString('hex');
    const tokenExpira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // Usar transacción para evitar condiciones de carrera
    const onboarding = await prisma.$transaction(async (tx) => {
      // Verificar si ya existe un onboarding activo
      const onboardingExistente = await tx.onboardingEmpleado.findUnique({
        where: { empleadoId },
      });

      if (onboardingExistente && !onboardingExistente.completado) {
        // Si existe y no está completado, eliminar para crear uno nuevo
        await tx.onboardingEmpleado.delete({
          where: { id: onboardingExistente.id },
        });
      }

      // Definir progreso inicial según tipo de onboarding
      const progresoInicial = tipoOnboarding === 'completo'
        ? {
            credenciales_completadas: false,
            datos_personales: false,
            datos_bancarios: false,
            datos_documentos: false,
            pwa_explicacion: false,
          }
        : {
            credenciales_completadas: false,
            integraciones: false,
            pwa_explicacion: false,
          };

      return await tx.onboardingEmpleado.create({
        data: {
          empresaId,
          empleadoId,
          token,
          tokenExpira,
          tipoOnboarding,
          progreso: asJsonValue(progresoInicial),
        },
      });
    });

    const baseUrl = getBaseUrl(options?.baseUrl);
    const path = tipoOnboarding === 'completo' ? 'onboarding' : 'onboarding-simplificado';
    const url = `${baseUrl}/${path}/${token}`;

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
 * Guardar credenciales (Paso 0) - Avatar y contraseña
 */
export async function guardarCredenciales(
  token: string,
  password: string,
  avatarFile?: { buffer: Buffer; mimeType: string; filename: string }
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

    // Validar contraseña
    if (password.length < 8) {
      return {
        success: false,
        error: 'La contraseña debe tener al menos 8 caracteres',
      };
    }

    // Hash de contraseña
    const hashedPassword = await hashPassword(password);

    // Subir avatar si se proporciona
    let avatarUrl: string | undefined;
    if (avatarFile) {
      const timestamp = Date.now();
      const randomString = randomBytes(8).toString('hex');
      const fileExtension = avatarFile.filename.split('.').pop();
      const s3Key = `avatars/${onboarding.empresaId}/${onboarding.empleadoId}/${timestamp}-${randomString}.${fileExtension}`;
      
      avatarUrl = await uploadToS3(avatarFile.buffer, s3Key, avatarFile.mimeType);
    }

    // Actualizar usuario con contraseña (avatar se almacena solo en empleado.fotoUrl)
    await prisma.usuario.update({
      where: { id: onboarding.empleado.usuarioId },
      data: {
        password: hashedPassword,
        emailVerificado: true,
        activo: true,
      },
    });

    // Guardar avatar en empleado.fotoUrl como fuente única de verdad
    if (avatarUrl) {
      await prisma.empleado.update({
        where: { id: onboarding.empleadoId },
        data: {
          fotoUrl: avatarUrl,
        },
      });
    }

    // Actualizar progreso
    const progresoActual = onboarding.progreso as unknown as ProgresoOnboarding;
    const progresoNuevo: ProgresoOnboarding = {
      ...progresoActual,
      credenciales_completadas: true,
    };

    await prisma.onboardingEmpleado.update({
      where: { id: onboarding.id },
      data: {
        progreso: asJsonValue(progresoNuevo),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[guardarCredenciales] Error:', error);
    return {
      success: false,
      error: 'Error al guardar credenciales',
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
        datosTemporales: asJsonValue(datosTemporalesNuevos),
        progreso: asJsonValue(progresoNuevo),
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
        datosTemporales: asJsonValue(datosTemporalesNuevos),
        progreso: asJsonValue(progresoNuevo),
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
        progreso: asJsonValue(progresoNuevo),
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
 * Calcular si un empleado debe estar activo según sus fechas de contrato
 * @param fechaAlta - Fecha de inicio de contrato
 * @param fechaBaja - Fecha de finalización de contrato (opcional)
 * @returns true si el empleado debe estar activo, false si debe estar inactivo
 */
export function calcularEstadoActivoSegunFechas(
  fechaAlta: Date,
  fechaBaja: Date | null
): boolean {
  const fechaActual = new Date();
  fechaActual.setHours(0, 0, 0, 0); // Normalizar a inicio del día
  
  const fechaAltaNormalizada = new Date(fechaAlta);
  fechaAltaNormalizada.setHours(0, 0, 0, 0);
  
  // Si tiene fecha de baja, verificar si ya pasó
  if (fechaBaja) {
    const fechaBajaNormalizada = new Date(fechaBaja);
    fechaBajaNormalizada.setHours(0, 0, 0, 0);
    
    // Si la fecha de baja ya pasó, debe estar inactivo
    if (fechaBajaNormalizada < fechaActual) {
      return false;
    }
    
    // Si la fecha de alta ya pasó y la de baja no, debe estar activo
    return fechaAltaNormalizada <= fechaActual;
  }
  
  // Sin fecha de baja: activo si la fecha de alta ya pasó
  return fechaAltaNormalizada <= fechaActual;
}

/**
 * Actualizar estado activo de empleado y usuario según fechas de contrato
 * @param empleadoId - ID del empleado
 * @returns true si se actualizó correctamente, false en caso de error
 */
export async function actualizarEstadoActivoPorFechas(empleadoId: string): Promise<boolean> {
  try {
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: {
        fechaAlta: true,
        fechaBaja: true,
        usuarioId: true,
        activo: true,
      },
    });

    if (!empleado) {
      console.error(`[actualizarEstadoActivoPorFechas] Empleado ${empleadoId} no encontrado`);
      return false;
    }

    const debeEstarActivo = calcularEstadoActivoSegunFechas(
      empleado.fechaAlta,
      empleado.fechaBaja
    );

    // Solo actualizar si el estado cambió
    if (empleado.activo !== debeEstarActivo) {
      await prisma.empleado.update({
        where: { id: empleadoId },
        data: { activo: debeEstarActivo },
      });

      await prisma.usuario.update({
        where: { id: empleado.usuarioId },
        data: { activo: debeEstarActivo },
      });

      console.log(
        `[actualizarEstadoActivoPorFechas] Empleado ${empleadoId} actualizado: activo=${debeEstarActivo}`
      );
    }

    return true;
  } catch (error) {
    console.error(`[actualizarEstadoActivoPorFechas] Error actualizando empleado ${empleadoId}:`, error);
    return false;
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
    const tipoOnboarding = onboarding.tipoOnboarding as TipoOnboarding;

    // Validar que todos los pasos estén completados según tipo de onboarding
    const progreso = onboarding.progreso as unknown as ProgresoOnboarding;

    if (tipoOnboarding === 'completo') {
      const progresoCompleto = progreso as ProgresoOnboardingCompleto;
      if (!progresoCompleto.credenciales_completadas || 
          !progresoCompleto.datos_personales || 
          !progresoCompleto.datos_bancarios ||
          !progresoCompleto.pwa_explicacion) {
        return {
          success: false,
          error: 'Faltan pasos por completar (credenciales, datos personales, bancarios o PWA)',
        };
      }

      // Obtener datos temporales
      const datosTemporales = onboarding.datosTemporales as unknown as DatosTemporales;
      if (!datosTemporales?.datos_personales || !datosTemporales?.datos_bancarios) {
        return {
          success: false,
          error: 'Datos incompletos',
        };
      }

      // Validar documentos requeridos (solo para onboarding completo)
      const configResult = await obtenerOnboardingConfig(onboarding.empresaId);
      if (configResult.success && configResult.config) {
        const documentosRequeridos = configResult.config.documentosRequeridos;
        
        // Si hay documentos requeridos, validar que todos estén completos
        if (documentosRequeridos && Array.isArray(documentosRequeridos) && documentosRequeridos.length > 0) {
          // Solo validar documentos que son requeridos (requerido: true)
          interface DocRequerido { requerido: boolean; }
          const docsRequeridos = documentosRequeridos.filter((d: DocRequerido) => d.requerido === true);
          
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

      // Preparar datos del empleado (solo para onboarding completo)
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

      // Obtener empleado para verificar fechas de contrato
      const empleado = await prisma.empleado.findUnique({
        where: { id: onboarding.empleadoId },
        select: {
          fechaAlta: true,
          fechaBaja: true,
          usuarioId: true,
        },
      });

      if (!empleado) {
        return {
          success: false,
          error: 'Empleado no encontrado',
        };
      }

      // Calcular estado activo según fechas de contrato
      const debeEstarActivo = calcularEstadoActivoSegunFechas(
        empleado.fechaAlta,
        empleado.fechaBaja
      );

      // Encriptar campos sensibles antes de guardar
      const datosEmpleadoEncriptados = encryptEmpleadoData(datosEmpleado);

      // Traspasar datos encriptados a Empleado y actualizar estado activo
      await prisma.empleado.update({
        where: { id: onboarding.empleadoId },
        data: {
          ...datosEmpleadoEncriptados,
          activo: debeEstarActivo,
        },
      });

      // Actualizar también el estado activo del usuario
      await prisma.usuario.update({
        where: { id: empleado.usuarioId },
        data: {
          empleadoId: onboarding.empleadoId,
          activo: debeEstarActivo,
        },
      });
    } else {
      // Onboarding simplificado - solo validar pasos básicos
      const progresoSimplificado = progreso as ProgresoOnboardingSimplificado;
      if (!progresoSimplificado.credenciales_completadas || 
          !progresoSimplificado.integraciones ||
          !progresoSimplificado.pwa_explicacion) {
        return {
          success: false,
          error: 'Faltan pasos por completar (credenciales, integraciones o PWA)',
        };
      }

      // Para onboarding simplificado, solo marcar como completado
      // Los datos ya están en el empleado, solo falta activar
      const empleado = await prisma.empleado.findUnique({
        where: { id: onboarding.empleadoId },
        select: {
          fechaAlta: true,
          fechaBaja: true,
          usuarioId: true,
        },
      });

      if (!empleado) {
        return {
          success: false,
          error: 'Empleado no encontrado',
        };
      }

      // Calcular estado activo según fechas de contrato
      const debeEstarActivo = calcularEstadoActivoSegunFechas(
        empleado.fechaAlta,
        empleado.fechaBaja
      );

      // Actualizar empleado con onboarding completado
      await prisma.empleado.update({
        where: { id: onboarding.empleadoId },
        data: {
          onboardingCompletado: true,
          onboardingCompletadoEn: new Date(),
          activo: debeEstarActivo,
        },
      });

      // Actualizar también el estado activo del usuario
      await prisma.usuario.update({
        where: { id: empleado.usuarioId },
        data: {
          empleadoId: onboarding.empleadoId,
          activo: debeEstarActivo,
        },
      });
    }

    // Marcar onboarding como completado
    await prisma.onboardingEmpleado.update({
      where: { id: onboarding.id },
      data: {
        completado: true,
        fechaCompletado: new Date(),
      },
    });

    // Obtener datos del empleado para la notificación
    const empleadoData = await prisma.empleado.findUnique({
      where: { id: onboarding.empleadoId },
      select: {
        nombre: true,
        apellidos: true,
      },
    });

    // Crear notificación para HR y Manager
    if (empleadoData) {
      await crearNotificacionOnboardingCompletado(prisma, {
        empleadoId: onboarding.empleadoId,
        empresaId: onboarding.empresaId,
        empleadoNombre: `${empleadoData.nombre} ${empleadoData.apellidos}`,
      });
    }

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

    await crearNotificacionOnboardingCompletado(prisma, {
      empleadoId,
      empresaId,
      empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
    });
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

/**
 * Guardar progreso del paso de integraciones (onboarding simplificado)
 */
export async function guardarProgresoIntegraciones(token: string) {
  try {
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return {
        success: false,
        error: verificacion.error || 'Token inválido',
      };
    }

    const { onboarding } = verificacion;
    const progreso = onboarding.progreso as unknown as ProgresoOnboardingSimplificado;

    await prisma.onboardingEmpleado.update({
      where: { id: onboarding.id },
      data: {
        progreso: asJsonValue({
          ...progreso,
          integraciones: true,
        }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[guardarProgresoIntegraciones] Error:', error);
    return {
      success: false,
      error: 'Error al guardar progreso de integraciones',
    };
  }
}

/**
 * Guardar progreso del paso de PWA (ambos tipos de onboarding)
 */
export async function guardarProgresoPWA(token: string) {
  try {
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return {
        success: false,
        error: verificacion.error || 'Token inválido',
      };
    }

    const { onboarding } = verificacion;
    const progreso = onboarding.progreso as unknown as ProgresoOnboarding;

    await prisma.onboardingEmpleado.update({
      where: { id: onboarding.id },
      data: {
        progreso: asJsonValue({
          ...progreso,
          pwa_explicacion: true,
        }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[guardarProgresoPWA] Error:', error);
    return {
      success: false,
      error: 'Error al guardar progreso de PWA',
    };
  }
}

