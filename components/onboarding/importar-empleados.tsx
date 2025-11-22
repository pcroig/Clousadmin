'use client';

// ========================================
// Importar Empleados Component - Onboarding
// ========================================
// Wrapper del componente compartido para el flujo de onboarding

import { ImportarEmpleadosExcel } from '@/components/shared/importar-empleados-excel';

export function ImportarEmpleados() {
  return (
    <ImportarEmpleadosExcel
      showHeader={false}
      showCancelButton={false}
      showFinishButton={false}
      autoConfirmAfterAnalysis
    />
  );
}
