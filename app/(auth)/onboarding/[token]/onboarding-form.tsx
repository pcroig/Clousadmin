// ========================================
// Onboarding Form - Multi-Step with Workflow Actions
// ========================================
// Formulario multi-paso para onboarding completo (empleados nuevos)
// Paso 1: Credenciales (avatar + contraseña)
// Paso 2: Integraciones (calendario + app mensajería)
// Paso 3: PWA (explicación instalación móvil)
// Paso 4+: Acciones del workflow configuradas por la empresa

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { CredencialesForm, type OnboardingEmpleado } from '@/components/onboarding/credenciales-form';
import { IntegracionesForm } from '@/components/onboarding/integraciones-form';
import { PWAExplicacion } from '@/components/onboarding/pwa-explicacion';
import { WorkflowAccionesStep } from '@/components/onboarding/workflow-acciones-step';

import type {
  WorkflowAccion,
} from '@/lib/onboarding-config-types';
import type { DatosTemporales, ProgresoOnboardingWorkflow } from '@/lib/onboarding';

interface OnboardingFormProps {
  token: string;
  empleado: OnboardingEmpleado & { empresaId?: string; id: string };
  progreso: ProgresoOnboardingWorkflow;
  datosTemporales: DatosTemporales | null;
  empresaNombre?: string;
  workflow: WorkflowAccion[];
}

