'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DarDeBajaModal } from '@/components/hr/DarDeBajaModal';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { ResponsiveDatePicker } from '@/components/shared/responsive-date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TIPO_CONTRATO_LABELS, TipoContrato } from '@/lib/constants/enums';
import { parseJson } from '@/lib/utils/json';
import { format } from 'date-fns';


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
  const [tipoContratoSeleccionado, setTipoContratoSeleccionado] = useState<TipoContrato>(
    (empleado.tipoContrato as TipoContrato) || 'indefinido'
  );
  const [categoriaProfesional, setCategoriaProfesional] = useState(empleado.categoriaProfesional || '');
  const [nivelEducacion, setNivelEducacion] = useState(empleado.nivelEducacion || '');
  const [grupoCotizacion, setGrupoCotizacion] = useState(
    empleado.grupoCotizacion ? String(empleado.grupoCotizacion) : ''
  );
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState(empleado.jornadaId ?? '');
  const [puestoSeleccionado, setPuestoSeleccionado] = useState(empleado.puestoId ?? '');
  const initialEquiposDisponibles = useMemo(
    () =>
      (empleado.equipos ?? [])
        .map((eq) => ({
          id: eq.equipoId ?? eq.equipo?.id ?? '',
          nombre: eq.equipo?.nombre || eq.nombre || 'Equipo sin nombre',
        }))
        .filter((equipo): equipo is { id: string; nombre: string } => Boolean(equipo.id)),
    [empleado.equipos]
  );
  const [equiposDisponibles, setEquiposDisponibles] = useState<Array<{ id: string; nombre: string }>>(
    initialEquiposDisponibles
  );
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>(
    (empleado.equipos ?? [])
      .map((eq) => eq.equipoId)
      .filter((id): id is string => Boolean(id))
  );
  const [managerOptions, setManagerOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [managerSeleccionado, setManagerSeleccionado] = useState(empleado.manager?.id ?? '');
  const [updatingField, setUpdatingField] = useState<string | null>(null);
  const isHrAdmin = rol === 'hr_admin';

  const tipoContratoOptions = useMemo(
    () =>
      Object.entries(TIPO_CONTRATO_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    []
  );

  const categoriaProfesionalOptions = [
    { value: 'directivo', label: 'Directivo' },
    { value: 'mando_intermedio', label: 'Mando intermedio' },
    { value: 'tecnico', label: 'Técnico' },
    { value: 'trabajador_cualificado', label: 'Trabajador cualificado' },
    { value: 'trabajador_baja_cualificacion', label: 'Trabajador baja cualificación' },
  ] as const;

  const nivelEducacionOptions = [
    { value: 'nivel_basico', label: 'Nivel básico' },
    { value: 'eso_equivalente', label: 'ESO o equivalente' },
    { value: 'bachillerato_grado_medio', label: 'Bachillerato / Grado medio' },
    { value: 'formacion_profesional_superior', label: 'Formación profesional superior' },
    { value: 'educacion_universitaria_postgrado', label: 'Universitaria / Postgrado' },
  ] as const;

  const grupoCotizacionOptions = Array.from({ length: 11 }, (_value, index) => ({
    value: String(index + 1),
    label: `Grupo ${index + 1}`,
  }));

  // Helper functions para obtener labels
  const getCategoriaLabel = (value: string | null | undefined): string => {
    if (!value) return 'No informado';
    const option = categoriaProfesionalOptions.find((opt) => opt.value === value);
    return option?.label ?? value;
  };

  const getNivelEducacionLabel = (value: string | null | undefined): string => {
    if (!value) return 'No informado';
    const option = nivelEducacionOptions.find((opt) => opt.value === value);
    return option?.label ?? value;
  };

  const contratoActual = empleado.contratos?.[0];
  const tipoContrato = empleado.tipoContrato || 'indefinido';
  const tipoContratoLabel = useMemo(() => {
    const tipo = (tipoContratoSeleccionado || tipoContrato) as TipoContrato;
    return TIPO_CONTRATO_LABELS[tipo] ?? tipo;
  }, [tipoContratoSeleccionado, tipoContrato]);
  const fechaInicioContrato = contratoActual?.fechaInicio ?? empleado.fechaAlta ?? null;
  const fechaFinContrato = contratoActual?.fechaFin ?? null;
  const fechaFin = fechaFinContrato ? new Date(fechaFinContrato).toISOString().split('T')[0] : '';
  const estadoContrato = empleado.activo && !fechaFinContrato ? 'Activo' : 'Finalizado';
  const estadoEmpleado = estadoContrato;
  const contratoActualId = contratoActual?.id ?? null;

  useEffect(() => {
    setEquiposSeleccionados(
      (empleado.equipos ?? [])
        .map((eq) => eq.equipoId)
        .filter((id): id is string => Boolean(id))
    );
  }, [empleado.equipos]);

  useEffect(() => {
    setManagerSeleccionado(empleado.manager?.id ?? '');
  }, [empleado.manager?.id]);

  useEffect(() => {
    if (!isHrAdmin) {
      return;
    }

    let isMounted = true;

    const fetchAdminData = async () => {
      try {
        const [jornadasResponse, puestosResponse, equiposResponse, managersResponse] = await Promise.allSettled([
          fetch('/api/jornadas'),
          fetch('/api/organizacion/puestos'),
          fetch('/api/organizacion/equipos'),
          fetch('/api/empleados?activos=true&limit=200'),
        ]);

        if (!isMounted) return;

        if (jornadasResponse.status === 'fulfilled' && jornadasResponse.value.ok) {
          const payload = await parseJson<JornadaOption[] | { jornadas?: JornadaOption[] }>(
            jornadasResponse.value
          ).catch(() => null);
          const lista = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.jornadas)
            ? payload?.jornadas
            : [];
          setJornadas(lista);
        }

        if (puestosResponse.status === 'fulfilled' && puestosResponse.value.ok) {
          const payload = await parseJson<PuestoOption[] | { puestos?: PuestoOption[] }>(
            puestosResponse.value
          ).catch(() => null);
          const lista = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.puestos)
            ? payload?.puestos
            : [];
          setPuestos(lista);
        }

        if (equiposResponse.status === 'fulfilled' && equiposResponse.value.ok) {
          const payload = await parseJson<Array<{ id: string; nombre: string }> | { equipos?: Array<{ id: string; nombre: string }> }>(
            equiposResponse.value
          ).catch(() => null);
          const lista = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.equipos)
            ? payload?.equipos
            : [];
          setEquiposDisponibles(lista);
        }

        if (managersResponse.status === 'fulfilled' && managersResponse.value.ok) {
          const payload = await parseJson<
            Array<{ id: string; nombre?: string | null; apellidos?: string | null }> | { empleados?: Array<{ id: string; nombre?: string | null; apellidos?: string | null }> }
          >(managersResponse.value).catch(() => null);
          const lista = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.empleados)
            ? payload?.empleados
            : [];
          setManagerOptions(
            lista
              .filter((manager) => manager.id !== empleado.id)
              .map((manager) => ({
                value: manager.id,
                label: `${manager.nombre ?? ''}${manager.apellidos ? ` ${manager.apellidos}` : ''}`.trim() || 'Sin nombre',
              }))
          );
        }
      } catch (error) {
        console.error('[ContratosTab] Error fetching admin data', error);
      }
    };

    void fetchAdminData();

    return () => {
      isMounted = false;
    };
  }, [isHrAdmin, empleado.id]);

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

  const updateEmpleadoField = async (
    payload: Record<string, unknown>,
    successMessage = 'Cambios guardados'
  ) => {
    try {
      const fieldBeingUpdated = Object.keys(payload)[0] ?? null;
      setUpdatingField(fieldBeingUpdated);
      const response = await fetch(`/api/empleados/${empleado.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => null);
        throw new Error(error?.error || 'Error al guardar cambios');
      }

      toast.success(successMessage);
      router.refresh();
      return true;
    } catch (error) {
      console.error('[ContratosTab] Error updating field', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar cambios');
      return false;
    } finally {
      setUpdatingField(null);
    }
  };

  const handleTipoContratoChange = async (value: TipoContrato) => {
    const previous = tipoContratoSeleccionado;
    setTipoContratoSeleccionado(value);
    const success = await updateEmpleadoField({ tipoContrato: value }, 'Tipo de contrato actualizado');
    if (!success) {
      setTipoContratoSeleccionado(previous);
    }
  };

  const handleCategoriaProfesionalChange = async (value: string) => {
    const previous = categoriaProfesional;
    const nextValue = value || '';
    setCategoriaProfesional(nextValue);
    const success = await updateEmpleadoField(
      nextValue ? { categoriaProfesional: nextValue } : { categoriaProfesional: null },
      nextValue ? 'Categoría profesional actualizada' : 'Categoría profesional eliminada'
    );
    if (!success) {
      setCategoriaProfesional(previous);
    }
  };

  const handleNivelEducacionChange = async (value: string) => {
    const previous = nivelEducacion;
    const nextValue = value || '';
    setNivelEducacion(nextValue);
    const success = await updateEmpleadoField(
      nextValue ? { nivelEducacion: nextValue } : { nivelEducacion: null },
      nextValue ? 'Nivel de educación actualizado' : 'Nivel de educación eliminado'
    );
    if (!success) {
      setNivelEducacion(previous);
    }
  };

  const handleGrupoCotizacionChange = async (value: string) => {
    const previous = grupoCotizacion;
    const nextValue = value || '';
    setGrupoCotizacion(nextValue);
    const success = await updateEmpleadoField(
      nextValue ? { grupoCotizacion: Number(nextValue) } : { grupoCotizacion: null },
      nextValue ? 'Grupo de cotización actualizado' : 'Grupo de cotización eliminado'
    );
    if (!success) {
      setGrupoCotizacion(previous);
    }
  };

  const handleJornadaChange = async (value: string) => {
    const previous = jornadaSeleccionada;
    const nextValue = value || '';
    setJornadaSeleccionada(nextValue);
    const success = await updateEmpleadoField(
      nextValue ? { jornadaId: nextValue } : { jornadaId: null },
      nextValue ? 'Jornada actualizada' : 'Jornada eliminada'
    );
    if (!success) {
      setJornadaSeleccionada(previous);
    }
  };

  const handlePuestoChange = async (value: string) => {
    const previous = puestoSeleccionado;
    const nextValue = value || '';
    setPuestoSeleccionado(nextValue);
    const success = await updateEmpleadoField(
      nextValue ? { puestoId: nextValue } : { puestoId: null },
      nextValue ? 'Puesto actualizado' : 'Puesto eliminado'
    );
    if (!success) {
      setPuestoSeleccionado(previous);
    }
  };

  const fechaCambioDate = fechaCambio ? new Date(`${fechaCambio}T00:00:00`) : undefined;

  const handleEquiposChange = (values: string[]) => {
    const previous = equiposSeleccionados;
    setEquiposSeleccionados(values);
    void (async () => {
      const success = await updateEmpleadoField({ equipoIds: values }, 'Equipos actualizados');
      if (!success) {
        setEquiposSeleccionados(previous);
      }
    })();
  };

  const handleManagerChange = (value: string) => {
    const previous = managerSeleccionado;
    const nextValue = value || '';
    setManagerSeleccionado(nextValue);
    void (async () => {
      const success = await updateEmpleadoField(
        nextValue ? { managerId: nextValue } : { managerId: null },
        nextValue ? 'Manager actualizado' : 'Manager eliminado'
      );
      if (!success) {
        setManagerSeleccionado(previous);
      }
    })();
  };

  return (
    <div className="space-y-6 w-full">
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
              {isHrAdmin ? (
                <SearchableSelect
                  items={tipoContratoOptions}
                  value={tipoContratoSeleccionado}
                  onChange={(value) => {
                    if (!value) return;
                    handleTipoContratoChange(value as TipoContrato);
                  }}
                  placeholder="Seleccionar tipo de contrato"
                  label="Seleccionar tipo de contrato"
                  disabled={updatingField === 'tipoContrato'}
                />
              ) : (
                <Input type="text" value={tipoContratoLabel} readOnly className="bg-gray-50" />
              )}
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
              {isHrAdmin ? (
                puestos.length === 0 ? (
                  <Input
                    type="text"
                    value={puestoActual?.nombre || 'Sin puestos disponibles'}
                    readOnly
                    className="bg-gray-50"
                  />
                ) : (
                  <SearchableSelect
                    items={puestos.map((puesto) => ({
                      value: puesto.id,
                      label: puesto.nombre,
                    }))}
                    value={puestoSeleccionado}
                    onChange={handlePuestoChange}
                    placeholder="Seleccionar puesto"
                    label="Seleccionar puesto"
                    disabled={updatingField === 'puestoId'}
                  />
                )
              ) : (
                <Input
                  type="text"
                  value={puestoActual?.nombre || empleado.puesto || 'No asignado'}
                  readOnly
                  className="bg-gray-50"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipos</label>
              {isHrAdmin ? (
                equiposDisponibles.length === 0 ? (
                  <Input type="text" value="Sin equipos disponibles" readOnly className="bg-gray-50" />
                ) : (
                  <SearchableMultiSelect
                    items={equiposDisponibles.map((equipo) => ({
                      value: equipo.id,
                      label: equipo.nombre,
                    }))}
                    values={equiposSeleccionados}
                    onChange={handleEquiposChange}
                    placeholder="Seleccionar equipos"
                    label="Seleccionar equipos"
                    disabled={updatingField === 'equipoIds'}
                  />
                )
              ) : (
                <Input
                  type="text"
                  value={equiposEmpleado}
                  readOnly
                  className="bg-gray-50"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
              {isHrAdmin ? (
                managerOptions.length === 0 ? (
                  <Input type="text" value={managerEmpleado} readOnly className="bg-gray-50" />
                ) : (
                  <SearchableSelect
                    items={managerOptions}
                    value={managerSeleccionado}
                    onChange={handleManagerChange}
                    placeholder="Seleccionar manager"
                    label="Seleccionar manager"
                    disabled={updatingField === 'managerId'}
                  />
                )
              ) : (
                <Input
                  type="text"
                  value={managerEmpleado}
                  readOnly
                  className="bg-gray-50"
                />
              )}
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
              {isHrAdmin ? (
                <SearchableSelect
                  items={categoriaProfesionalOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={categoriaProfesional}
                  onChange={handleCategoriaProfesionalChange}
                  placeholder="Seleccionar categoría"
                  label="Seleccionar categoría profesional"
                  disabled={updatingField === 'categoriaProfesional'}
                />
              ) : (
                <Input
                  type="text"
                  value={getCategoriaLabel(empleado.categoriaProfesional)}
                  readOnly
                  className="bg-gray-50"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grupo de cotización</label>
              {isHrAdmin ? (
                <SearchableSelect
                  items={grupoCotizacionOptions}
                  value={grupoCotizacion}
                  onChange={handleGrupoCotizacionChange}
                  placeholder="Seleccionar grupo"
                  label="Seleccionar grupo de cotización"
                  disabled={updatingField === 'grupoCotizacion'}
                />
              ) : (
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
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de educación</label>
              {isHrAdmin ? (
                <SearchableSelect
                  items={nivelEducacionOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={nivelEducacion}
                  onChange={handleNivelEducacionChange}
                  placeholder="Seleccionar nivel"
                  label="Seleccionar nivel de educación"
                  disabled={updatingField === 'nivelEducacion'}
                />
              ) : (
                <Input
                  type="text"
                  value={getNivelEducacionLabel(empleado.nivelEducacion)}
                  readOnly
                  className="bg-gray-50"
                />
              )}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Salario base anual</label>
                <Input
                  type="text"
                  value={`${
                    typeof empleado.salarioBaseAnual === 'number'
                      ? empleado.salarioBaseAnual.toLocaleString('es-ES')
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
              {isHrAdmin ? (
                jornadas.length === 0 ? (
                  <Input
                    type="text"
                    value={
                      jornadaActual
                        ? `${jornadaActual.nombre} (${jornadaActual.horasSemanales}h/semana)`
                        : 'Sin jornadas disponibles'
                    }
                    readOnly
                    className="bg-gray-50"
                  />
                ) : (
                  <SearchableSelect
                    items={jornadas.map((jornada) => ({
                      value: jornada.id,
                      label: jornada.horasSemanales
                        ? `${jornada.nombre} (${jornada.horasSemanales}h/semana)`
                        : jornada.nombre,
                    }))}
                    value={jornadaSeleccionada}
                    onChange={handleJornadaChange}
                    placeholder="Seleccionar jornada"
                    label="Seleccionar jornada"
                    disabled={updatingField === 'jornadaId'}
                  />
                )
              ) : (
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
              )}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado (empleado y contrato)</label>
            <Input
              type="text"
              value={estadoEmpleado}
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
                <ResponsiveDatePicker
                  date={fechaCambioDate}
                  onSelect={(date) => setFechaCambio(date ? format(date, 'yyyy-MM-dd') : '')}
                  placeholder="Seleccionar fecha"
                  label="Seleccionar fecha de cambio"
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
          empleadoId={empleado.id}
          onSuccess={() => {
            // Recargar la página para mostrar los cambios
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
