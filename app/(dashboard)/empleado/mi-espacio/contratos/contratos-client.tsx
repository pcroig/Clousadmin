'use client';

import { ContratosTab } from '@/components/shared/mi-espacio/contratos-tab';

import type { MiEspacioEmpleado } from '@/types/empleado';

interface MiEspacioContratosClientProps {
  empleado: MiEspacioEmpleado;
}

export function MiEspacioContratosClient({ empleado }: MiEspacioContratosClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis contratos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consulta tu información laboral, historial salarial y beneficios
        </p>
      </div>

      <ContratosTab empleado={empleado} rol="empleado" />
    </div>
  );
}
