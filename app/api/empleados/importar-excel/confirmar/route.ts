// ========================================
// API: Empleados - Confirmar Importación desde Excel
// ========================================

import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { encryptEmpleadoData } from '@/lib/empleado-crypto';
import { invitarEmpleado } from '@/lib/invitaciones';
import { getPredefinedJornada } from '@/lib/jornadas/get-or-create-default';
import { prisma } from '@/lib/prisma';
import { getJsonBody } from '@/lib/utils/json';

import type { EmpleadoDetectado } from '@/lib/ia/procesar-excel-empleados';


interface ConfirmarImportacionBody {
  empleados: (EmpleadoDetectado & { valido: boolean; errores: string[] })[];
  equiposDetectados: string[];
  managersDetectados: string[];
  invitarEmpleados: boolean;
}

/**
 * POST /api/empleados/importar-excel/confirmar
 * 
 * FASE 2: Crea empleados, usuarios, equipos y envía invitaciones
 * 
 * IMPORTANTE: Este endpoint SÍ guarda datos en la base de datos.
 * Debe ser llamado después de que el usuario revise el preview y confirme.
 * 
 * Flujo completo:
 * 1. POST /api/empleados/importar-excel (análisis, NO guarda)
 * 2. Usuario revisa preview
 * 3. POST /api/empleados/importar-excel/confirmar (guarda en BD)
 * 
 * @see docs/funcionalidades/importacion-empleados-excel.md
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getSession();
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await getJsonBody<ConfirmarImportacionBody>(req);

    const sanitizeOptionalString = (value: unknown): string | null => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const sanitizeNif = (nif: unknown): string | null => {
      const sanitized = sanitizeOptionalString(nif);
      return sanitized ? sanitized.toUpperCase() : null;
    };

    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { nombre: true },
    });
    const empresaNombre = empresa?.nombre || 'Tu empresa';

    const { empleados, equiposDetectados } = body;

    // Requisito actual: siempre invitar y activar empleados importados
    const debeInvitar = true;

    // Filtrar solo empleados válidos
    const empleadosValidos = empleados.filter((e) => e.valido);

    if (empleadosValidos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No hay empleados válidos para importar',
        },
        { status: 400 }
      );
    }

    console.log(
      `[ConfirmarImportacion] Importando ${empleadosValidos.length} empleados...`
    );

    // Procesar en batches de 50 empleados
    const BATCH_SIZE = 50;
    const batches: typeof empleadosValidos[] = [];
    
    for (let i = 0; i < empleadosValidos.length; i += BATCH_SIZE) {
      batches.push(empleadosValidos.slice(i, i + BATCH_SIZE));
    }

    const resultados = {
      empleadosCreados: 0,
      equiposCreados: 0,
      puestosCreados: 0,
      invitacionesEnviadas: 0,
      errores: [] as string[],
      empleadosImportados: [] as Array<{
        id: string;
        nombre: string;
        apellidos: string;
        email: string;
        puesto: string | null;
        equipo: string | null;
        fechaAlta: string | null;
        salarioBrutoAnual: number | null;
        invitacionEnviada: boolean;
      }>,
    };

    // 1. Crear equipos primero (usar upsert para evitar duplicados)
    const equiposCreados = new Map<string, string>(); // nombre -> id

    for (const nombreEquipo of equiposDetectados) {
      try {
        // Usar upsert para crear o actualizar equipo (ahora tenemos índice único)
        const equipo = await prisma.equipo.upsert({
          where: {
            empresaId_nombre: {
              empresaId: session.user.empresaId,
              nombre: nombreEquipo,
            },
          },
          update: {
            // Si ya existe, asegurar que está activo
            activo: true,
          },
          create: {
            empresaId: session.user.empresaId,
            nombre: nombreEquipo,
            tipo: 'proyecto',
            activo: true,
          },
        });

        equiposCreados.set(nombreEquipo, equipo.id);
        resultados.equiposCreados++;
      } catch (error) {
        console.error(`[ConfirmarImportacion] Error creando equipo ${nombreEquipo}:`, error);
        resultados.errores.push(`Error al crear equipo: ${nombreEquipo}`);
      }
    }

    console.log(`[ConfirmarImportacion] Equipos creados: ${resultados.equiposCreados}`);

    // 1.5. Crear puestos de trabajo (similar a equipos)
    const puestosUnicos = new Set<string>();
    empleadosValidos.forEach((emp) => {
      if (emp.puesto && emp.puesto.trim()) {
        puestosUnicos.add(emp.puesto.trim());
      }
    });

    const puestosCreados = new Map<string, string>(); // nombre -> id

    for (const nombrePuesto of Array.from(puestosUnicos)) {
      try {
        const puesto = await prisma.puesto.upsert({
          where: {
            empresaId_nombre: {
              empresaId: session.user.empresaId,
              nombre: nombrePuesto,
            },
          },
          update: {
            activo: true,
          },
          create: {
            empresaId: session.user.empresaId,
            nombre: nombrePuesto,
            activo: true,
          },
        });

        puestosCreados.set(nombrePuesto, puesto.id);
        resultados.puestosCreados++;
      } catch (error) {
        console.error(`[ConfirmarImportacion] Error creando puesto ${nombrePuesto}:`, error);
        resultados.errores.push(`Error al crear puesto: ${nombrePuesto}`);
      }
    }

    console.log(`[ConfirmarImportacion] Puestos creados: ${resultados.puestosCreados}`);

    const jornadaPorDefecto = await getPredefinedJornada(prisma, session.user.empresaId);

    // 2. Crear empleados en batches con paralelismo controlado
    const CONCURRENCY = 8; // Procesamos 8 empleados en paralelo (balance entre velocidad y carga DB)
    
    for (const batch of batches) {
      // Dividir batch en chunks de CONCURRENCY para paralelismo controlado
      const chunks: typeof batch[] = [];
      for (let i = 0; i < batch.length; i += CONCURRENCY) {
        chunks.push(batch.slice(i, i + CONCURRENCY));
      }

      for (const chunk of chunks) {
        // Procesar chunk en paralelo con allSettled (errores no bloquean otros)
        const creationPromises = chunk.map(async (empleadoData) => {
          try {
            const creationResult = await prisma.$transaction(async (tx) => {
              // Verificar si el email ya existe
              const usuarioExistente = await tx.usuario.findUnique({
                where: { email: empleadoData.email!.toLowerCase() },
              });

              if (usuarioExistente) {
                resultados.errores.push(
                  `Email duplicado: ${empleadoData.email}`
                );
                return null; // Saltar este empleado
              }

              // Crear usuario (sin password, se establecerá en el onboarding)
              const usuario = await tx.usuario.create({
                data: {
                  email: empleadoData.email!.toLowerCase(),
                  nombre: empleadoData.nombre!,
                  apellidos: empleadoData.apellidos!,
                  empresaId: session.user.empresaId,
                  rol: UsuarioRol.empleado,
                  emailVerificado: false,
                  activo: true,
                },
              });

              // Verificar si el NIF ya existe (si hay NIF)
              if (empleadoData.nif) {
                const empleadoConNif = await tx.empleado.findUnique({
                  where: { nif: empleadoData.nif },
                });

                if (empleadoConNif) {
                  resultados.errores.push(
                    `NIF duplicado: ${empleadoData.nif}`
                  );
                  // Eliminar el usuario creado para mantener consistencia
                  await tx.usuario.delete({ where: { id: usuario.id } });
                  return null; // Saltar este empleado
                }
              }

              // Preparar datos del empleado
              const salarioBrutoAnual =
                empleadoData.salarioBrutoAnual !== undefined && empleadoData.salarioBrutoAnual !== null
                  ? new Prisma.Decimal(empleadoData.salarioBrutoAnual)
                  : null;
              const salarioBrutoMensual =
                empleadoData.salarioBrutoMensual !== undefined && empleadoData.salarioBrutoMensual !== null
                  ? new Prisma.Decimal(empleadoData.salarioBrutoMensual)
                  : null;

              const datosEmpleado = {
                usuarioId: usuario.id,
                empresaId: session.user.empresaId,
                nombre: empleadoData.nombre!,
                apellidos: empleadoData.apellidos!,
                email: empleadoData.email!.toLowerCase(),
                nif: sanitizeNif(empleadoData.nif),
                telefono: sanitizeOptionalString(empleadoData.telefono),
                fechaNacimiento: empleadoData.fechaNacimiento
                  ? new Date(empleadoData.fechaNacimiento)
                  : null,
                puesto: empleadoData.puesto, // Mantener por compatibilidad (deprecated)
                puestoId: empleadoData.puesto && puestosCreados.has(empleadoData.puesto.trim())
                  ? puestosCreados.get(empleadoData.puesto.trim())
                  : null,
                jornadaId: jornadaPorDefecto?.id ?? null,
                fechaAlta: empleadoData.fechaAlta
                  ? new Date(empleadoData.fechaAlta)
                  : new Date(),
                salarioBrutoAnual,
                salarioBrutoMensual,
                direccionCalle: sanitizeOptionalString(empleadoData.direccionCalle),
                direccionNumero: sanitizeOptionalString(empleadoData.direccionNumero),
                direccionPiso: sanitizeOptionalString(empleadoData.direccionPiso),
                ciudad: sanitizeOptionalString(empleadoData.ciudad),
                codigoPostal: sanitizeOptionalString(empleadoData.codigoPostal),
                direccionProvincia: sanitizeOptionalString(empleadoData.direccionProvincia),
                nss: sanitizeOptionalString(empleadoData.nss),
                iban: sanitizeOptionalString(empleadoData.iban),
                onboardingCompletado: false,
                activo: true,
              };

              // Encriptar datos sensibles antes de crear
              const datosEncriptados = encryptEmpleadoData({
                nif: datosEmpleado.nif,
                nss: datosEmpleado.nss,
                iban: datosEmpleado.iban,
              });
              const empleadoCreateData = {
                ...datosEmpleado,
                ...datosEncriptados,
              };

              // Crear empleado con datos encriptados
              const empleado = await tx.empleado.create({
                data: empleadoCreateData,
              });

              // Vincular empleado al usuario
              await tx.usuario.update({
                where: { id: usuario.id },
                data: { empleadoId: empleado.id },
              });

              // Asignar a equipo si corresponde
              if (empleadoData.equipo && equiposCreados.has(empleadoData.equipo)) {
                await tx.empleadoEquipo.create({
                  data: {
                    empleadoId: empleado.id,
                    equipoId: equiposCreados.get(empleadoData.equipo)!,
                  },
                });
              }

              return {
                empleadoId: empleado.id,
                email: empleado.email,
                nombre: empleado.nombre,
                apellidos: empleado.apellidos,
                puesto: empleado.puesto,
                equipo: empleadoData.equipo || null,
                fechaAlta: empleado.fechaAlta ? empleado.fechaAlta.toISOString() : null,
                salarioBrutoAnual: empleado.salarioBrutoAnual ? parseFloat(empleado.salarioBrutoAnual.toString()) : null,
              };
            }, { timeout: 10000 });

            if (!creationResult) {
              return null; // Ya se registró el error correspondiente
            }

            // Empleado creado con éxito, crear invitación
            if (debeInvitar) {
              try {
                const invitacion = await invitarEmpleado({
                  empleadoId: creationResult.empleadoId,
                  empresaId: session.user.empresaId,
                  email: creationResult.email,
                  nombre: creationResult.nombre,
                  apellidos: creationResult.apellidos,
                  tipoOnboarding: 'simplificado',
                  empresaNombre,
                });

                if (!invitacion.success) {
                  resultados.errores.push(
                    `Error al crear invitación: ${creationResult.email}`
                  );
                  return {
                    success: false,
                    empleado: creationResult,
                    invitacionEnviada: false,
                  };
                }

                if (!invitacion.emailEnviado) {
                  resultados.errores.push(
                    `No se pudo enviar el email de invitación: ${creationResult.email}`
                  );
                  return {
                    success: false,
                    empleado: creationResult,
                    invitacionEnviada: false,
                  };
                }

                return {
                  success: true,
                  empleado: creationResult,
                  invitacionEnviada: true,
                };
              } catch (error) {
                console.error(
                  `[ConfirmarImportacion] Error creando invitación para ${creationResult.email}:`,
                  error
                );
                resultados.errores.push(
                  `Error al crear invitación: ${creationResult.email}`
                );
                return { success: false, empleado: creationResult, invitacionEnviada: false };
              }
            }

            return { success: true, empleado: creationResult, invitacionEnviada: true };
          } catch (error) {
            console.error(
              `[ConfirmarImportacion] Error creando empleado ${empleadoData.email}:`,
              error
            );
            resultados.errores.push(
              `Error al crear empleado: ${empleadoData.email}`
            );
            return null;
          }
        });

        // Esperar a que todos los empleados del chunk se procesen
        const results = await Promise.allSettled(creationPromises);

        // Contabilizar resultados
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            resultados.empleadosCreados++;
            if (result.value.success) {
              resultados.invitacionesEnviadas++;
            }
            // Agregar empleado a la lista de importados
            if (result.value.empleado) {
              resultados.empleadosImportados.push({
                id: result.value.empleado.empleadoId,
                nombre: result.value.empleado.nombre,
                apellidos: result.value.empleado.apellidos,
                email: result.value.empleado.email,
                puesto: result.value.empleado.puesto,
                equipo: result.value.empleado.equipo,
                fechaAlta: result.value.empleado.fechaAlta,
                salarioBrutoAnual: result.value.empleado.salarioBrutoAnual,
                invitacionEnviada: result.value.invitacionEnviada || false,
              });
            }
          }
        });
      }
    }

    // 3. Asignar managers (segunda pasada)
    // Extraer todos los managers únicos de los empleados importados
    const managersUnicos = new Set<string>();
    
    // Agregar managers detectados por la IA
    if (body.managersDetectados && body.managersDetectados.length > 0) {
      body.managersDetectados.forEach((m) => managersUnicos.add(m.toLowerCase().trim()));
    }
    
    // Agregar managers del campo manager de cada empleado
    empleadosValidos.forEach((emp) => {
      if (emp.manager && emp.manager.trim()) {
        managersUnicos.add(emp.manager.toLowerCase().trim());
      }
    });

    if (managersUnicos.size > 0) {
      console.log(`[ConfirmarImportacion] Asignando ${managersUnicos.size} managers...`);
      
      // Crear mapa de managers: email/nombre -> empleadoId
      const managersMap = new Map<string, string>();
      
      for (const managerInfo of Array.from(managersUnicos)) {
        try {
          // Buscar por email (primero intentar email)
          let managerEmpleado = await prisma.empleado.findFirst({
            where: {
              empresaId: session.user.empresaId,
              email: managerInfo,
            },
          });

          // Si no se encuentra por email, buscar por nombre completo
          if (!managerEmpleado) {
            // Intentar dividir el nombre en nombre y apellidos
            const partesNombre = managerInfo.split(' ');
            if (partesNombre.length >= 2) {
              const nombre = partesNombre[0];
              const apellidos = partesNombre.slice(1).join(' ');
              
              managerEmpleado = await prisma.empleado.findFirst({
                where: {
                  empresaId: session.user.empresaId,
                  nombre: { contains: nombre, mode: 'insensitive' },
                  apellidos: { contains: apellidos, mode: 'insensitive' },
                },
              });
            } else if (partesNombre.length === 1) {
              // Solo nombre, buscar por nombre o apellidos
              managerEmpleado = await prisma.empleado.findFirst({
                where: {
                  empresaId: session.user.empresaId,
                  OR: [
                    { nombre: { contains: partesNombre[0], mode: 'insensitive' } },
                    { apellidos: { contains: partesNombre[0], mode: 'insensitive' } },
                  ],
                },
              });
            }
          }

          if (managerEmpleado) {
            managersMap.set(managerInfo, managerEmpleado.id);
            console.log(`[ConfirmarImportacion] Manager encontrado: ${managerInfo} -> ${managerEmpleado.id}`);
          } else {
            console.warn(`[ConfirmarImportacion] Manager no encontrado: ${managerInfo}`);
          }
        } catch (error) {
          console.error(`[ConfirmarImportacion] Error buscando manager ${managerInfo}:`, error);
        }
      }

      // Asignar managers a empleados y equipos
      let managersAsignados = 0;
      
      for (const empleadoData of empleadosValidos) {
        try {
          if (empleadoData.manager && empleadoData.manager.trim()) {
            const managerKey = empleadoData.manager.toLowerCase().trim();
            
            if (managersMap.has(managerKey)) {
              const managerId = managersMap.get(managerKey)!;
              
              // Buscar el empleado creado
              const empleadoCreado = await prisma.empleado.findFirst({
                where: {
                  empresaId: session.user.empresaId,
                  email: empleadoData.email!.toLowerCase(),
                },
              });

              if (empleadoCreado) {
                // 1. Asignar managerId al empleado (relación directa manager)
                await prisma.empleado.update({
                  where: { id: empleadoCreado.id },
                  data: { managerId },
                });

                // 2. Si el empleado tiene equipo, asignar el manager como manager del equipo
                // (solo si el equipo no tiene manager)
                if (empleadoData.equipo && equiposCreados.has(empleadoData.equipo)) {
                  const equipoId = equiposCreados.get(empleadoData.equipo)!;
                  
                  // Verificar si el equipo ya tiene un manager, si no, asignarlo
                  const equipo = await prisma.equipo.findUnique({
                    where: { id: equipoId },
                    select: { managerId: true },
                  });

                  if (!equipo?.managerId) {
                    await prisma.equipo.update({
                      where: { id: equipoId },
                      data: { managerId },
                    });
                    console.log(`[ConfirmarImportacion] Manager asignado al equipo: ${empleadoData.equipo}`);
                  }
                }

                managersAsignados++;
              }
            }
          }
        } catch (error) {
          console.error(
            `[ConfirmarImportacion] Error asignando manager para ${empleadoData.email}:`,
            error
          );
        }
      }

      console.log(`[ConfirmarImportacion] Managers asignados: ${managersAsignados}`);
    }

    console.log('[ConfirmarImportacion] Resultados:', resultados);

    return NextResponse.json({
      success: true,
      data: resultados,
    });
  } catch (error) {
    console.error('[ConfirmarImportacion] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al confirmar la importación',
      },
      { status: 500 }
    );
  }
}

