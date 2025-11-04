// ========================================
// API Route: Enviar Invitación a Empleado
// ========================================

import { NextRequest } from 'next/server';
import { crearOnboarding } from '@/lib/onboarding';
import { sendOnboardingEmail } from '@/lib/email';
import {
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { z } from 'zod';

const invitacionSchema = z.object({
  empleadoId: z.string().uuid(),
  email: z.string().email().optional(), // Email opcional, si no se provee usa el del empleado
});

// POST /api/empleados/invitar - Enviar invitación a empleado (solo HR Admin)
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(req, invitacionSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { empleadoId } = validatedData;

    // Verificar que el empleado existe y pertenece a la misma empresa
    const { prisma } = await import('@/lib/prisma');
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      include: {
        empresa: true,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    if (empleado.empresaId !== session.user.empresaId) {
      return forbiddenResponse('El empleado no pertenece a tu empresa');
    }

    // Usar email provisto o email del empleado
    const email = validatedData.email || empleado.email;

    if (!email) {
      return badRequestResponse('El empleado no tiene email configurado');
    }

    // Crear onboarding (genera token y link)
    const result = await crearOnboarding(
      empleadoId,
      session.user.empresaId
    );

    if (!result.success) {
      return successResponse(
        { error: result.error },
        500
      );
    }

    // Después del check anterior, TypeScript sabe que result.success es true
    // Por lo tanto, result.url está disponible
    const { url } = result;

    // Enviar email de onboarding
    try {
      await sendOnboardingEmail(
        empleado.nombre,
        empleado.apellidos,
        email,
        empleado.empresa.nombre,
        url
      );
      console.log(`[Onboarding] Email enviado a ${email}: ${url}`);
    } catch (emailError) {
      console.error('[Onboarding] Error al enviar email:', emailError);
      // No fallar si el email falla, el onboarding ya está creado
    }

    return successResponse({
      success: true,
      url,
      message: 'Invitación de onboarding enviada correctamente',
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/empleados/invitar');
  }
}









