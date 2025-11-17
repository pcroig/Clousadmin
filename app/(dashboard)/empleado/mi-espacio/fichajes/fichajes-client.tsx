'use client';

import { FichajesTab } from '@/components/shared/mi-espacio/fichajes-tab';
import type { MiEspacioEmpleado } from '@/types/empleado';

interface MiEspacioFichajesClientProps {
  empleadoId: string;
  empleado?: MiEspacioEmpleado;
}

export function MiEspacioFichajesClient({ empleadoId, empleado }: MiEspacioFichajesClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fichajes</h1>
        <p className="text-sm text-gray-500">
          Revisa tus jornadas registradas y solicita correcciones si es necesario
        </p>
      </div>
      <FichajesTab empleadoId={empleadoId} empleado={empleado} contexto="empleado" />
    </div>
  );
}

