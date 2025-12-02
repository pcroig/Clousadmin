'use client';

// ========================================
// Wizard Steps - Navegación por pasos
// ========================================
// Componente para flujos multi-paso con navegación secuencial

import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  label: string;
}

export interface WizardStepsProps {
  steps: WizardStep[];
  currentStep: string;
  onStepChange: (stepId: string) => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function WizardSteps({
  steps,
  currentStep,
  onStepChange,
  canGoNext = true,
  canGoPrevious = true,
  onNext,
  onPrevious,
  children,
  className,
}: WizardStepsProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === steps.length - 1;

  const handlePrevious = () => {
    if (!isFirstStep && canGoPrevious) {
      if (onPrevious) {
        onPrevious();
      } else {
        onStepChange(steps[currentIndex - 1].id);
      }
    }
  };

  const handleNext = () => {
    if (!isLastStep && canGoNext) {
      if (onNext) {
        onNext();
      } else {
        onStepChange(steps[currentIndex + 1].id);
      }
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 mb-6 pb-4 border-b">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = index < currentIndex;
          
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onStepChange(step.id)}
                disabled={index > currentIndex}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive && 'bg-gray-100 text-gray-900',
                  isCompleted && !isActive && 'text-gray-600 hover:bg-gray-50',
                  index > currentIndex && 'text-gray-400 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold',
                    isActive && 'bg-blue-600 text-white',
                    isCompleted && !isActive && 'bg-green-600 text-white',
                    index > currentIndex && 'bg-gray-200 text-gray-500'
                  )}
                >
                  {index + 1}
                </div>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-200" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep || !canGoPrevious}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <div className="text-sm text-gray-500">
          Paso {currentIndex + 1} de {steps.length}
        </div>

        <Button
          type="button"
          onClick={handleNext}
          disabled={isLastStep || !canGoNext}
          className="gap-2"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

