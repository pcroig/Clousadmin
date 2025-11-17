// ========================================
// Solicitudes: Aplicar Cambios con Cifrado
// ========================================
// Helper centralizado para aplicar cambios de solicitudes al empleado
// Garantiza que campos sensibles (iban) se cifran antes de guardar

import { encryptEmpleadoData } from '@/lib/empleado-crypto';
import { esCampoPermitido } from '@/lib/constants/whitelist-campos';
import { Prisma, PrismaClient } from '@prisma/client';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Aplica cambios de una solicitud al empleado, con validación y cifrado
 * 
 * @param tx - Cliente Prisma (transacción)
 * @param solicitudId - ID de la solicitud (para logging)
 * @param empleadoId - ID del empleado a actualizar
 * @param camposCambiados - Campos a cambiar (desde solicitud.camposCambiados)
 * @returns Objeto con arrays de campos aplicados y rechazados
 */
export async function aplicarCambiosSolicitud(
  tx: TransactionClient,
  solicitudId: string,
  empleadoId: string,
  camposCambiados: Record<string, unknown>
): Promise<{ aplicados: string[]; rechazados: string[] }> {
  const cambiosValidados: Prisma.EmpleadoUpdateInput = {};
  const camposRechazados: string[] = [];

  // Filtrar solo campos permitidos (whitelist de seguridad)
  for (const [campo, valor] of Object.entries(camposCambiados)) {
    if (esCampoPermitido(campo)) {
      cambiosValidados[campo] = valor;
    } else {
      camposRechazados.push(campo);
    }
  }

  // Log de campos rechazados por seguridad
  if (camposRechazados.length > 0) {
    console.warn(
      `[Solicitudes] Campos rechazados en solicitud ${solicitudId}: ${camposRechazados.join(', ')}`
    );
  }

  // Aplicar cambios cifrados si hay campos válidos
  if (Object.keys(cambiosValidados).length > 0) {
    // Cifrar campos sensibles (iban, nif, nss) antes de guardar
    const cambiosEncriptados = encryptEmpleadoData(cambiosValidados);
    
    await tx.empleado.update({
      where: { id: empleadoId },
      data: cambiosEncriptados,
    });

    console.log(
      `[Solicitudes] Cambios aplicados en solicitud ${solicitudId}: ${Object.keys(cambiosValidados).join(', ')}`
    );
  }

  return {
    aplicados: Object.keys(cambiosValidados),
    rechazados: camposRechazados,
  };
}

