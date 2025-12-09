'use client';

// ========================================
// Onboarding Form - Unified Onboarding with Base Steps + Workflow
// ========================================
// Incluye pasos base (Credenciales, Integraciones, PWA) + workflow dinámico

import type { empleados } from '@prisma/client';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CredencialesForm } from '@/components/onboarding/credenciales-form';
import { CompartirDocsStep } from '@/components/onboarding/compartir-docs-step';
import { IntegracionesForm } from '@/components/onboarding/integraciones-form';
import { PWAExplicacion } from '@/components/onboarding/pwa-explicacion';
import { RellenarCamposStep } from '@/components/onboarding/rellenar-campos-step';
import { SolicitarDocsStep } from '@/components/onboarding/solicitar-docs-step';
import { SolicitarFirmaStep } from '@/components/onboarding/solicitar-firma-step';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type {
  CompartirDocsConfig,
  RellenarCamposConfig,
  SolicitarDocsConfig,
  SolicitarFirmaConfig,
  WorkflowAccion,
} from '@/lib/onboarding-config-types';
import { getTipoAccionLabel } from '@/lib/onboarding-config-types';
import type { ProgresoOnboardingWorkflow } from '@/lib/onboarding';

interface OnboardingFormProps {
  token: string;
  empleado: empleados;
  nombreEmpresa: string;
}

// Definición de pasos base (siempre presentes)
type PasoBase = {
  id: 'credenciales' | 'integraciones' | 'pwa';
  titulo: string;
  descripcion: string;
};

const PASOS_BASE: PasoBase[] = [
  {
    id: 'credenciales',
    titulo: 'Credenciales',
    descripcion: 'Configura tu acceso',
  },
  {
    id: 'integraciones',
    titulo: 'Integraciones',
    descripcion: 'Conecta tus herramientas',
  },
  {
    id: 'pwa',
    titulo: 'App Móvil',
    descripcion: 'Instala Clousadmin',
  },
];

