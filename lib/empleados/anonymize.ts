// ========================================
// Empleado - Anonimización (Derecho al Olvido)
// ========================================
// Helpers reutilizables para anonimizar empleados manteniendo integridad referencial

import { Prisma, PrismaClient } from '@prisma/client';

import { EstadoEmpleado } from '@/lib/constants/enums';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

interface AnonymizeEmpleadoParams {
  empleadoId: string;
  empresaId: string;
}

interface AnonymizeEmpleadoResult {
  anonymizedEmail: string;
}

function buildAnonEmail(empleadoId: string): string {
  return `anon-${empleadoId}@anon.clousadmin`;
}

/**
 * Anonimiza un empleado (derecho al olvido)
 * - Limpia campos personales y bancarios
 * - Desactiva la cuenta asociada
 * - Mantiene relaciones para históricos (ausencias, fichajes, etc.)
 */
export async function anonymizeEmpleado(
  tx: TransactionClient,
  { empleadoId, empresaId }: AnonymizeEmpleadoParams
): Promise<AnonymizeEmpleadoResult> {
  const empleado = await tx.empleado.findFirst({
    where: { id: empleadoId, empresaId },
    select: {
      id: true,
      empresaId: true,
      usuarioId: true,
    },
  });

  if (!empleado) {
    throw new Error('Empleado no encontrado en la empresa actual');
  }

  const anonymizedEmail = buildAnonEmail(empleado.id);

  const empleadoData: Prisma.EmpleadoUpdateInput = {
    nombre: 'Empleado',
    apellidos: 'Anonimizado',
    email: anonymizedEmail,
    fotoUrl: null,
    telefono: null,
    direccionCalle: null,
    direccionNumero: null,
    direccionPiso: null,
    codigoPostal: null,
    ciudad: null,
    direccionProvincia: null,
    estadoCivil: null,
    numeroHijos: 0,
    genero: null,
    iban: null,
    titularCuenta: null,
    nif: null,
    nss: null,
    fechaNacimiento: null,
    puesto: null,
    categoriaProfesional: null,
    nivelEducacion: null,
    grupoCotizacion: null,
    estadoEmpleado: EstadoEmpleado.baja,
    manager: {
      disconnect: true,
    },
    firmaGuardada: false,
    firmaS3Key: null,
    firmaGuardadaData: Prisma.JsonNull,
    documentosCompletos: false,
    documentosCompletadosEn: null,
    onboardingCompletado: false,
    onboardingCompletadoEn: null,
    activo: false,
  };

  await tx.empleado.update({
    where: { id: empleado.id },
    data: empleadoData,
  });

  if (empleado.usuarioId) {
    await tx.usuario.update({
      where: { id: empleado.usuarioId },
      data: {
        email: anonymizedEmail,
        nombre: 'Cuenta',
        apellidos: 'Anonimizada',
        password: null,
        googleId: null,
        cognitoId: null,
        avatar: null,
        activo: false,
      },
    });
  }

  await tx.empleadoEquipo.deleteMany({
    where: { empleadoId: empleado.id },
  });

  await tx.consentimiento.deleteMany({
    where: { empleadoId: empleado.id },
  });

  return { anonymizedEmail };
}

