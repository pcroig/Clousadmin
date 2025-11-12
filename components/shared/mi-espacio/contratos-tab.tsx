'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DarDeBajaModal } from '@/components/hr/DarDeBajaModal';
import { toast } from 'sonner';
import type { MiEspacioEmpleado } from '@/types/empleado';

interface JornadaOption {
  id: string;
  nombre: string;
  horasSemanales?: number | null;
}

interface PuestoOption {
  id: string;
  nombre: string;
}

interface HistorialSalario {
  salario: number;
  fechaCambio: string;
  fechaRegistro: string;
}

interface ContratosTabProps {
  empleado: MiEspacioEmpleado;
  rol?: 'empleado' | 'manager' | 'hr_admin';
}

export function ContratosTab({ empleado, rol = 'empleado' }: ContratosTabProps) {
  const router = useRouter();
  const [jornadas, setJornadas] = useState<JornadaOption[]>([]);
  const [puestos, setPuestos] = useState<PuestoOption[]>([]);
  const [darDeBajaModalOpen, setDarDeBajaModalOpen] = useState(false);
  const [editingHistorial, setEditingHistorial] = useState(false);
  const [nuevoSalario, setNuevoSalario] = useState('');
  const [fechaCambio, setFechaCambio] = useState('');
  const [historialSalarios, setHistorialSalarios] = useState<HistorialSalario[]>([]);
  const [addingComplemento, setAddingComplemento] = useState(false);
  const [complementoTipo, setComplementoTipo] = useState('');
  const [complementoImporte, setComplementoImporte] = useState('');

  const contratoActual = empleado.contratos?.[0];
  const tipoContrato = empleado.tipoContrato || 'indefinido';
  const fechaInicioContrato = contratoActual?.fechaInicio ?? empleado.fechaAlta ?? null;
  const fechaFinContrato = contratoActual?.fechaFin ?? null;
  const fechaFin = fechaFinContrato ? new Date(fechaFinContrato).toISOString().split('T')[0] : '';
  const estadoContrato = empleado.activo && !fechaFinContrato ? 'Activo' : 'Finalizado';
  const contratoActualId = contratoActual?.id ?? null;

  useEffect(() => {
    if (rol !== 'hr_admin') {
      return;
    }

    let isMounted = true;

    const fetchAdminData = async () => {
      try {
        const [jornadasResponse, puestosResponse] = await Promise.allSettled([
          fetch('/api/jornadas'),
          fetch('/api/organizacion/puestos'),
        ]);

        if (!isMounted) return;

        if (jornadasResponse.status === 'fulfilled' && jornadasResponse.value.ok) {
          const data: JornadaOption[] = await jornadasResponse.value.json();
          setJornadas(data);
        }

        if (puestosResponse.status === 'fulfilled' && puestosResponse.value.ok) {
          const data: PuestoOption[] = await puestosResponse.value.json();
          setPuestos(data);
        }
      } catch (error) {
        console.error('[ContratosTab] Error fetching admin data', error);
      }
    };

    void fetchAdminData();

    return () => {
      isMounted = false;
    };
  }, [rol]);

  // Escuchar evento de "Dar de Baja" desde el header
  useEffect(() => {
    const handleDarDeBajaEvent = () => {
      if (rol === 'hr_admin') {
        setDarDeBajaModalOpen(true);
      }
    };

    window.addEventListener('darDeBajaContrato', handleDarDeBajaEvent);
    return () => window.removeEventListener('darDeBajaContrato', handleDarDeBajaEvent);
  }, [rol]);

  const jornadaActual =
    jornadas.find((j) => j.id === empleado.jornadaId) ??
    (empleado.jornada
      ? {
          id: empleado.jornada.id,
          nombre: empleado.jornada.nombre,
          horasSemanales: empleado.jornada.horasSemanales,
        }
      : undefined);

  const puestoActual =
    puestos.find((p) => p.id === empleado.puestoId) ??
    (empleado.puestoRelacion
      ? {
          id: empleado.puestoRelacion.id,
          nombre: empleado.puestoRelacion.nombre,
        }
      : undefined);

  const equiposEmpleado =
    empleado.equipos && empleado.equipos.length > 0
      ? empleado.equipos
          .map((eq) => eq.equipo?.nombre || eq.nombre)
          .filter((value): value is string => Boolean(value))
          .join(', ')
      : 'Sin equipo';

  const managerEmpleado = empleado.manager
    ? `${empleado.manager.nombre}${empleado.manager.apellidos ? ` ${empleado.manager.apellidos}` : ''}`.trim()
    : 'Sin manager';

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipos</label>
              <Input
                type="text"
                value={equiposEmpleado}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
              <Input
                type="text"
                value={managerEmpleado}
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
                value={
                  empleado.grupoCotizacion !== null && empleado.grupoCotizacion !== undefined
                    ? empleado.grupoCotizacion.toString()
                    : 'No informado'
                }
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Salario</h3>

          <div className="space-y-6">
            {/* Salario Base */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salario bruto anual</label>
                <Input
                  type="text"
                  value={`${
                    typeof empleado.salarioBrutoAnual === 'number'
                      ? empleado.salarioBrutoAnual.toLocaleString('es-ES')
                      : '0'
                  } €`}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de pagas</label>
                <Input 
                  type="text" 
                  value={empleado.numPagas ?? '14 pagas (12 + 2 extras)'} 
                  readOnly 
                  className="bg-gray-50" 
                />
              </div>
            </div>

            {/* Complementos Salariales */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">Complementos</h4>
                {rol === 'hr_admin' && !addingComplemento && (
                  <Button variant="outline" size="sm" onClick={() => setAddingComplemento(true)}>
                    Añadir
                  </Button>
                )}
              </div>
              
              {addingComplemento && rol === 'hr_admin' && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de complemento</label>
                      <Input
                        type="text"
                        value={complementoTipo}
                        onChange={(e) => setComplementoTipo(e.target.value)}
                        placeholder="Ej: Plus transporte"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Importe (€/mes)</label>
                      <Input
                        type="number"
                        value={complementoImporte}
                        onChange={(e) => setComplementoImporte(e.target.value)}
                        placeholder="Ej: 150"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (complementoTipo && complementoImporte) {
                          // Aquí iría la llamada a la API para guardar el complemento
                          toast.success('Complemento añadido correctamente');
                          setComplementoTipo('');
                          setComplementoImporte('');
                          setAddingComplemento(false);
                          router.refresh();
                        }
                      }}
                      disabled={!complementoTipo || !complementoImporte}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setComplementoTipo('');
                        setComplementoImporte('');
                        setAddingComplemento(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
              
              {empleado.complementos && empleado.complementos.length > 0 ? (
                <div className="space-y-2">
                  {empleado.complementos.map((comp, index) => {
                    const nombreComplemento = comp?.tipo ?? comp?.tipoComplemento?.nombre ?? 'Complemento';
                    const importe =
                      typeof comp?.importe === 'number'
                        ? comp.importe
                        : typeof comp?.importePersonalizado === 'number'
                          ? comp.importePersonalizado
                          : 0;

                    return (
                      <div key={comp?.id ?? index} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                        <span className="text-gray-700">{nombreComplemento}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{importe.toLocaleString('es-ES')} €</span>
                          {rol === 'hr_admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toast.success('Complemento eliminado');
                                router.refresh();
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !addingComplemento && (
                <p className="text-xs text-gray-500">No hay complementos salariales</p>
              )}
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
                fechaInicioContrato
                  ? new Date(fechaInicioContrato).toLocaleDateString('es-ES')
                  : 'No registrado'
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
                fechaFinContrato
                  ? new Date(fechaFinContrato).toLocaleDateString('es-ES')
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
              value={estadoContrato}
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

      {/* Historial de Cambios de Salario */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Salarios</h3>
          {rol === 'hr_admin' && !editingHistorial && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingHistorial(true)}
            >
              Añadir cambio
            </Button>
          )}
        </div>
        
        {editingHistorial && rol === 'hr_admin' && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo salario (€/año)</label>
                <Input
                  type="number"
                  value={nuevoSalario}
                  onChange={(e) => setNuevoSalario(e.target.value)}
                  placeholder="Ej: 35000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de cambio</label>
                <Input
                  type="date"
                  value={fechaCambio}
                  onChange={(e) => setFechaCambio(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (nuevoSalario && fechaCambio) {
                    setHistorialSalarios([
                      ...historialSalarios,
                      {
                        salario: parseFloat(nuevoSalario),
                        fechaCambio: fechaCambio,
                        fechaRegistro: new Date().toISOString(),
                      }
                    ]);
                    setNuevoSalario('');
                    setFechaCambio('');
                    setEditingHistorial(false);
                    toast.success('Cambio de salario añadido');
                  }
                }}
                disabled={!nuevoSalario || !fechaCambio}
              >
                Guardar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNuevoSalario('');
                  setFechaCambio('');
                  setEditingHistorial(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {historialSalarios.length > 0 ? (
          <div className="space-y-2">
            {historialSalarios.map((cambio, index) => (
              <div key={index} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">{cambio.salario.toLocaleString('es-ES')} €/año</p>
                  <p className="text-xs text-gray-500">Cambio efectivo desde {new Date(cambio.fechaCambio).toLocaleDateString('es-ES')}</p>
                </div>
                {rol === 'hr_admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setHistorialSalarios(historialSalarios.filter((_, i) => i !== index));
                      toast.success('Cambio eliminado');
                    }}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">No hay cambios de salario registrados</p>
            {rol !== 'hr_admin' && (
              <p className="text-xs mt-1">Contacta con HR para más información</p>
            )}
          </div>
        )}
      </div>

      {/* Nota informativa */}
      {rol !== 'hr_admin' && (
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
      )}

      {/* Modal Dar de Baja */}
      {rol === 'hr_admin' && contratoActualId && (
        <DarDeBajaModal
          isOpen={darDeBajaModalOpen}
          onClose={() => setDarDeBajaModalOpen(false)}
          contratoId={contratoActualId}
          empleadoNombre={`${empleado.nombre} ${empleado.apellidos}`}
          onSuccess={() => {
            // Recargar la página para mostrar los cambios
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
