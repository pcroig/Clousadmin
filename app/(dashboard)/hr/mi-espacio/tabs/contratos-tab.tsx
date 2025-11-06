'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ContratosTab({ empleado }: any) {
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [puestos, setPuestos] = useState<any[]>([]);

  const contratoActual = empleado.contratos?.[0] || {};
  const tipoContrato = empleado.tipoContrato || 'indefinido';
  const fechaFin = contratoActual.fechaFin
    ? new Date(contratoActual.fechaFin).toISOString().split('T')[0]
    : '';

  useEffect(() => {
    fetchJornadas();
    fetchPuestos();
  }, []);

  async function fetchJornadas() {
    try {
      const response = await fetch('/api/jornadas');
      if (response.ok) {
        const data = await response.json();
        setJornadas(data);
      }
    } catch (error) {
      console.error('Error fetching jornadas:', error);
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

  const jornadaActual = jornadas.find((j) => j.id === empleado.jornadaId);
  const puestoActual = puestos.find((p) => p.id === empleado.puestoId);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Información básica y Jurídico y laboral - lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información básica */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información básica</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
              <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                {empleado.nombre} {empleado.apellidos} ({empleado.email})
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
              <Input
                type="text"
                value={new Date(empleado.fechaAlta).toLocaleDateString('es-ES')}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de contrato</label>
              <Input
                type="text"
                value={
                  tipoContrato === 'administrador'
                    ? 'Administrador'
                    : tipoContrato === 'fijo_discontinuo'
                      ? 'Fijo discontinuo'
                      : tipoContrato === 'indefinido'
                        ? 'Indefinido'
                        : tipoContrato === 'temporal'
                          ? 'Temporal'
                          : tipoContrato === 'becario'
                            ? 'Becario'
                            : tipoContrato === 'practicas'
                              ? 'Prácticas'
                              : tipoContrato === 'obra_y_servicio'
                                ? 'Obra y servicio'
                                : tipoContrato
                }
                readOnly
                className="bg-gray-50"
              />
            </div>
            {tipoContrato === 'temporal' && fechaFin && (
              <div>
                <Label htmlFor="fechaFin">Fecha de fin</Label>
                <Input
                  id="fechaFin"
                  type="text"
                  value={new Date(fechaFin).toLocaleDateString('es-ES')}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label>
              <Input
                type="text"
                value={puestoActual?.nombre || empleado.puesto || 'No asignado'}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Jurídico y laboral */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Jurídico y laboral</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría profesional</label>
              <Input
                type="text"
                value={
                  empleado.categoriaProfesional === 'directivo'
                    ? 'Directivo'
                    : empleado.categoriaProfesional === 'mando_intermedio'
                      ? 'Mando intermedio'
                      : empleado.categoriaProfesional === 'tecnico'
                        ? 'Técnico'
                        : empleado.categoriaProfesional === 'trabajador_cualificado'
                          ? 'Trabajador cualificado'
                          : empleado.categoriaProfesional === 'trabajador_baja_cualificacion'
                            ? 'Trabajador con baja cualificación'
                            : empleado.categoriaProfesional || 'No informado'
                }
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grupo de cotización</label>
              <Input
                type="text"
                value={empleado.grupoCotizacion || 'No informado'}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de educación</label>
              <Input
                type="text"
                value={
                  empleado.nivelEducacion === 'nivel_basico'
                    ? 'Nivel Básico'
                    : empleado.nivelEducacion === 'eso_equivalente'
                      ? 'ESO o Equivalente'
                      : empleado.nivelEducacion === 'bachillerato_grado_medio'
                        ? 'Bachillerato o Grado Medio'
                        : empleado.nivelEducacion === 'formacion_profesional_superior'
                          ? 'Formación Profesional Superior'
                          : empleado.nivelEducacion === 'educacion_universitaria_postgrado'
                            ? 'Educación Universitaria y Postgrado'
                            : empleado.nivelEducacion || 'No informado'
                }
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrato a distancia</label>
              <Input type="text" value="No" readOnly className="bg-gray-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Salario y Jornada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salario */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Salario</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Salario bruto anual</label>
              <Input
                type="text"
                value={`${empleado.salarioBrutoAnual?.toLocaleString('es-ES') || 0} €`}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salario bruto mensual</label>
              <Input
                type="text"
                value={`${empleado.salarioBrutoMensual?.toLocaleString('es-ES') || 0} €`}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <Input type="text" value="Anual" readOnly className="bg-gray-50" />
            </div>
          </div>
        </div>

        {/* Jornada */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Jornada</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jornada asignada</label>
              <Input
                type="text"
                value={
                  jornadaActual
                    ? `${jornadaActual.nombre} (${jornadaActual.horasSemanales}h/semana)`
                    : 'No asignada'
                }
                readOnly
                className="bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horas semanales</label>
                <Input
                  type="text"
                  value={jornadaActual?.horasSemanales || empleado.jornada?.horasSemanales || '-'}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <Input type="text" value="semana" readOnly className="bg-gray-50" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Días laborables</label>
              <div className="flex gap-2">
                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie'].map((dia) => (
                  <div
                    key={dia}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white text-center"
                  >
                    {dia}
                  </div>
                ))}
                {['Sab', 'Dom'].map((dia) => (
                  <div
                    key={dia}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 text-center"
                  >
                    {dia}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información del Contrato */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Contrato</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio del contrato</label>
            <Input
              type="text"
              value={
                contratoActual.fechaInicio
                  ? new Date(contratoActual.fechaInicio).toLocaleDateString('es-ES')
                  : new Date(empleado.fechaAlta).toLocaleDateString('es-ES')
              }
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de fin del contrato</label>
            <Input
              type="text"
              value={
                contratoActual.fechaFin
                  ? new Date(contratoActual.fechaFin).toLocaleDateString('es-ES')
                  : tipoContrato === 'indefinido'
                    ? 'Indefinido'
                    : 'No especificada'
              }
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado del contrato</label>
            <Input
              type="text"
              value={empleado.activo && !contratoActual.fechaFin ? 'Activo' : 'Finalizado'}
              readOnly
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado del empleado</label>
            <Input
              type="text"
              value={empleado.estadoEmpleado === 'activo' ? 'Activo' : empleado.estadoEmpleado || 'Activo'}
              readOnly
              className="bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">Modo de solo lectura</p>
            <p className="text-sm text-blue-700 mt-1">
              Esta información es de solo consulta. Para realizar cambios, contacta con el departamento de RR.HH.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
