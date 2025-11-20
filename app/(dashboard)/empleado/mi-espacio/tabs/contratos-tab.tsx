/**
 * ContratosTab - Employee Contracts Tab
 * Shared component used by both empleado and HR admin views
 */

'use client'

import type { Empleado } from '@/types/empleado'

interface ContratosTabProps {
  empleado: Empleado
  rol?: 'empleado' | 'manager' | 'hr_admin'
  onFieldUpdate?: (field: string, value: any) => Promise<void>
}

export function ContratosTab({ empleado, rol = 'empleado', onFieldUpdate }: ContratosTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Contratos</h3>
      </div>

      {/* Placeholder for contracts list */}
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">
          No hay contratos disponibles
        </p>
      </div>
    </div>
  )
}