export function OnboardingForm({
  token,
  empleado,
  progreso,
  datosTemporales: _datosTemporales,
  empresaNombre,
  workflow,
}: OnboardingFormProps) {
  const router = useRouter();

  // Filtrar acciones activas del workflow
  const accionesActivas = workflow.filter(a => a.activo);

  // Calcular total de pasos (3 base + 1 paso de workflow si hay acciones)
  const totalPasos = accionesActivas.length > 0 ? 4 : 3;

  const [currentStep, setCurrentStep] = useState(() => {
    // Determinar paso inicial basado en progreso
    if (!progreso.credenciales_completadas) return 1;
    if (!progreso.integraciones) return 2;
    if (!progreso.pwa_explicacion) return 3;

    // Si hay acciones del workflow, verificar si están completas
    if (accionesActivas.length > 0) {
      const todasCompletadas = accionesActivas.every(accion => progreso.acciones[accion.id]);
      if (!todasCompletadas) return 4; // Paso 4 es el único paso de workflow
    }

    return 1; // Default to first step if all completed
  });

  const [isCompleting, setIsCompleting] = useState(false);
  const [progresoLocal, setProgresoLocal] = useState(progreso);

  const nombreBase = (empleado.nombre ?? empleado.apellidos ?? 'equipo').trim();
  const saludoNombre = (nombreBase ? nombreBase.split(' ')[0] : 'equipo') || 'equipo';
  const nombreEmpresa = (empresaNombre ?? 'Clousadmin').trim() || 'Clousadmin';

  // Construir lista de pasos (base + workflow)
  const stepsBase = [
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

  // Si hay acciones del workflow, añadir un solo paso que las contiene todas
  const workflowStep = accionesActivas.length > 0 ? [
    {
      number: 4,
      title: 'Completa tu perfil',
      description: 'Finaliza las acciones pendientes',
      completed: accionesActivas.every(accion => progresoLocal.acciones[accion.id]),
    },
  ] : [];

  const steps = [...stepsBase, ...workflowStep];

  // Obtener título y descripción dinámicos según el paso actual
  const getCurrentStepInfo = () => {
    if (currentStep === 1) {
      return {
        title: `Hola ${saludoNombre}, bienvenido a ${nombreEmpresa}`,
        description: `Configura tu acceso a ${nombreEmpresa}.`,
      };
    }
    if (currentStep === 2) {
      return {
        title: 'Conecta tus herramientas de trabajo',
        description: 'Sincroniza tu calendario y app de mensajería.',
      };
    }
    if (currentStep === 3) {
      return {
        title: 'Instala Clousadmin en tu móvil',
        description: 'Accede fácilmente desde tu smartphone.',
      };
    }
    if (currentStep === 4 && accionesActivas.length > 0) {
      return {
        title: 'Completa tu perfil',
        description: 'Finaliza las acciones pendientes para activar tu cuenta.',
      };
    }
    return {
      title: `Hola ${saludoNombre}, bienvenido a ${nombreEmpresa}`,
      description: `Completa estos pasos para activar tu cuenta en ${nombreEmpresa}.`,
    };
  };

  const stepInfo = getCurrentStepInfo();

  const handleStepComplete = async (stepNumber: number) => {
    // Avanzar al siguiente paso o finalizar
    if (stepNumber < totalPasos) {
      setCurrentStep(stepNumber + 1);
    } else {
      handleFinalizarOnboarding();
    }
  };

  const handleActualizarDatos = async (accionId: string, datos?: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/onboarding/${token}/progreso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accionId, completado: true, datos }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar datos');
      }

      // Actualizar estado local inmediatamente
      setProgresoLocal(prev => ({
        ...prev,
        acciones: {
          ...prev.acciones,
          [accionId]: true,
        },
      }));

      toast.success('Acción completada correctamente');
    } catch (error) {
      console.error('[handleActualizarDatos] Error:', error);
      toast.error('Error al guardar los datos');
      throw error;
    }
  };

  const handleFinalizarOnboarding = async () => {
    setIsCompleting(true);
    try {
      // Si es el último paso (PWA o última acción), marcar PWA como completado si es necesario
      if (!progreso.pwa_explicacion) {
        const pwaRes = await fetch(`/api/onboarding/${token}/pwa-completado`, {
          method: 'POST',
        });

        const pwaData = await pwaRes.json() as { success?: boolean; error?: string };

        if (!pwaRes.ok || !pwaData.success) {
          toast.error(pwaData.error || 'Error al marcar PWA como completado');
          setIsCompleting(false);
          return;
        }
      }

      const res = await fetch(`/api/onboarding/${token}/finalizar`, {
        method: 'POST',
      });

      const data = await res.json() as { success?: boolean; error?: string; redirectUrl?: string };

      if (res.ok && data.success) {
        toast.success('¡Onboarding completado!');
        router.push(data.redirectUrl || '/empleado/mi-espacio');
        router.refresh();
      } else {
        toast.error(data.error || 'Error al finalizar onboarding');
        setIsCompleting(false);
      }
    } catch (err) {
      console.error('[OnboardingForm] Error:', err);
      toast.error('Error de conexión. Inténtalo de nuevo.');
      setIsCompleting(false);
    }
  };

  // Renderizar contenido del paso actual
  const renderStepContent = () => {
    // Pasos base (1-3)
    if (currentStep === 1) {
      return (
        <CredencialesForm
          token={token}
          empleado={empleado}
          onComplete={() => handleStepComplete(1)}
          initialProgress={progreso.credenciales_completadas}
        />
      );
    }

    if (currentStep === 2) {
      return (
        <IntegracionesForm
          token={token}
          empresaId={empleado.empresaId}
          onComplete={() => handleStepComplete(2)}
          onSkip={() => handleStepComplete(2)}
          simplified={false}
        />
      );
    }

    if (currentStep === 3) {
      // Si hay acciones del workflow, mostrar botón "Siguiente", si no "Completar onboarding"
      const hayAccionesWorkflow = accionesActivas.length > 0;

      return (
        <PWAExplicacion
          token={token}
          onComplete={() => handleStepComplete(3)}
          showCompleteButton={true}
          buttonText={hayAccionesWorkflow ? 'Siguiente' : 'Completar onboarding'}
          loading={isCompleting}
          onBack={() => setCurrentStep(2)}
          showBackButton={true}
        />
      );
    }

    // Paso 4: Workflow actions (todas en acordeones)
    if (currentStep === 4 && accionesActivas.length > 0) {
      return (
        <WorkflowAccionesStep
          acciones={accionesActivas}
          progresoAcciones={progresoLocal.acciones}
          empleadoId={empleado.id}
          token={token}
          onAccionCompletada={handleActualizarDatos}
          onFinalizarTodo={handleFinalizarOnboarding}
          onBack={() => setCurrentStep(3)}
          showBackButton={true}
        />
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {stepInfo.title}
        </h1>
        <p className="text-gray-500">
          {stepInfo.description}
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
        {renderStepContent()}
      </div>
    </div>
  );
}
