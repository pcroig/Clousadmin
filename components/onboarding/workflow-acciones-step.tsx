'use client';

// ========================================
// Workflow Acciones Step - Onboarding Employee
// ========================================
// Component that displays all workflow actions as expandable accordion cards
// Employee can complete actions in any order

import { CheckCircle2 } from 'lucide-react';

import type {
  CompartirDocsConfig,
  RellenarCamposConfig,
  SolicitarDocsConfig,
  SolicitarFirmaConfig,
  WorkflowAccion,
} from '@/lib/onboarding-config-types';

import { CompartirDocsStep } from '@/components/onboarding/compartir-docs-step';
import { RellenarCamposStep } from '@/components/onboarding/rellenar-campos-step';
import { SolicitarDocsStep } from '@/components/onboarding/solicitar-docs-step';
import { SolicitarFirmaStep } from '@/components/onboarding/solicitar-firma-step';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

interface WorkflowAccionesStepProps {
  acciones: WorkflowAccion[];
  progresoAcciones: Record<string, boolean>;
  empleadoId: string;
  token: string;
  onAccionCompletada: (accionId: string, datos?: Record<string, unknown>) => Promise<void>;
  onFinalizarTodo: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function WorkflowAccionesStep({
  acciones,
  progresoAcciones,
  empleadoId,
  token,
  onAccionCompletada,
  onFinalizarTodo,
  onBack,
  showBackButton = true,
}: WorkflowAccionesStepProps) {
  const todasCompletadas = acciones.every((accion) => progresoAcciones[accion.id]);

  const renderAccionContent = (accion: WorkflowAccion) => {
    const yaCompletada = progresoAcciones[accion.id];

    switch (accion.tipo) {
      case 'rellenar_campos':
        return (
          <RellenarCamposStep
            config={accion.config as RellenarCamposConfig}
            datosActuales={{}}
            onGuardar={(datos) => onAccionCompletada(accion.id, datos)}
          />
        );

      case 'compartir_docs':
        return (
          <CompartirDocsStep
            config={accion.config as CompartirDocsConfig}
            onMarcarLeido={() => onAccionCompletada(accion.id)}
          />
        );

      case 'solicitar_docs':
        return (
          <SolicitarDocsStep
            config={accion.config as SolicitarDocsConfig}
            empleadoId={empleadoId}
            onDocumentosSubidos={() => onAccionCompletada(accion.id)}
          />
        );

      case 'solicitar_firma':
        return (
          <SolicitarFirmaStep
            config={accion.config as SolicitarFirmaConfig}
            empleadoId={empleadoId}
            token={token}
            onTodasFirmadas={() => onAccionCompletada(accion.id)}
          />
        );

      default:
        return (
          <div className="text-center py-6 text-gray-500">
            Tipo de acción no soportado
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        {acciones.map((accion) => {
          const completada = progresoAcciones[accion.id];

          return (
            <AccordionItem
              key={accion.id}
              value={accion.id}
              className={`border rounded-lg ${
                completada ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  {completada ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="text-base font-semibold">{accion.titulo}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {completada ? (
                  <div className="text-center py-6 text-green-700">
                    ✓ Acción completada
                  </div>
                ) : (
                  renderAccionContent(accion)
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="flex justify-between pt-4 border-t">
        {showBackButton && onBack && (
          <Button variant="outline" onClick={onBack}>
            Anterior
          </Button>
        )}
        <Button
          onClick={onFinalizarTodo}
          disabled={!todasCompletadas}
          className={!showBackButton ? 'ml-auto' : ''}
        >
          Completar onboarding
        </Button>
      </div>
    </div>
  );
}
