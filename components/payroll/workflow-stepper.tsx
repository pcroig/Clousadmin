'use client';

const WORKFLOW_STEPS = [
  { key: 'generando', label: 'Generando' },
  { key: 'complementos_pendientes', label: 'Complementos' },
  { key: 'lista_exportar', label: 'Exportar' },
  { key: 'exportada', label: 'Enviada' },
  { key: 'definitiva', label: 'Definitiva' },
  { key: 'publicada', label: 'Publicada' },
];

interface WorkflowStepperProps {
  estadoActual: string;
  compact?: boolean;
}

export function WorkflowStepper({ estadoActual, compact = false }: WorkflowStepperProps) {
  const currentIndex = WORKFLOW_STEPS.findIndex((step) => step.key === estadoActual);

  return (
    <div className={compact ? 'flex items-center gap-1' : 'flex items-center gap-3'}>
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const baseCircle =
          'w-2.5 h-2.5 rounded-full transition-colors ' +
          (isCompleted
            ? 'bg-green-600'
            : isActive
            ? 'bg-blue-600 ring-2 ring-blue-100'
            : 'bg-gray-300');

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={baseCircle} />
              {!compact && (
                <span
                  className={
                    'text-xs font-medium ' +
                    (isCompleted ? 'text-green-700' : isActive ? 'text-blue-700' : 'text-gray-400')
                  }
                >
                  {step.label}
                </span>
              )}
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div
                className={
                  'h-0.5 rounded flex-1 mx-1 ' +
                  (isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-400' : 'bg-gray-200')
                }
                style={{ width: compact ? 16 : 32 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export { WORKFLOW_STEPS };


