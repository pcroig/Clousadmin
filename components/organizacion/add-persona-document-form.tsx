// ========================================
// Add Persona Document Form - Importar
// ========================================
// Formulario para importar empleados:
// 1. Individual: subir documento (contrato/DNI) y autocompletar con IA
// 2. Masivo: subir Excel con múltiples empleados

'use client';

import { useState } from 'react';
import { FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubirDocumentoIndividual } from '@/components/documentos/subir-documento-individual';
import { ImportarEmpleadosExcel } from '@/components/shared/importar-empleados-excel';

interface AddPersonaDocumentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddPersonaDocumentForm({ onSuccess, onCancel }: AddPersonaDocumentFormProps) {
  const [mode, setMode] = useState<'select' | 'individual' | 'masivo'>('select');

  // Pantalla de selección inicial
  if (mode === 'select') {
    return (
      <div className="space-y-6">
        <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-2">📥 Importar empleados</p>
          <p className="text-gray-600">Elige cómo deseas importar los datos de los empleados:</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opción Individual */}
          <button
            onClick={() => setMode('individual')}
            className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors">
              <FileText className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Documento Individual</h3>
            <p className="text-sm text-gray-600 text-center">
              Sube un contrato o DNI y la IA extraerá automáticamente los datos
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
            <h3 className="font-semibold text-lg mb-2">Excel Masivo</h3>
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
        <SubirDocumentoIndividual onSuccess={onSuccess} onCancel={onCancel} />
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
        <ImportarEmpleadosExcel onSuccess={onSuccess} onCancel={onCancel} />
      </div>
    );
  }

  return null;
}







