// ========================================
// Add Empleados Onboarding - Componente Multi-opción
// ========================================
// Componente para añadir empleados durante el onboarding de empresa:
// 1. Manual: Formulario completo manual (opción principal)
// 2. Individual: Subir documento (contrato/DNI) y autocompletar con IA
// 3. Masivo: Subir Excel con múltiples empleados

'use client';

import { FileText, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';

import { SubirDocumentoIndividual } from '@/components/documentos/subir-documento-individual';
import { AddPersonaManualForm } from '@/components/organizacion/add-persona-manual-form';
import { ImportarEmpleadosExcel } from '@/components/shared/importar-empleados-excel';
import { Button } from '@/components/ui/button';

interface AddEmpleadosOnboardingProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddEmpleadosOnboarding({ onSuccess, onCancel }: AddEmpleadosOnboardingProps) {
  const [mode, setMode] = useState<'select' | 'manual' | 'individual' | 'masivo'>('select');

  // Pantalla de selección inicial
  if (mode === 'select') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Opción Manual (principal) */}
          <button
            onClick={() => setMode('manual')}
            className="flex flex-col items-center p-6 border-2 border-primary bg-primary/5 rounded-lg hover:border-primary hover:bg-primary/10 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Añadir Manual</h3>
            <p className="text-sm text-gray-600 text-center">
              Introduce los datos del empleado manualmente
            </p>
            <p className="text-xs text-primary mt-2 font-medium">Recomendado</p>
          </button>

          {/* Opción Individual */}
          <button
            onClick={() => setMode('individual')}
            className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors">
              <FileText className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Desde Documento</h3>
            <p className="text-sm text-gray-600 text-center">
              Sube un contrato o DNI y la IA extraerá los datos
            </p>
            <p className="text-xs text-gray-500 mt-2">PDF, JPG, PNG</p>
          </button>

          {/* Opción Masiva */}
          <button
            onClick={() => setMode('masivo')}
            className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Desde Excel</h3>
            <p className="text-sm text-gray-600 text-center">
              Importa múltiples empleados desde un archivo Excel
            </p>
            <p className="text-xs text-gray-500 mt-2">XLSX, XLS, CSV</p>
          </button>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Pantalla de formulario manual
  if (mode === 'manual') {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMode('select')}
          className="mb-2"
        >
          ← Volver a opciones
        </Button>
        <AddPersonaManualForm
          onSuccess={onSuccess}
          onCancel={() => setMode('select')}
        />
      </div>
    );
  }

  // Pantalla de documento individual
  if (mode === 'individual') {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMode('select')}
          className="mb-2"
        >
          ← Volver a opciones
        </Button>
        <SubirDocumentoIndividual
          onSuccess={onSuccess}
          onCancel={() => setMode('select')}
        />
      </div>
    );
  }

  // Pantalla de Excel masivo
  if (mode === 'masivo') {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMode('select')}
          className="mb-2"
        >
          ← Volver a opciones
        </Button>
        <ImportarEmpleadosExcel
          onSuccess={onSuccess}
          onCancel={() => setMode('select')}
          showCancelButton={false}
          showFinishButton={false}
        />
      </div>
    );
  }

  return null;
}
