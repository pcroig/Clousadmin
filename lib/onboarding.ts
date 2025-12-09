// ========================================
// Onboarding - Employee Onboarding Utilities
// ========================================
// Manages the multi-step onboarding process for new employees

import { randomBytes } from 'crypto';

import { hashPassword } from '@/lib/auth';
import { asegurarCarpetasSistemaParaEmpleado } from '@/lib/documentos';
import { validarDocumentosRequeridosCompletos } from '@/lib/documentos/onboarding';
import { getBaseUrl } from '@/lib/email';
import { encryptEmpleadoData } from '@/lib/empleado-crypto';
import { crearNotificacionOnboardingCompletado } from '@/lib/notificaciones';
import { obtenerOnboardingConfig } from '@/lib/onboarding-config';
import type { WorkflowAccion } from '@/lib/onboarding-config-types';
import { validarTodasAccionesCompletadas } from '@/lib/onboarding-validacion';
import { prisma, Prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { uploadToS3 } from '@/lib/s3';

/**
 * Tipo de onboarding
 */
export type TipoOnboarding = 'completo' | 'simplificado';

/**
 * Progreso del onboarding completo (nuevos empleados)
 * @deprecated Usar ProgresoOnboardingWorkflow para nuevos onboardings
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
 * Progreso del onboarding basado en workflow (nuevos empleados - nuevo sistema)
 * Incluye pasos base (credenciales, integraciones, PWA) + acciones dinámicas del workflow
 */
export interface ProgresoOnboardingWorkflow {
  // Pasos base (obligatorios para todos)
  credenciales_completadas: boolean;
  integraciones: boolean;
  pwa_explicacion: boolean;
  // Acciones dinámicas del workflow configurado por la empresa
  acciones: Record<string, boolean>; // { [accionId]: completada }
}

/**
 * Union type para progreso de onboarding (soporta todos los tipos)
 */
export type ProgresoOnboarding = ProgresoOnboardingCompleto | ProgresoOnboardingSimplificado | ProgresoOnboardingWorkflow;

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
    bic: string;
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
  accionesActivas?: Record<string, boolean>; // Acciones activas del workflow para este empleado
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
      const onboardingExistente = await tx.onboarding_empleados.findUnique({
        where: { empleadoId },
      });

      if (onboardingExistente && !onboardingExistente.completado) {
        // Si existe y no está completado, eliminar para crear uno nuevo
        await tx.onboarding_empleados.delete({
          where: { id: onboardingExistente.id },
        });
      }

      // Definir progreso inicial según tipo de onboarding
      let progresoInicial: ProgresoOnboarding;

      if (tipoOnboarding === 'completo') {
        // Nuevo sistema de workflow: pasos base + acciones dinámicas
        progresoInicial = {
          // Pasos base (igual que simplificado)
          credenciales_completadas: false,
          integraciones: false,
          pwa_explicacion: false,
          // Acciones dinámicas del workflow
          acciones: options?.accionesActivas || {},
        } as ProgresoOnboardingWorkflow;
      } else {
        // Onboarding simplificado (empleados existentes)
        progresoInicial = {
          credenciales_completadas: false,
          integraciones: false,
          pwa_explicacion: false,
        } as ProgresoOnboardingSimplificado;
      }

      return await tx.onboarding_empleados.create({
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
    const onboarding = await prisma.onboarding_empleados.findUnique({
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

    // Actualizar usuario (y avatar si aplica) manteniendo sincronía con empleado
    const userUpdateData: Prisma.usuariosUpdateInput = {
      password: hashedPassword,
      emailVerificado: true,
      activo: true,
    };
    if (avatarUrl) {
      userUpdateData.avatar = avatarUrl;
    }
    // Mantener sincronía entre usuario y empleado (avatar y credenciales)
    if (avatarUrl) {
      await prisma.$transaction([
        prisma.usuarios.update({
          where: { id: onboarding.empleado.usuarioId },
          data: userUpdateData,
        }),
        prisma.empleados.update({
          where: { id: onboarding.empleadoId },
          data: { fotoUrl: avatarUrl },
        }),
      ]);
    } else {
      await prisma.usuarios.update({
        where: { id: onboarding.empleado.usuarioId },
        data: userUpdateData,
      });
    }

    // Actualizar progreso
    const progresoActual = onboarding.progreso as unknown as ProgresoOnboarding;
    const progresoNuevo: ProgresoOnboarding = {
      ...progresoActual,
      credenciales_completadas: true,
    };

    await prisma.onboarding_empleados.update({
      where: { id: onboarding.id },
      data: {
        progreso: asJsonValue(progresoNuevo),
      },
    });

    return { success: true, avatarUrl };
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
    await prisma.onboarding_empleados.update({
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
    await prisma.onboarding_empleados.update({
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
    await prisma.onboarding_empleados.update({
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
 * Obtener workflow configurado para la empresa
 */
export async function obtenerWorkflowConfig(empresaId: string): Promise<WorkflowAccion[]> {
  try {
    const config = await prisma.onboarding_configs.findUnique({
      where: { empresaId },
      select: { workflowAcciones: true },
    });

    if (!config || !config.workflowAcciones) {
      return [];
    }

    // Parsear y retornar workflow
    const workflow = config.workflowAcciones as unknown as WorkflowAccion[];
    return Array.isArray(workflow) ? workflow : [];
  } catch (error) {
    console.error('[obtenerWorkflowConfig] Error:', error);
    return [];
  }
}

/**
 * Actualizar progreso de una acción específica
 */
export async function actualizarProgresoAccion(
  empleadoId: string,
  accionId: string,
  completado: boolean,
  datosAdicionales?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const onboarding = await prisma.onboarding_empleados.findUnique({
      where: { empleadoId },
    });

    if (!onboarding) {
      return { success: false, error: 'Onboarding no encontrado' };
    }

    // Obtener progreso actual
    const progresoActual = onboarding.progreso as unknown as ProgresoOnboardingWorkflow;
    const datosTemporalesActuales = (onboarding.datosTemporales as unknown as Record<string, unknown>) || {};

    // Actualizar progreso de la acción (preservar pasos base)
    const progresoNuevo: ProgresoOnboardingWorkflow = {
      credenciales_completadas: progresoActual.credenciales_completadas || false,
      integraciones: progresoActual.integraciones || false,
      pwa_explicacion: progresoActual.pwa_explicacion || false,
      acciones: {
        ...(progresoActual.acciones || {}),
        [accionId]: completado,
      },
    };

    // Merge datos adicionales si se proporcionan
    const datosTemporalesNuevos = datosAdicionales
      ? { ...datosTemporalesActuales, ...datosAdicionales }
      : datosTemporalesActuales;

    // Guardar en la base de datos
    await prisma.onboarding_empleados.update({
      where: { id: onboarding.id },
      data: {
        progreso: asJsonValue(progresoNuevo),
        datosTemporales: asJsonValue(datosTemporalesNuevos),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[actualizarProgresoAccion] Error:', error);
    return { success: false, error: 'Error al actualizar progreso' };
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
    const empleado = await prisma.empleados.findUnique({
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
      await prisma.empleados.update({
        where: { id: empleadoId },
        data: { activo: debeEstarActivo },
      });

      await prisma.usuarios.update({
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
      // Detectar si es workflow nuevo o sistema viejo
      const progresoWorkflow = progreso as ProgresoOnboardingWorkflow;
      const esNuevoWorkflow = progresoWorkflow.acciones !== undefined;

      if (esNuevoWorkflow) {
        // NUEVO SISTEMA: Validar pasos base + workflow dinámico

        // 1. Validar pasos base (credenciales, integraciones, PWA)
        if (!progresoWorkflow.credenciales_completadas) {
          return {
            success: false,
            error: 'Debes completar el paso de credenciales antes de finalizar',
          };
        }
        if (!progresoWorkflow.integraciones) {
          return {
            success: false,
            error: 'Debes completar el paso de integraciones antes de finalizar',
          };
        }
        if (!progresoWorkflow.pwa_explicacion) {
          return {
            success: false,
            error: 'Debes completar el paso de instalación de la app móvil antes de finalizar',
          };
        }

        // 2. Validar workflow dinámico
        const workflow = await obtenerWorkflowConfig(onboarding.empresaId);
        const accionesActivas = workflow.filter((a) => a.activo);

        // Validar que todas las acciones activas estén completadas
        const datosTemporales = (onboarding.datosTemporales as unknown as Record<string, unknown>) || {};
        const validacion = await validarTodasAccionesCompletadas(
          accionesActivas,
          progresoWorkflow.acciones || {},
          datosTemporales,
          onboarding.empleadoId
        );

        if (!validacion.completado) {
          return {
            success: false,
            error: `Faltan acciones por completar: ${validacion.accionesPendientes.join(', ')}`,
          };
        }

        // Transferir datos temporales a empleado
        const empleado = await prisma.empleados.findUnique({
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

        // Preparar datos del empleado desde datosTemporales
        const datosEmpleado: Record<string, unknown> = {
          onboardingCompletado: true,
          onboardingCompletadoEn: new Date(),
        };

        // Transferir campos específicos si existen en datosTemporales
        const camposATransferir = [
          'nif', 'nss', 'telefono', 'fechaNacimiento',
          'direccionCalle', 'direccionNumero', 'direccionPiso',
          'codigoPostal', 'ciudad', 'direccionProvincia',
          'estadoCivil', 'numeroHijos',
          'iban', 'bic',
        ];

        for (const campo of camposATransferir) {
          if (datosTemporales[campo] !== undefined && datosTemporales[campo] !== null) {
            datosEmpleado[campo] = datosTemporales[campo];
          }
        }

        // Calcular estado activo según fechas de contrato
        const debeEstarActivo = calcularEstadoActivoSegunFechas(
          empleado.fechaAlta,
          empleado.fechaBaja
        );

        // Encriptar campos sensibles antes de guardar
        const datosEmpleadoEncriptados = encryptEmpleadoData(datosEmpleado);

        // Traspasar datos encriptados a Empleado y actualizar estado activo
        await prisma.empleados.update({
          where: { id: onboarding.empleadoId },
          data: {
            ...datosEmpleadoEncriptados,
            activo: debeEstarActivo,
          },
        });

        // Actualizar también el estado activo del usuario
        await prisma.usuarios.update({
          where: { id: empleado.usuarioId },
          data: {
            empleadoId: onboarding.empleadoId,
            activo: debeEstarActivo,
          },
        });
      } else {
        // SISTEMA VIEJO: Validación hardcoded (backward compatibility)
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
          bic: datos_bancarios.bic,

          // Marcar onboarding completo
          onboardingCompletado: true,
          onboardingCompletadoEn: new Date(),
        };

        // Obtener empleado para verificar fechas de contrato
        const empleado = await prisma.empleados.findUnique({
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
        await prisma.empleados.update({
          where: { id: onboarding.empleadoId },
          data: {
            ...datosEmpleadoEncriptados,
            activo: debeEstarActivo,
          },
        });

        // Actualizar también el estado activo del usuario
        await prisma.usuarios.update({
          where: { id: empleado.usuarioId },
          data: {
            empleadoId: onboarding.empleadoId,
            activo: debeEstarActivo,
          },
        });
      }
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
      const empleado = await prisma.empleados.findUnique({
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
      await prisma.empleados.update({
        where: { id: onboarding.empleadoId },
        data: {
          onboardingCompletado: true,
          onboardingCompletadoEn: new Date(),
          activo: debeEstarActivo,
        },
      });

      // Actualizar también el estado activo del usuario
      await prisma.usuarios.update({
        where: { id: empleado.usuarioId },
        data: {
          empleadoId: onboarding.empleadoId,
          activo: debeEstarActivo,
        },
      });
    }

    // Marcar onboarding como completado
    await prisma.onboarding_empleados.update({
      where: { id: onboarding.id },
      data: {
        completado: true,
        fechaCompletado: new Date(),
      },
    });

    // Asegurar que las carpetas del sistema existan para el empleado
    try {
      await asegurarCarpetasSistemaParaEmpleado(onboarding.empleadoId, onboarding.empresaId);
      console.log(`[finalizarOnboarding] Carpetas del sistema aseguradas para empleado ${onboarding.empleadoId}`);
    } catch (error) {
      console.error('[finalizarOnboarding] Error asegurando carpetas del sistema:', error);
      // No fallar el onboarding si falla la creación de carpetas
    }

    // Obtener datos del empleado para la notificación
    const empleadoData = await prisma.empleados.findUnique({
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
    const empleado = await prisma.empleados.findUnique({
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
    const onboarding = await prisma.onboarding_empleados.findUnique({
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
    const progreso = onboarding.progreso as unknown as ProgresoOnboarding;

    // Actualizar progreso de integraciones (funciona para ambos tipos de onboarding)
    await prisma.onboarding_empleados.update({
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

    await prisma.onboarding_empleados.update({
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

