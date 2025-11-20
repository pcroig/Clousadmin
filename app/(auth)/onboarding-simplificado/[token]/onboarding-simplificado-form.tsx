// ========================================
// Onboarding Simplificado Form
// ========================================
// Formulario multi-paso para onboarding simplificado (empleados existentes)
// Paso 1: Credenciales (avatar + contraseña)
// Paso 2: Integraciones (calendario + app mensajería)
// Paso 3: PWA (explicación instalación móvil)

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { CredencialesForm, type OnboardingEmpleado } from '@/components/onboarding/credenciales-form';
import { IntegracionesForm } from '@/components/onboarding/integraciones-form';
import { PWAExplicacion } from '@/components/onboarding/pwa-explicacion';

import type { DatosTemporales, ProgresoOnboardingSimplificado } from '@/lib/onboarding';

interface OnboardingSimplificadoFormProps {
  token: string;
  empleado: OnboardingEmpleado & { empresaId?: string };
  progreso: ProgresoOnboardingSimplificado;
  datosTemporales: DatosTemporales | null;
}

export function OnboardingSimplificadoForm({
  token,
  empleado,
  progreso,
  datosTemporales: _datosTemporales,
}: OnboardingSimplificadoFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(() => {
    // Determinar paso inicial basado en progreso
    if (!progreso.credenciales_completadas) return 1;
    if (!progreso.integraciones) return 2;
    if (!progreso.pwa_explicacion) return 3;
    return 1; // Default to first step if all completed (should redirect)
  });

  const [isCompleting, setIsCompleting] = useState(false);

  const steps = [
    {
      number: 1,
      title: 'Credenciales',
      description: 'Configura tu acceso',
      completed: progreso.credenciales_completadas,
    },
    {
      number: 2,
      title: 'Integraciones',
      description: 'Conecta tus herramientas de trabajo',
      completed: progreso.integraciones,
    },
    {
      number: 3,
      title: 'App Móvil',
      description: 'Instala Clousadmin en tu móvil',
      completed: progreso.pwa_explicacion,
    },
  ];

  const handleStepComplete = (stepNumber: number) => {
    if (stepNumber < steps.length) {
      setCurrentStep(stepNumber + 1);
    } else {
      handleFinalizarOnboarding();
    }
  };

  const handleFinalizarOnboarding = async () => {
    setIsCompleting(true);
    try {
      const pwaRes = await fetch(`/api/onboarding-simplificado/${token}/pwa-completado`, {
        method: 'POST',
      });

      const pwaData = await pwaRes.json();

      if (!pwaRes.ok || !pwaData.success) {
        toast.error(pwaData.error || 'Error al marcar PWA como completado');
        setIsCompleting(false);
        return;
      }

      const res = await fetch(`/api/onboarding-simplificado/${token}/finalizar`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('¡Onboarding completado! Redirigiendo...');
        setTimeout(() => {
          router.push('/login?onboarding=success');
        }, 2000);
      } else {
        toast.error(data.error || 'Error al finalizar onboarding');
        setIsCompleting(false);
      }
    } catch (err) {
      console.error('[OnboardingSimplificadoForm] Error:', err);
      toast.error('Error de conexión. Inténtalo de nuevo.');
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Onboarding Simplificado</h1>
        <p className="text-gray-500">
          Completa los pasos para activar tu cuenta de empleado.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {steps.map((step) => (
          <div key={step.number} className="flex-1">
            <div
              className={`h-1 transition-colors ${
                step.number <= currentStep || step.completed
                  ? 'bg-gray-600'
                  : 'bg-gray-200'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Contenido del paso actual */}
      <div className="mt-6">
        {currentStep === 1 && (
          <CredencialesForm
            token={token}
            empleado={empleado}
            onComplete={() => handleStepComplete(1)}
            initialProgress={progreso.credenciales_completadas}
          />
        )}
        {currentStep === 2 && (
          <IntegracionesForm
            token={token}
            empresaId={empleado.empresaId}
            onComplete={() => handleStepComplete(2)}
            onSkip={() => handleStepComplete(2)}
            simplified={true}
          />
        )}
        {currentStep === 3 && (
          <PWAExplicacion
            onComplete={() => handleStepComplete(3)}
            showCompleteButton={true}
            loading={isCompleting}
          />
        )}
      </div>
    </div>
  );
}

