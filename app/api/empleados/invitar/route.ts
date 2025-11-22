// ========================================
// API Route: Enviar Invitación a Empleado
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  requireAuthAsHR,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { sendOnboardingEmail } from '@/lib/email';
import { crearOnboarding } from '@/lib/onboarding';


const invitacionSchema = z.object({
  empleadoId: z.string().uuid(),
  email: z.string().email().optional(), // Email opcional, si no se provee usa el del empleado
  tipoOnboarding: z.enum(['completo', 'simplificado']).optional(), // Tipo de onboarding, por defecto 'completo'
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

    const { empleadoId, tipoOnboarding = 'completo' } = validatedData;

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

    // Verificar si ya existe un onboarding activo reciente (últimos 10 segundos)
    // Esto previene llamadas duplicadas que generan tokens inválidos
    const onboardingExistente = await prisma.onboardingEmpleado.findUnique({
      where: { empleadoId },
    });

    if (onboardingExistente && !onboardingExistente.completado) {
      const tiempoDesdeCreacion = Date.now() - onboardingExistente.createdAt.getTime();
      const TIEMPO_MINIMO_SEGUNDOS = 10 * 1000; // 10 segundos

      if (tiempoDesdeCreacion < TIEMPO_MINIMO_SEGUNDOS) {
        // Ya existe un onboarding activo creado recientemente, devolver el existente
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const path = onboardingExistente.tipoOnboarding === 'completo' ? 'onboarding' : 'onboarding-simplificado';
        const url = `${baseUrl}/${path}/${onboardingExistente.token}`;

        console.log(`[Onboarding] Onboarding ya existe para empleado ${empleadoId}, reutilizando token existente`);
        
        return successResponse({
          success: true,
          url,
          message: 'Invitación de onboarding ya existe (reutilizando token existente)',
        });
      }
    }

    // Crear onboarding (genera token y link)
    const result = await crearOnboarding(
      empleadoId,
      session.user.empresaId,
      tipoOnboarding
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