export function OnboardingForm({ token, empleado, nombreEmpresa }: OnboardingFormProps) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowAccion[]>([]);
  const [progreso, setProgreso] = useState<ProgresoOnboardingWorkflow>({
    credenciales_completadas: false,
    integraciones: false,
    pwa_explicacion: false,
    acciones: {},
  });
  const [datosTemporales, setDatosTemporales] = useState<Record<string, unknown>>({});
  const [pasoActualIndex, setPasoActualIndex] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [finalizando, setFinalizando] = useState(false);

  useEffect(() => {
    cargarDatosOnboarding();
  }, []);

  const cargarDatosOnboarding = async () => {
    try {
      setCargando(true);

      // Cargar datos del onboarding (workflow, progreso, datos temporales)
      const response = await fetch(`/api/onboarding/${token}`);
      if (!response.ok) throw new Error('Error al cargar onboarding');

      const data = (await response.json()) as {
        workflow: WorkflowAccion[];
        progreso: ProgresoOnboardingWorkflow;
        datosTemporales: Record<string, unknown>;
      };

      // Workflow de la empresa
      setWorkflow(data.workflow || []);

      // Progreso actual
      const progresoData = data.progreso as ProgresoOnboardingWorkflow;
      setProgreso({
        credenciales_completadas: progresoData.credenciales_completadas || false,
        integraciones: progresoData.integraciones || false,
        pwa_explicacion: progresoData.pwa_explicacion || false,
        acciones: progresoData.acciones || {},
      });

      // Datos temporales
      setDatosTemporales(data.datosTemporales || {});

      // Determinar paso actual (primer paso no completado)
      let pasoInicial = 0;
      if (progresoData.credenciales_completadas) pasoInicial = 1;
      if (progresoData.credenciales_completadas && progresoData.integraciones) pasoInicial = 2;
      if (progresoData.credenciales_completadas && progresoData.integraciones && progresoData.pwa_explicacion) {
        // Pasos base completados, buscar primera acción no completada
        const accionesActivas = (data.workflow || []).filter((a: WorkflowAccion) => a.activo);
        const primeraAccionNoCompletada = accionesActivas.findIndex(
          (a: WorkflowAccion) => !progresoData.acciones[a.id]
        );
        pasoInicial = 3 + (primeraAccionNoCompletada >= 0 ? primeraAccionNoCompletada : 0);
      }
      setPasoActualIndex(pasoInicial);
    } catch (error) {
      console.error('[OnboardingForm] Error al cargar:', error);
    } finally {
      setCargando(false);
    }
  };

  const actualizarProgresoBase = async (paso: 'credenciales' | 'integraciones' | 'pwa') => {
    try {
      // Actualizar progreso localmente
      const campoProgreso = paso === 'credenciales'
        ? 'credenciales_completadas'
        : paso === 'integraciones'
        ? 'integraciones'
        : 'pwa_explicacion';

      setProgreso(prev => ({ ...prev, [campoProgreso]: true }));

      // Avanzar al siguiente paso
      setPasoActualIndex(prev => prev + 1);
    } catch (error) {
      console.error('[OnboardingForm] Error al actualizar progreso base:', error);
      throw error;
    }
  };

  const actualizarProgresoAccion = async (accionId: string, completado: boolean, datos?: Record<string, unknown>) => {
    try {
      // Actualizar progreso en el servidor
      const response = await fetch(`/api/onboarding/${token}/progreso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accionId, completado, datos }),
      });

      if (!response.ok) throw new Error('Error al actualizar progreso');

      // Actualizar estado local
      setProgreso(prev => ({
        ...prev,
        acciones: { ...prev.acciones, [accionId]: completado }
      }));

      if (datos) {
        setDatosTemporales(prev => ({ ...prev, ...datos }));
      }

      // Si se completó, avanzar a siguiente acción no completada
      if (completado) {
        const accionesActivas = workflow.filter(a => a.activo);
        const indexActual = pasoActualIndex - 3; // Restar pasos base
        const siguienteNoCompletada = accionesActivas.findIndex(
          (a, idx) => idx > indexActual && !progreso.acciones[a.id] && a.id !== accionId
        );
        if (siguienteNoCompletada >= 0) {
          setPasoActualIndex(3 + siguienteNoCompletada);
        } else {
          // Todas completadas, avanzar más allá del último paso
          setPasoActualIndex(3 + accionesActivas.length);
        }
      }
    } catch (error) {
      console.error('[OnboardingForm] Error al actualizar progreso:', error);
      throw error;
    }
  };

  const finalizarOnboarding = async () => {
    try {
      setFinalizando(true);

      const response = await fetch(`/api/onboarding/${token}/finalizar`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || 'Error al finalizar onboarding');
      }

      // Redirigir al dashboard del empleado
      router.push('/empleado/mi-espacio');
    } catch (error: unknown) {
      console.error('[OnboardingForm] Error al finalizar:', error);
      alert(error instanceof Error ? error.message : 'Error al finalizar onboarding');
    } finally {
      setFinalizando(false);
    }
  };

  // Construir lista completa de pasos (base + acciones)
  const accionesActivas = workflow.filter(a => a.activo);
  const pasosCompletos = [
    ...PASOS_BASE,
    ...accionesActivas.map(a => ({
      id: a.id,
      titulo: a.titulo,
      descripcion: getTipoAccionLabel(a.tipo),
    })),
  ];

  // Calcular progreso total
  const pasosBaseCompletados = [
    progreso.credenciales_completadas,
    progreso.integraciones,
    progreso.pwa_explicacion,
  ].filter(Boolean).length;

  const accionesCompletadas = Object.values(progreso.acciones).filter(Boolean).length;
  const totalCompletados = pasosBaseCompletados + accionesCompletadas;
  const totalPasos = 3 + accionesActivas.length;
  const progresoPercentage = totalPasos > 0 ? (totalCompletados / totalPasos) * 100 : 0;
  const todosCompletados = totalCompletados === totalPasos;

  // Render contenido del paso actual
  const renderPasoActual = () => {
    // Pasos base
    if (pasoActualIndex === 0) {
      return (
        <CredencialesForm
          token={token}
          empleado={empleado}
          onComplete={() => actualizarProgresoBase('credenciales')}
          initialProgress={progreso.credenciales_completadas}
        />
      );
    }

    if (pasoActualIndex === 1) {
      return (
        <IntegracionesForm
          token={token}
          empresaId={empleado.empresaId}
          onComplete={() => actualizarProgresoBase('integraciones')}
          onSkip={() => actualizarProgresoBase('integraciones')}
          simplified={false}
        />
      );
    }

    if (pasoActualIndex === 2) {
      return (
        <PWAExplicacion
          token={token}
          onComplete={() => actualizarProgresoBase('pwa')}
          showCompleteButton={accionesActivas.length === 0} // Si no hay acciones, mostrar botón finalizar
          loading={finalizando}
        />
      );
    }

    // Acciones del workflow
    const accionIndex = pasoActualIndex - 3;
    const accionActual = accionesActivas[accionIndex];

    if (!accionActual) {
      return null; // Todos los pasos completados
    }

    const handleGuardar = async (datos: Record<string, unknown>) => {
      await actualizarProgresoAccion(accionActual.id, true, datos);
    };

    switch (accionActual.tipo) {
      case 'rellenar_campos':
        return (
          <RellenarCamposStep
            config={accionActual.config as RellenarCamposConfig}
            datosActuales={datosTemporales}
            onGuardar={handleGuardar}
          />
        );

      case 'compartir_docs':
        return (
          <CompartirDocsStep
            config={accionActual.config as CompartirDocsConfig}
            onMarcarLeido={() => actualizarProgresoAccion(accionActual.id, true)}
          />
        );

      case 'solicitar_docs':
        return (
          <SolicitarDocsStep
            config={accionActual.config as SolicitarDocsConfig}
            empleadoId={empleado.id}
            onDocumentosSubidos={() => actualizarProgresoAccion(accionActual.id, true)}
          />
        );

      case 'solicitar_firma':
        return (
          <SolicitarFirmaStep
            config={accionActual.config as SolicitarFirmaConfig}
            empleadoId={empleado.id}
            token={token}
            onTodasFirmadas={() => actualizarProgresoAccion(accionActual.id, true)}
          />
        );

      default:
        return <div className="text-center py-12 text-gray-500">Tipo de acción no soportado</div>;
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar izquierdo: Checklist */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
              {empleado.nombre?.[0]}{empleado.apellidos?.[0]}
            </div>
            <div>
              <h2 className="font-semibold text-lg">
                Bienvenido/a, {empleado.nombre}
              </h2>
              <p className="text-sm text-gray-600">{nombreEmpresa}</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Tu Onboarding</span>
              <span className="text-gray-600">
                {totalCompletados}/{totalPasos} completados
              </span>
            </div>
            <Progress value={progresoPercentage} className="h-2" />
          </div>
        </div>

        {/* Lista de pasos (Checklist) */}
        <div className="flex-1 overflow-y-auto p-6">
          <ul className="space-y-3">
            {pasosCompletos.map((paso, index) => {
              const isBase = index < 3;
              const completado = isBase
                ? (index === 0 ? progreso.credenciales_completadas :
                   index === 1 ? progreso.integraciones :
                   progreso.pwa_explicacion)
                : progreso.acciones[paso.id] || false;

              const isActual = index === pasoActualIndex;

              return (
                <li
                  key={paso.id}
                  className={`
                    flex items-start space-x-3 p-3 rounded-lg transition-colors cursor-pointer
                    ${isActual ? 'bg-blue-50 border-l-4 border-blue-600' : ''}
                    ${completado ? 'opacity-70' : ''}
                  `}
                  onClick={() => setPasoActualIndex(index)}
                >
                  <div className={`
                    flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5
                    ${completado
                      ? 'bg-green-500 text-white'
                      : isActual
                      ? 'bg-blue-600 text-white'
                      : 'border-2 border-gray-300 text-gray-400'
                    }
                  `}>
                    {completado ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isActual ? 'text-blue-900' : 'text-gray-900'}`}>
                      {paso.titulo}
                    </p>
                    <p className="text-xs text-gray-500">{paso.descripcion}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer con botón finalizar */}
        {todosCompletados && (
          <div className="p-6 border-t">
            <Button
              onClick={finalizarOnboarding}
              disabled={finalizando}
              className="w-full"
              size="lg"
            >
              {finalizando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                'Finalizar Onboarding'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Contenido derecho: Paso actual */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          {renderPasoActual()}
        </div>
      </div>
    </div>
  );
}
