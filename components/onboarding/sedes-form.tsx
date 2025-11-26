'use client';

// ========================================
// Sedes Form Component - Onboarding
// ========================================

import { MapPin, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  asignarSedeAction,
  crearSedeAction,
  eliminarSedeAction,
} from '@/app/(auth)/signup/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseJson } from '@/lib/utils/json';

interface Sede {
  id: string;
  nombre: string;
  ciudad: string;
  equipos?: {
    id: string;
    nombre: string;
  }[];
}

interface EquipoOption {
  id: string;
  nombre: string;
}

type TipoAsignacion = 'empresa' | 'equipo';

interface SedesFormProps {
  sedesIniciales?: Sede[];
}

type SedeApi = Omit<Sede, 'equipos'> & {
  equipos?: Array<{ id: string; nombre?: string | null }>;
};

interface EquiposResponse {
  equipos?: Array<{ id: string; nombre?: string | null }>;
}

const normalizeEquipos = (
  equipos?: Array<{ id: string; nombre?: string | null }>
): Sede['equipos'] => {
  if (!equipos) return undefined;
  return equipos.map((equipo) => ({
    id: equipo.id,
    nombre: equipo.nombre ?? '',
  }));
};

const normalizeSede = (sede: SedeApi): Sede => ({
  ...sede,
  equipos: normalizeEquipos(sede.equipos),
});

