'use server';

// ========================================
// Signup & Onboarding Server Actions
// ========================================

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

import { createSession, getSession, hashPassword } from '@/lib/auth';
import { DIAS_LABORABLES_DEFAULT } from '@/lib/calculos/dias-laborables';
import { UsuarioRol } from '@/lib/constants/enums';
import { getBaseUrl } from '@/lib/email';
import { persistDiasLaborables } from '@/lib/empresa/calendario-laboral';
import { crearInvitacion } from '@/lib/invitaciones';
import { usarInvitacionSignup, verificarInvitacionSignup } from '@/lib/invitaciones-signup';
import { DEFAULT_JORNADA_FORM_VALUES } from '@/lib/jornadas/defaults';
import { prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { getClientIP } from '@/lib/rate-limit';
import {
  calendarioJornadaOnboardingSchema,
  integracionCreateSchema,
  sedeCreateSchema,
  signupSchema,
} from '@/lib/validaciones/schemas';

/**
 * Registrar nueva empresa + primer usuario HR Admin
 * Crea automáticamente: Empresa → Usuario → Empleado → Sesión
 * REQUIERE: Token de invitación válido
 */
export async function signupEmpresaAction(
  data: z.infer<typeof signupSchema> & { token?: string }
) {
  try {
    const headersList = await headers();
    const clientIP = getClientIP(headersList);
    const ipAddress = clientIP === 'unknown-ip' ? undefined : clientIP;

    // Validar datos
    const validatedData = signupSchema.parse(data);

    // Verificar invitación (requerida)
    if (!data.token) {
      return {
        success: false,
        error: 'Se requiere una invitación válida para crear una cuenta',
        requiereInvitacion: true,
      };
    }

    const verificacion = await verificarInvitacionSignup(data.token);
    if (!verificacion.success) {
      return {
        success: false,
        error: verificacion.error || 'Invitación inválida o expirada',
        requiereInvitacion: true,
      };
    }

    // Verificar que el email coincida con la invitación
    if (!verificacion.invitacion || verificacion.invitacion.email.toLowerCase() !== validatedData.email.toLowerCase()) {
      return {
        success: false,
        error: 'El email debe coincidir con el de la invitación',
        requiereInvitacion: true,
      };
    }

    // Verificar si tenemos datos previos en waitlist (para sincronizar)
    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    // Verificar que el email no exista ya como usuario
    const existingUser = await prisma.usuario.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Ya existe una cuenta con este email',
      };
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(validatedData.password);

    // Crear todo en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear empresa
      const empresa = await tx.empresa.create({
        data: {
          nombre: validatedData.nombreEmpresa,
          web: validatedData.webEmpresa || null,
        },
      });

      // 2. Crear usuario HR Admin
      const usuario = await tx.usuario.create({
        data: {
          email: validatedData.email.toLowerCase(),
          password: hashedPassword,
          nombre: validatedData.nombre,
          apellidos: validatedData.apellidos,
          empresaId: empresa.id,
          rol: UsuarioRol.hr_admin,
          emailVerificado: true, // Auto-verificado en signup
          activo: true,
        },
      });

      // 3. Crear empleado asociado al usuario
      const empleado = await tx.empleado.create({
        data: {
          usuarioId: usuario.id,
          empresaId: empresa.id,
          nombre: validatedData.nombre,
          apellidos: validatedData.apellidos,
          email: validatedData.email.toLowerCase(),
          fechaAlta: new Date(),
          onboardingCompletado: false, // Se completará al finalizar el signup multi-paso
          activo: true,
        },
      });

      // 4. Vincular empleado al usuario
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { empleadoId: empleado.id },
      });

      if (validatedData.consentimientoTratamiento) {
        await tx.consentimiento.create({
          data: {
            empresaId: empresa.id,
            empleadoId: empleado.id,
            tipo: 'tratamiento_datos',
            descripcion:
              'Consentimiento para el tratamiento de datos personales necesarios para el onboarding de Clousadmin.',
            otorgado: true,
            otorgadoEn: new Date(),
            version: '1.0',
            ipAddress,
          },
        });
      }

      return { usuario, empresa, empleado };
    });

    // 5. Marcar invitación como usada
    await usarInvitacionSignup(data.token);

    // 6. Crear sesión automáticamente (usuario autenticado tras signup)
    await createSession({
      user: {
        id: result.usuario.id,
        email: result.usuario.email,
        nombre: result.usuario.nombre,
        apellidos: result.usuario.apellidos,
        rol: result.usuario.rol,
        empresaId: result.usuario.empresaId,
        empleadoId: result.empleado.id,
        avatar: result.empleado.fotoUrl, // Usar empleado.fotoUrl como fuente de verdad
        activo: result.usuario.activo,
      },
    });

    // 7. Mantener sincronizada la entrada en waitlist (si venía de ahí)
    if (waitlistEntry) {
      const nombreCompleto = `${validatedData.nombre} ${validatedData.apellidos}`.trim();
      try {
        await prisma.waitlist.update({
          where: { id: waitlistEntry.id },
          data: {
            nombre: nombreCompleto || waitlistEntry.nombre,
            empresa: validatedData.nombreEmpresa || waitlistEntry.empresa,
          },
        });
      } catch (syncError) {
        console.error('[signupEmpresaAction] Error sincronizando waitlist:', syncError);
      }
    }

    return {
      success: true,
      empresaId: result.empresa.id,
      usuarioId: result.usuario.id,
    };
  } catch (error) {
    console.error('[signupEmpresaAction] Error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Error de validación',
      };
    }

    return {
      success: false,
      error: 'Error al crear la cuenta. Por favor, inténtalo de nuevo.',
    };
  }
}

