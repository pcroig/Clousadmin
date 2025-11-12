'use client';

// ========================================
// Importar Empleados Component - Onboarding
// ========================================
// Wrapper del componente compartido para el flujo de onboarding

import { ImportarEmpleadosExcel } from '@/components/shared/importar-empleados-excel';

export function ImportarEmpleados() {
  return (
    <ImportarEmpleadosExcel
      title="Importar empleados"
      description="Sube un archivo Excel con los datos de tus empleados. La IA procesará automáticamente la estructura."
      showToast={false}
      showCancelButton={false}
      showFinishButton={false}
    />
  );
}