export function SedesForm({ sedesIniciales = [] }: SedesFormProps) {
  const [sedes, setSedes] = useState<Sede[]>(sedesIniciales);
  const [equipos, setEquipos] = useState<EquipoOption[]>([]);
  const [ciudad, setCiudad] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [asignacionNueva, setAsignacionNueva] = useState<TipoAsignacion>('empresa');
  const [equipoNuevo, setEquipoNuevo] = useState('');
  const [asignaciones, setAsignaciones] = useState<
    Record<string, { tipo: TipoAsignacion; equipoId?: string }>
  >({});
  const [asignandoSedeId, setAsignandoSedeId] = useState<string | null>(null);
  const [cargandoEquipos, setCargandoEquipos] = useState(false);

  useEffect(() => {
    const loadEquipos = async () => {
      setCargandoEquipos(true);
      try {
        const response = await fetch('/api/equipos');
        if (!response.ok) {
          throw new Error('Error al cargar equipos');
        }
        const data = await parseJson<EquiposResponse | EquipoOption[]>(response);
        const equiposList = Array.isArray(data)
          ? data
          : Array.isArray(data?.equipos)
            ? data.equipos ?? []
            : [];
        const equiposTransformados: EquipoOption[] = equiposList.map((equipo) => ({
          id: equipo.id,
          nombre: equipo.nombre ?? '',
        }));
        setEquipos(equiposTransformados);
      } catch (err) {
        console.error('Error:', err);
        toast.error('No se pudieron cargar los equipos');
      } finally {
        setCargandoEquipos(false);
      }
    };

    loadEquipos();
  }, []);

  useEffect(() => {
    setAsignaciones((prev) => {
      const updated = { ...prev };
      sedes.forEach((sede) => {
        if (!updated[sede.id]) {
          const primerEquipo = sede.equipos?.[0];
          updated[sede.id] = primerEquipo
            ? { tipo: 'equipo', equipoId: primerEquipo.id }
            : { tipo: 'empresa' };
        }
      });
      return updated;
    });
  }, [sedes]);

  const persistAsignacion = async (sedeId: string, config: { tipo: TipoAsignacion; equipoId?: string }) => {
    setAsignandoSedeId(sedeId);

    try {
      const result = await asignarSedeAction(sedeId, config);

      if (result.success && result.sede) {
        const sedeActualizada = normalizeSede(result.sede as SedeApi);
        setSedes((prev) =>
          prev.map((sede) => (sede.id === sedeId ? sedeActualizada : sede))
        );
        toast.success('Asignación actualizada');
      } else {
        toast.error(result.error || 'Error al asignar la sede');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al asignar la sede');
    } finally {
      setAsignandoSedeId(null);
    }
  };

  const handleTipoAsignacionChange = (sedeId: string, tipo: TipoAsignacion) => {
    setAsignaciones((prev) => {
      const next = {
        ...prev,
        [sedeId]: {
          tipo,
          equipoId: tipo === 'empresa' ? undefined : prev[sedeId]?.equipoId,
        },
      };
      return next;
    });

    if (tipo === 'empresa') {
      void persistAsignacion(sedeId, { tipo: 'empresa' });
    }
  };

  const handleEquipoAsignacionChange = (sedeId: string, value: string) => {
    const equipoId = value === 'none' ? undefined : value;

    setAsignaciones((prev) => ({
      ...prev,
      [sedeId]: {
        tipo: 'equipo',
        equipoId,
      },
    }));

    if (equipoId) {
      void persistAsignacion(sedeId, { tipo: 'equipo', equipoId });
    }
  };

  const handleAgregarSede = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const asignacionSeleccionada = asignacionNueva;
    const equipoSeleccionado = equipoNuevo;

    if (asignacionSeleccionada === 'equipo' && !equipoSeleccionado) {
      setError('Selecciona un equipo para asignar la sede');
      return;
    }

    setLoading(true);

    try {
      const result = await crearSedeAction({
        ciudad,
        asignacion:
          asignacionSeleccionada === 'empresa'
            ? { tipo: 'empresa' }
            : { tipo: 'equipo', equipoId: equipoSeleccionado },
      });

      if (result.success && result.sede) {
        const nuevaSede = normalizeSede(result.sede as SedeApi);
        setSedes((prev) => [...prev, nuevaSede]);
        setCiudad('');
        setAsignacionNueva('empresa');
        setEquipoNuevo('');
        setAsignaciones((prev) => ({
          ...prev,
          [nuevaSede.id]: asignacionSeleccionada === 'empresa'
            ? { tipo: 'empresa' }
            : { tipo: 'equipo', equipoId: equipoSeleccionado || nuevaSede.equipos?.[0]?.id },
        }));
        toast.success('Sede creada correctamente');
      } else {
        setError(result.error || 'Error al crear la sede');
      }
    } catch (err) {
      setError('Error al crear la sede');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarSede = async (sedeId: string) => {
    try {
      const result = await eliminarSedeAction(sedeId);

      if (result.success) {
        setSedes(sedes.filter((s) => s.id !== sedeId));
        setAsignaciones((prev) => {
          const { [sedeId]: removed, ...rest } = prev;
          void removed; // Explicitly mark as unused
          return rest;
        });
        toast.success('Sede eliminada');
      } else {
        setError(result.error || 'Error al eliminar la sede');
      }
    } catch (err) {
      setError('Error al eliminar la sede');
      console.error('Error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Sedes de la empresa</h3>
        <p className="text-sm text-gray-500">
          Agrega las ubicaciones de tu empresa y decide si aplican a todo el equipo o a un equipo concreto.
        </p>
      </div>

      {/* Formulario para agregar sede */}
      <form onSubmit={handleAgregarSede} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ciudad">Ciudad *</Label>
          <Input
            id="ciudad"
            placeholder="Madrid"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            required
          />
        </div>

        <div className="space-y-3">
          <Label>Asignación inicial</Label>
          <RadioGroup
            className="flex flex-col gap-2 sm:flex-row"
            value={asignacionNueva}
            onValueChange={(value) => setAsignacionNueva(value as TipoAsignacion)}
          >
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <RadioGroupItem value="empresa" id="asig-empresa" />
              <Label htmlFor="asig-empresa" className="text-sm font-medium cursor-pointer">
                Todos los empleados
              </Label>
            </div>
            <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equipo" id="asig-equipo" />
                <Label htmlFor="asig-equipo" className="text-sm font-medium cursor-pointer">
                  Equipo específico
                </Label>
              </div>
              {asignacionNueva === 'equipo' && (
                <Select
                  value={equipoNuevo || 'none'}
                  onValueChange={(value) => setEquipoNuevo(value === 'none' ? '' : value)}
                  disabled={cargandoEquipos || equipos.length === 0}
                >
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Selecciona un equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar equipo</SelectItem>
                    {equipos.map((equipo) => (
                      <SelectItem key={equipo.id} value={equipo.id}>
                        {equipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </RadioGroup>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? 'Agregando...' : 'Agregar sede'}
        </Button>
      </form>

      {/* Lista de sedes */}
      {sedes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Sedes agregadas</h4>
          <div className="space-y-3">
            {sedes.map((sede) => {
              const asignacion = asignaciones[sede.id] || { tipo: 'empresa' as TipoAsignacion };
              const equiposAsignados = sede.equipos?.length ?? 0;

              return (
                <div key={sede.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">{sede.nombre}</p>
                        <p className="text-xs text-gray-500">{sede.ciudad}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminarSede(sede.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <RadioGroup
                      value={asignacion.tipo}
                      onValueChange={(value) => handleTipoAsignacionChange(sede.id, value as TipoAsignacion)}
                      className="flex flex-col gap-2 sm:flex-row"
                    >
                      <div className="flex items-center space-x-2 rounded-md border p-3">
                        <RadioGroupItem value="empresa" id={`empresa-${sede.id}`} />
                        <Label htmlFor={`empresa-${sede.id}`} className="text-sm font-medium cursor-pointer">
                          Todos los empleados
                        </Label>
                      </div>
                      <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:gap-3">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="equipo" id={`equipo-${sede.id}`} />
                          <Label htmlFor={`equipo-${sede.id}`} className="text-sm font-medium cursor-pointer">
                            Equipo específico
                          </Label>
                        </div>
                        {asignacion.tipo === 'equipo' && (
                          <Select
                            value={asignacion.equipoId || 'none'}
                            onValueChange={(value) => handleEquipoAsignacionChange(sede.id, value)}
                            disabled={
                              cargandoEquipos ||
                              equipos.length === 0 ||
                              asignandoSedeId === sede.id
                            }
                          >
                            <SelectTrigger className="w-full sm:w-56">
                              <SelectValue placeholder="Selecciona un equipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Seleccionar equipo</SelectItem>
                              {equipos.map((equipo) => (
                                <SelectItem key={equipo.id} value={equipo.id}>
                                  {equipo.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </RadioGroup>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Equipos asignados:{' '}
                        {equiposAsignados > 0
                          ? `${equiposAsignados} ${equiposAsignados === 1 ? 'equipo' : 'equipos'}`
                          : 'Sin equipos asignados'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500">
                      {asignacion.tipo === 'equipo' && !asignacion.equipoId
                        ? 'Selecciona un equipo para aplicar la asignación.'
                        : asignandoSedeId === sede.id
                        ? 'Aplicando cambios...'
                        : 'Los cambios se guardan automáticamente.'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}