// ========================================
// Onboarding Configuration Actions
// ========================================

type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

function buildJornadaConfig(
  tipo: 'flexible' | 'fija',
  diasLaborables: Record<DiaKey, boolean>,
  {
    horaEntrada,
    horaSalida,
    limiteInferior,
    limiteSuperior,
    descansoMinutos,
  }: {
    horaEntrada?: string;
    horaSalida?: string;
    limiteInferior?: string;
    limiteSuperior?: string;
    descansoMinutos?: number;
  }
) {
  const config: Record<string, unknown> = {
    tipo,
  };

  const dayEntries = Object.entries(diasLaborables) as Array<[DiaKey, boolean]>;

  dayEntries.forEach(([dia, activo]) => {
    if (tipo === 'fija') {
      const diaConfig: Record<string, unknown> = {
        activo,
        entrada: horaEntrada,
        salida: horaSalida,
      };
      if (descansoMinutos && activo) {
        // Calcular tiempos de pausa para horario fijo
        const pausaInicio = '14:00'; // Hora de inicio de pausa por defecto
        const [h, m] = pausaInicio.split(':').map(Number);
        const totalMinutos = h * 60 + m + descansoMinutos;
        const pausaFin = `${Math.floor(totalMinutos / 60).toString().padStart(2, '0')}:${(totalMinutos % 60).toString().padStart(2, '0')}`;
        diaConfig.pausa_inicio = pausaInicio;
        diaConfig.pausa_fin = pausaFin;
      }
      config[dia] = diaConfig;
    } else {
      config[dia] = { activo };
    }
  });

  if (tipo === 'flexible') {
    if (limiteInferior) {
      config.limiteInferior = limiteInferior;
    }
    if (limiteSuperior) {
      config.limiteSuperior = limiteSuperior;
    }
    if (descansoMinutos) {
      const horas = Math.floor(descansoMinutos / 60);
      const minutos = descansoMinutos % 60;
      config.descansoMinimo = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    }
  } else {
    if (horaEntrada) {
      config.limiteInferior = horaEntrada;
    }
    if (horaSalida) {
      config.limiteSuperior = horaSalida;
    }
  }

  return config;
}

/**
 * Configurar calendario y jornada durante el onboarding
 */
