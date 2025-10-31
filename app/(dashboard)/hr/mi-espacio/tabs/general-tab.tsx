'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface GeneralTabProps {
  empleado: any;
  usuario: any;
  rol?: 'empleado' | 'hr_admin' | 'manager';
}

export function GeneralTab({ empleado, usuario, rol = 'empleado' }: GeneralTabProps) {
  const [formData, setFormData] = useState({
    // Información Personal
    nif: empleado.nif || '',
    nss: empleado.nss || '',
    fechaNacimiento: empleado.fechaNacimiento || '',
    estadoCivil: empleado.estadoCivil || '',
    numeroHijos: empleado.numeroHijos || 0,

    // Información de Contacto
    email: usuario.email || '',
    telefono: empleado.telefono || '',
    direccion: empleado.direccion || '',
    codigoPostal: empleado.codigoPostal || '',
    ciudad: empleado.ciudad || '',

    // Información Laboral
    puesto: empleado.puesto || '',
    equipo: empleado.departamento || '',
    fechaAlta: empleado.fechaAlta || '',
    tipoContrato: empleado.tipoContrato || 'indefinido',
    managerId: empleado.managerId || '',

    // Información Bancaria
    iban: empleado.iban || '',
    titularCuenta: empleado.titularCuenta || '',
    salarioBrutoAnual: empleado.salarioBrutoAnual || '',
    salarioBrutoMensual: empleado.salarioBrutoMensual || '',
  });

  const [equipos, setEquipos] = useState<any[]>([]);
  const [puestos, setPuestos] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const isEmpleado = rol === 'empleado';

  useEffect(() => {
    if (!isEmpleado) {
      fetchEquipos();
      fetchPuestos();
      fetchManagers();
    }
  }, [isEmpleado]);

  async function fetchEquipos() {
    try {
      const response = await fetch('/api/organizacion/equipos');
      if (response.ok) {
        const data = await response.json();
        setEquipos(data);
      }
    } catch (error) {
      console.error('Error fetching equipos:', error);
    }
  }

  async function fetchPuestos() {
    try {
      const response = await fetch('/api/organizacion/puestos');
      if (response.ok) {
        const data = await response.json();
        setPuestos(data);
      }
    } catch (error) {
      console.error('Error fetching puestos:', error);
    }
  }

  async function fetchManagers() {
    try {
      const response = await fetch('/api/empleados?rol=manager,hr_admin');
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEmpleado) {
        // Crear solicitud de cambio
        const response = await fetch('/api/solicitudes-cambio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'datos_personales',
            camposCambiados: formData,
          }),
        });

        if (response.ok) {
          alert('Solicitud de cambio enviada correctamente. Será revisada por Recursos Humanos.');
        } else {
          alert('Error al enviar solicitud de cambio');
        }
      } else {
        // Guardar directamente
        const response = await fetch(`/api/empleados/${empleado.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          alert('Cambios guardados correctamente');
        } else {
          alert('Error al guardar cambios');
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Botón Guardar Cambios */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gray-900 text-white hover:bg-gray-800"
        >
          {saving ? 'Guardando...' : isEmpleado ? 'Solicitar cambios' : 'Guardar cambios'}
        </Button>
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
                value={formData.nif}
                onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                disabled={isEmpleado}
                placeholder="No especificado"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${isEmpleado ? 'bg-gray-50' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Seguridad Social</label>
              <input
                type="text"
                value={formData.nss}
                onChange={(e) => setFormData({ ...formData, nss: e.target.value })}
                disabled={isEmpleado}
                placeholder="No especificado"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${isEmpleado ? 'bg-gray-50' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
              <input
                type="date"
                value={formData.fechaNacimiento ? new Date(formData.fechaNacimiento).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                disabled={isEmpleado}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${isEmpleado ? 'bg-gray-50' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
              <select
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${isEmpleado ? 'bg-gray-50' : ''}`}
                value={formData.estadoCivil}
                onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })}
                disabled={isEmpleado}
              >
                <option value="">Seleccionar</option>
                <option value="soltero">Soltero/a</option>
                <option value="casado">Casado/a</option>
                <option value="divorciado">Divorciado/a</option>
                <option value="viudo">Viudo/a</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Hijos</label>
              <input
                type="number"
                value={formData.numeroHijos}
                onChange={(e) => setFormData({ ...formData, numeroHijos: parseInt(e.target.value) || 0 })}
                disabled={isEmpleado}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${isEmpleado ? 'bg-gray-50' : ''}`}
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
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="No especificado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="No especificado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                <input
                  type="text"
                  value={formData.codigoPostal}
                  onChange={(e) => setFormData({ ...formData, codigoPostal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Información Laboral */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Laboral</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>
              {!isEmpleado ? (
                <select
                  value={formData.puesto}
                  onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Seleccionar puesto...</option>
                  {puestos.map((puesto) => (
                    <option key={puesto.id} value={puesto.nombre}>
                      {puesto.nombre}
                    </option>
                  ))}
                  <option value="__nuevo__">+ Añadir nuevo puesto</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.puesto}
                  disabled
                  placeholder="No especificado"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipo</label>
              {!isEmpleado ? (
                <select
                  value={formData.equipo}
                  onChange={(e) => setFormData({ ...formData, equipo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Seleccionar equipo...</option>
                  {equipos.map((equipo) => (
                    <option key={equipo.id} value={equipo.nombre}>
                      {equipo.nombre}
                    </option>
                  ))}
                  <option value="__nuevo__">+ Añadir nuevo equipo</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.equipo}
                  disabled
                  placeholder="No especificado"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Alta</label>
              <input
                type="date"
                value={formData.fechaAlta ? new Date(formData.fechaAlta).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, fechaAlta: e.target.value })}
                disabled={isEmpleado}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${isEmpleado ? 'bg-gray-50' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contrato</label>
              <select
                value={formData.tipoContrato}
                onChange={(e) => setFormData({ ...formData, tipoContrato: e.target.value })}
                disabled={isEmpleado}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${isEmpleado ? 'bg-gray-50' : ''}`}
              >
                <option value="indefinido">Indefinido</option>
                <option value="temporal">Temporal</option>
                <option value="practicas">Prácticas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
              {!isEmpleado ? (
                <select
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Sin manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.nombre} {manager.apellidos}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={managers.find(m => m.id === formData.managerId)?.nombre || 'Sin manager'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
              )}
            </div>
          </div>
        </div>

        {/* Información Bancaria */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Bancaria</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
              <input
                type="text"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                placeholder="No especificado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titular de la Cuenta</label>
              <input
                type="text"
                value={formData.titularCuenta}
                onChange={(e) => setFormData({ ...formData, titularCuenta: e.target.value })}
                placeholder="No especificado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salario Bruto Anual</label>
              <input
                type="number"
                value={formData.salarioBrutoAnual}
                onChange={(e) => setFormData({ ...formData, salarioBrutoAnual: e.target.value })}
                disabled={isEmpleado}
                placeholder="No especificado"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${isEmpleado ? 'bg-gray-50' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salario Bruto Mensual</label>
              <input
                type="number"
                value={formData.salarioBrutoMensual}
                onChange={(e) => setFormData({ ...formData, salarioBrutoMensual: e.target.value })}
                disabled={isEmpleado}
                placeholder="No especificado"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${isEmpleado ? 'bg-gray-50' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export con el nombre antiguo para compatibilidad
export { GeneralTab as DatosTab };
