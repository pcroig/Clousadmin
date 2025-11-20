/**
 * DocumentosTab - Employee Documents Tab
 * Shared component used by both empleado and HR admin views
 */

'use client'

import type { Empleado } from '@/types/empleado'

interface DocumentosTabProps {
  empleado: Empleado
  rol?: 'empleado' | 'manager' | 'hr_admin'
}

export function DocumentosTab({ empleado, rol = 'empleado' }: DocumentosTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Documentos</h3>
      </div>

      {/* Placeholder for documents list */}
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">
          No hay documentos disponibles
        </p>
      </div>
    </div>
  )
}
