/**
 * GeneralTab - Employee General Information Tab (HR View)
 * Used by HR admin to view/edit employee general information
 */

'use client'

import type { Empleado, Usuario } from '@/types/empleado'

interface GeneralTabProps {
  empleado: Empleado
  usuario: Usuario
  rol?: 'empleado' | 'manager' | 'hr_admin'
  onFieldUpdate?: (field: string, value: any) => Promise<void>
}

export function GeneralTab({ empleado, usuario, rol = 'hr_admin', onFieldUpdate }: GeneralTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Información Personal</h3>

          <div>
            <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
            <p className="mt-1 text-sm text-gray-900">{usuario.nombre}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{usuario.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Teléfono</label>
            <p className="mt-1 text-sm text-gray-900">{empleado.telefono || 'No especificado'}</p>
          </div>
        </div>

        {/* Employment Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Información Laboral</h3>

          <div>
            <label className="text-sm font-medium text-gray-700">Puesto</label>
            <p className="mt-1 text-sm text-gray-900">{empleado.puesto || 'No especificado'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Departamento</label>
            <p className="mt-1 text-sm text-gray-900">{empleado.departamento || 'No especificado'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Fecha de Alta</label>
            <p className="mt-1 text-sm text-gray-900">
              {empleado.fechaAlta ? new Date(empleado.fechaAlta).toLocaleDateString('es-ES') : 'No especificado'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
