import type { SessionData } from '@/types/auth';
import type { Prisma, PrismaClient } from '@prisma/client';


type PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient;

/**
 * Resuelve el identificador de empleado que actúa como aprobador
 * a partir de los datos de sesión. Si la sesión no incluye el
 * `empleadoId`, hace una búsqueda puntual en Prisma utilizando
 * el `usuarioId`. Devuelve `null` cuando no existe relación.
 */
export async function resolveAprobadorEmpleadoId(
  prismaClient: PrismaClientOrTransaction,
  session: SessionData,
  logContext: string = 'Solicitudes'
): Promise<string | null> {
  if (session.user.empleadoId) {
    return session.user.empleadoId;
  }

  const empleado = await prismaClient.empleado.findFirst({
    where: { usuarioId: session.user.id },
    select: { id: true },
  });

  if (!empleado) {
    console.warn(
      `[${logContext}] Usuario ${session.user.id} (${session.user.email}) no tiene empleado asociado; se registrará la aprobación sin aprobadorId`
    );
    return null;
  }

  return empleado.id;
}