export async function configurarCalendarioYJornadaAction(
  input: z.infer<typeof calendarioJornadaOnboardingSchema>
) {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    const validatedData = calendarioJornadaOnboardingSchema.parse(input);
    const normalizedDias = validatedData.diasLaborables ?? DIAS_LABORABLES_DEFAULT;
    const normalizedJornada = {
      nombre: validatedData.jornada.nombre?.trim() || DEFAULT_JORNADA_FORM_VALUES.nombre,
      tipo: validatedData.jornada.tipo,
      horasSemanales: validatedData.jornada.horasSemanales || DEFAULT_JORNADA_FORM_VALUES.horasSemanales,
      limiteInferior:
        validatedData.jornada.tipo === 'flexible'
          ? validatedData.jornada.limiteInferior || DEFAULT_JORNADA_FORM_VALUES.limiteInferior
          : undefined,
      limiteSuperior:
        validatedData.jornada.tipo === 'flexible'
          ? validatedData.jornada.limiteSuperior || DEFAULT_JORNADA_FORM_VALUES.limiteSuperior
          : undefined,
      horaEntrada:
        validatedData.jornada.tipo === 'fija'
          ? validatedData.jornada.horaEntrada || DEFAULT_JORNADA_FORM_VALUES.horaEntrada
          : validatedData.jornada.horaEntrada || DEFAULT_JORNADA_FORM_VALUES.horaEntrada,
      horaSalida:
        validatedData.jornada.tipo === 'fija'
          ? validatedData.jornada.horaSalida || DEFAULT_JORNADA_FORM_VALUES.horaSalida
          : validatedData.jornada.horaSalida || DEFAULT_JORNADA_FORM_VALUES.horaSalida,
      descansoMinutos: validatedData.jornada.descansoMinutos,
    };

    const jornadaCreada = await prisma.$transaction(async (tx) => {
      await persistDiasLaborables(tx, session.user.empresaId, normalizedDias);

      const configJornada = buildJornadaConfig(normalizedJornada.tipo, normalizedDias, {
        horaEntrada: normalizedJornada.horaEntrada,
        horaSalida: normalizedJornada.horaSalida,
        limiteInferior: normalizedJornada.limiteInferior,
        limiteSuperior: normalizedJornada.limiteSuperior,
        descansoMinutos: normalizedJornada.descansoMinutos,
      });

      // Buscar la primera jornada activa de la empresa
      const jornadaExistente = await tx.jornada.findFirst({
        where: {
          empresaId: session.user.empresaId,
          activa: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const dataJornada = {
        nombre: normalizedJornada.nombre,
        horasSemanales: normalizedJornada.horasSemanales,
        config: asJsonValue(configJornada),
        esPredefinida: false,
        activa: true,
      };

      const registro = jornadaExistente
        ? await tx.jornada.update({
            where: { id: jornadaExistente.id },
            data: dataJornada,
          })
        : await tx.jornada.create({
            data: {
              ...dataJornada,
              empresaId: session.user.empresaId,
            },
          });

      await tx.empleado.updateMany({
        where: {
          empresaId: session.user.empresaId,
          jornadaId: null,
        },
        data: {
          jornadaId: registro.id,
        },
      });

      return registro;
    });

    revalidatePath('/signup');

    return {
      success: true,
      jornadaId: jornadaCreada.id,
    };
  } catch (error) {
    console.error('[configurarCalendarioYJornadaAction] Error:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Datos inválidos',
      };
    }

    return {
      success: false,
      error: 'Error al guardar calendario y jornada',
    };
  }
}

/**
 * Crear una nueva sede para la empresa
 */
type AsignacionSedeInput = {
  tipo: 'empresa' | 'equipo';
  equipoId?: string;
};

export async function crearSedeAction({
  ciudad,
  asignacion,
}: {
  ciudad: string;
  asignacion?: AsignacionSedeInput;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    const validatedData = sedeCreateSchema.parse({
      ciudad,
      empresaId: session.user.empresaId,
      asignacion,
    });

    // Auto-generar nombre desde ciudad
    const nombre = `Sede ${validatedData.ciudad}`;

    const sede = await prisma.sede.create({
      data: {
        empresaId: validatedData.empresaId,
        nombre,
        ciudad: validatedData.ciudad,
      },
      include: {
        equipos: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    // Aplicar asignación inicial si procede
    if (validatedData.asignacion?.tipo === 'empresa') {
      await prisma.equipo.updateMany({
        where: {
          empresaId: session.user.empresaId,
        },
        data: {
          sedeId: sede.id,
        },
      });
    }

    if (validatedData.asignacion?.tipo === 'equipo') {
      if (!validatedData.asignacion.equipoId) {
        return {
          success: false,
          error: 'Debes seleccionar un equipo para asignar la sede',
        };
      }

      const equipo = await prisma.equipo.findFirst({
        where: {
          id: validatedData.asignacion.equipoId,
          empresaId: session.user.empresaId,
        },
      });

      if (!equipo) {
        return {
          success: false,
          error: 'Equipo no encontrado o sin permisos',
        };
      }

      await prisma.equipo.update({
        where: { id: equipo.id },
        data: {
          sedeId: sede.id,
        },
      });
    }

    const sedeActualizada = await prisma.sede.findUnique({
      where: { id: sede.id },
      include: {
        equipos: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    revalidatePath('/signup');

    return {
      success: true,
      sede: sedeActualizada ?? sede,
    };
  } catch (error) {
    console.error('[crearSedeAction] Error:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Error de validación',
      };
    }

    return {
      success: false,
      error: 'Error al crear la sede',
    };
  }
}

/**
 * Asignar una sede a toda la empresa o a un equipo específico
 */
export async function asignarSedeAction(sedeId: string, asignacion: AsignacionSedeInput) {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    const sede = await prisma.sede.findFirst({
      where: {
        id: sedeId,
        empresaId: session.user.empresaId,
      },
      include: {
        equipos: {
          select: { id: true },
        },
      },
    });

    if (!sede) {
      return {
        success: false,
        error: 'Sede no encontrada',
      };
    }

    if (asignacion.tipo === 'empresa') {
      await prisma.equipo.updateMany({
        where: {
          empresaId: session.user.empresaId,
        },
        data: {
          sedeId: sede.id,
        },
      });
    } else {
      if (!asignacion.equipoId) {
        return {
          success: false,
          error: 'Equipo requerido para la asignación',
        };
      }

      const equipo = await prisma.equipo.findFirst({
        where: {
          id: asignacion.equipoId,
          empresaId: session.user.empresaId,
        },
      });

      if (!equipo) {
        return {
          success: false,
          error: 'Equipo no encontrado o sin permisos',
        };
      }

      await prisma.equipo.update({
        where: { id: equipo.id },
        data: {
          sedeId: sede.id,
        },
      });
    }

    const sedeActualizada = await prisma.sede.findUnique({
      where: { id: sede.id },
      include: {
        equipos: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    revalidatePath('/signup');

    return {
      success: true,
      sede: sedeActualizada ?? sede,
    };
  } catch (error) {
    console.error('[asignarSedeAction] Error:', error);
    return {
      success: false,
      error: 'Error al asignar la sede',
    };
  }
}

/**
 * Eliminar una sede
 */
export async function eliminarSedeAction(sedeId: string) {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    // Verificar que la sede pertenece a la empresa del usuario
    const sede = await prisma.sede.findFirst({
      where: {
        id: sedeId,
        empresaId: session.user.empresaId,
      },
    });

    if (!sede) {
      return {
        success: false,
        error: 'Sede no encontrada',
      };
    }

    await prisma.sede.delete({
      where: { id: sedeId },
    });

    revalidatePath('/signup');

    return {
      success: true,
    };
  } catch (error) {
    console.error('[eliminarSedeAction] Error:', error);
    return {
      success: false,
      error: 'Error al eliminar la sede',
    };
  }
}

/**
 * Configurar una integración
 */
export async function configurarIntegracionAction(
  tipo: 'calendario' | 'comunicacion' | 'nominas',
  proveedor: string,
  config?: Record<string, unknown>
) {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    const validatedData = integracionCreateSchema.parse({
      tipo,
      proveedor,
      config,
      empresaId: session.user.empresaId,
    });

    // Buscar si ya existe una integración con estos parámetros
    const existingIntegration = await prisma.integracion.findFirst({
      where: {
        empresaId: validatedData.empresaId,
        tipo: validatedData.tipo,
        proveedor: validatedData.proveedor,
        usuarioId: null, // Solo integraciones de empresa
      },
    });

    // Crear o actualizar la integración
    const integracion = existingIntegration
      ? await prisma.integracion.update({
          where: { id: existingIntegration.id },
          data: {
            config: asJsonValue(validatedData.config || {}),
            activa: true,
          },
        })
      : await prisma.integracion.create({
          data: {
            empresaId: validatedData.empresaId,
            tipo: validatedData.tipo,
            proveedor: validatedData.proveedor,
            config: asJsonValue(validatedData.config || {}),
            activa: true,
          },
        });

    revalidatePath('/signup');

    return {
      success: true,
      integracion,
    };
  } catch (error) {
    console.error('[configurarIntegracionAction] Error:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Error de validación',
      };
    }

    return {
      success: false,
      error: 'Error al configurar la integración',
    };
  }
}

/**
 * Invitar a un HR Admin adicional
 */
interface InvitarHRAdminInput {
  email: string;
  nombre: string;
  apellidos: string;
  empleadoId?: string;
}

export async function invitarHRAdminAction({
  email,
  nombre,
  apellidos,
  empleadoId,
}: InvitarHRAdminInput) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return {
        success: false,
        error: 'No tienes permisos para invitar HR admins',
      };
    }

    const headersList = await headers();
    const origin = headersList.get('origin') ?? undefined;
    const baseUrl = getBaseUrl(origin);

    const emailLower = email.trim().toLowerCase();

    const empleadoExistente = empleadoId
      ? await prisma.empleado.findFirst({
          where: {
            id: empleadoId,
            empresaId: session.user.empresaId,
          },
          include: {
            usuario: true,
          },
        })
      : await prisma.empleado.findFirst({
          where: {
            email: emailLower,
            empresaId: session.user.empresaId,
          },
          include: {
            usuario: true,
          },
        });

    if (empleadoExistente) {
      if (empleadoExistente.usuario?.rol === UsuarioRol.hr_admin) {
        return {
          success: false,
          error: 'Este empleado ya tiene rol de HR admin',
        };
      }

      const usuarioActualizado = empleadoExistente.usuario
        ? await prisma.usuario.update({
            where: { id: empleadoExistente.usuario.id },
            data: {
              nombre,
              apellidos,
              email: emailLower,
              rol: UsuarioRol.hr_admin,
            },
          })
        : await prisma.usuario.create({
            data: {
              email: emailLower,
              nombre,
              apellidos,
              empresaId: session.user.empresaId,
              rol: UsuarioRol.hr_admin,
              emailVerificado: false,
              activo: false,
            },
          });

      if (!empleadoExistente.usuario) {
        await prisma.empleado.update({
          where: { id: empleadoExistente.id },
          data: { usuarioId: usuarioActualizado.id },
        });
      }

      await prisma.empleado.update({
        where: { id: empleadoExistente.id },
        data: {
          nombre,
          apellidos,
          email: emailLower,
        },
      });

      const invitacion = await crearInvitacion(
        empleadoExistente.id,
        session.user.empresaId,
        emailLower,
        'completo',
        { baseUrl }
      );

      if (!invitacion.success || !invitacion.url) {
        return {
          success: false,
          error: invitacion.error || 'No se pudo generar la invitación',
        };
      }

      revalidatePath('/signup');

      return {
        success: true,
        invitacionUrl: invitacion.url,
      };
    }

    // Verificar que el email no exista
    const existingUser = await prisma.usuario.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Ya existe un usuario con este email',
      };
    }

    // Crear usuario y empleado en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear usuario sin password (será establecida en el onboarding)
      const usuario = await tx.usuario.create({
        data: {
          email: emailLower,
          nombre,
          apellidos,
          empresaId: session.user.empresaId,
          rol: UsuarioRol.hr_admin,
          emailVerificado: false,
          activo: false, // Se activará cuando acepte la invitación
        },
      });

      // 2. Crear empleado asociado
      const empleado = await tx.empleado.create({
        data: {
          usuarioId: usuario.id,
          empresaId: session.user.empresaId,
          nombre,
          apellidos,
          email: emailLower,
          fechaAlta: new Date(),
          onboardingCompletado: false,
          activo: false,
        },
      });

      // 3. Vincular empleado al usuario
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { empleadoId: empleado.id },
      });

      return { usuario, empleado };
    });

    // 4. Crear invitación
    const invitacion = await crearInvitacion(
      result.empleado.id,
      session.user.empresaId,
      emailLower,
      'completo',
      { baseUrl }
    );

    if (!invitacion.success || !invitacion.url) {
      return {
        success: false,
        error: invitacion.error || 'No se pudo generar la invitación',
      };
    }

    revalidatePath('/signup');

    return {
      success: true,
      invitacionUrl: invitacion.url,
    };
  } catch (error) {
    console.error('[invitarHRAdminAction] Error:', error);
    return {
      success: false,
      error: 'Error al enviar la invitación',
    };
  }
}

/**
 * Completar el onboarding y redirigir al dashboard
 */
export async function completarOnboardingAction() {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    // Marcar el onboarding como completado para el empleado
    if (session.user.empleadoId) {
      await prisma.empleado.update({
        where: { id: session.user.empleadoId },
        data: {
          onboardingCompletado: true,
          onboardingCompletadoEn: new Date(),
        },
      });
    }

    revalidatePath('/');
    revalidatePath('/hr/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('[completarOnboardingAction] Error:', error);
    return {
      success: false,
      error: 'Error al completar el onboarding',
    };
  }
}

