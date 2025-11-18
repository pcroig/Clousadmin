'use client';

import { AusenciasTab } from '@/components/shared/mi-espacio/ausencias-tab';

interface MiEspacioAusenciasClientProps {
  empleadoId: string;
}

export function MiEspacioAusenciasClient({ empleadoId }: MiEspacioAusenciasClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ausencias</h1>
        <p className="text-sm text-gray-500">
          Consulta tu saldo, calendario y solicita nuevas ausencias
        </p>
      </div>
      <AusenciasTab empleadoId={empleadoId} contexto="empleado" />
    </div>
  );
}


