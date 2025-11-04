'use client';

import { Button } from '@/components/ui/button';

export function MiEspacioDatosClient({ empleado }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Datos</h1>
        <p className="text-sm text-gray-500 mt-1">Información personal y de contacto</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información Personal */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DNI/NIE</label>
              <input
                type="text"
                defaultValue={empleado.nif || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Seguridad Social</label>
              <input
                type="text"
                defaultValue={empleado.nss || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
              <input
                type="date"
                defaultValue={empleado.fechaNacimiento ? new Date(empleado.fechaNacimiento).toISOString().split('T')[0] : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                defaultValue={empleado.email}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                defaultValue={empleado.telefono || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calle</label>
              <input
                type="text"
                defaultValue={empleado.direccionCalle || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input
                  type="text"
                  defaultValue={empleado.direccionNumero || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Piso/Puerta</label>
                <input
                  type="text"
                  defaultValue={empleado.direccionPiso || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CP</label>
                <input
                  type="text"
                  defaultValue={empleado.codigoPostal || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  defaultValue={empleado.ciudad || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <input
                type="text"
                defaultValue={empleado.direccionProvincia || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="default">
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
