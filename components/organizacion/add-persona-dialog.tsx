// ========================================
// Add Persona Dialog Component
// ========================================
// Modal con pre-dialog para seleccionar tipo de empleado y luego wizard

'use client';

import { useState } from 'react';

import { NuevaPersonaPreDialog } from './nueva-persona-pre-dialog';
import { AddPersonaOnboardingForm } from './add-persona-onboarding-form';
import { AddPersonaManualForm } from './add-persona-manual-form';

interface AddPersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddPersonaDialog({ open, onOpenChange, onSuccess }: AddPersonaDialogProps) {
  const [tipoEmpleado, setTipoEmpleado] = useState<'nuevo' | 'existente' | null>(null);
  const [showingForm, setShowingForm] = useState(false);

  const handleSelectTipo = (tipo: 'nuevo' | 'existente') => {
    setTipoEmpleado(tipo);
    setShowingForm(true);
  };

  const handleClosePreDialog = (isOpen: boolean) => {
    if (!isOpen) {
      // Solo cerrar todo si no se está mostrando el formulario
      if (!showingForm) {
        onOpenChange(false);
      }
    }
  };

  const handleCloseOnboardingForm = (isOpen: boolean) => {
    if (!isOpen) {
      // Cerrar todo cuando se cierra el formulario
      setShowingForm(false);
      setTipoEmpleado(null);
      onOpenChange(false);
    }
  };

  const handleSuccess = () => {
    setShowingForm(false);
    setTipoEmpleado(null);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <>
      {/* Pre-dialog de selección */}
      {!showingForm && (
        <NuevaPersonaPreDialog
          open={open && !showingForm}
          onOpenChange={handleClosePreDialog}
          onSelectTipo={handleSelectTipo}
        />
      )}

      {/* Formulario de onboarding */}
      {showingForm && tipoEmpleado && (
        <AddPersonaOnboardingForm
          open={open && showingForm}
          onOpenChange={handleCloseOnboardingForm}
          onSuccess={handleSuccess}
          tipoEmpleado={tipoEmpleado}
        />
      )}
    </>
  );
}
