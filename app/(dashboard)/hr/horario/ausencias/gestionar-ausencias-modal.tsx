'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Equipo, PoliticaAusencia, TipoAusenciaEnum } from './types';
import { editarCalendarioEmpresa, getAusenciasSettings } from '@/app/(dashboard)/hr/horario/ausencias/actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { CalendarioFestivos } from '@/components/hr/calendario-festivos';
import { ListaFestivos } from '@/components/hr/lista-festivos';

interface GestionarAusenciasModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface Equipo {
  id: string;
  nombre: string;
}

interface PoliticaEquipo {
  equipoId: string;
  maxSolapamientoPct: number;
  requiereAntelacionDias: number;
}

export function GestionarAusenciasModal({ open, onClose, onSaved }: GestionarAusenciasModalProps) {
  const [cargando, setCargando] = useState(false);
  const [tab, setTab] = useState<'saldo' | 'calendario' | 'politicas'>('saldo');

  // Saldo
  const [nivel, setNivel] = useState<'empresa' | 'equipo'>('empresa');
  const [diasTotales, setDiasTotales] = useState('22');
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);
  
  // Políticas de Ausencia
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<string>('');
  const [politicas, setPoliticas] = useState<Record<string, PoliticaEquipo>>({});
  const [solapamientoPct, setSolapamientoPct] = useState('50');
  const [antelacionDias, setAntelacionDias] = useState('5');
  
  // Calendario laboral
  const [diasLaborables, setDiasLaborables] = useState({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: false,
    domingo: false,
  });
  const [verCalendario, setVerCalendario] = useState(false);

  const cargarPoliticaEquipo = useCallback(async (equipoId: string) => {
    try {
      const res = await fetch(`/api/organizacion/equipos/${equipoId}/politica`);
      if (res.ok) {
        const data = await res.json();
        setPoliticas((prev) => ({
          ...prev,
          [equipoId]: data,
        }));
        setSolapamientoPct(data.maxSolapamientoPct.toString());
        setAntelacionDias(data.requiereAntelacionDias.toString());
      }
    } catch (e) {
      console.error('Error cargando política de equipo:', e);
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      // Cargar equipos
      const resEquipos = await fetch('/api/organizacion/equipos');
      if (resEquipos.ok) {
        const dataEquipos = await resEquipos.json();
        setEquipos(dataEquipos);
        
        // Si hay equipos y no hay uno seleccionado, seleccionar el primero
        if (dataEquipos.length > 0) {
          const primerEquipo = dataEquipos[0].id;
          setEquipoSeleccionado(primerEquipo);
          await cargarPoliticaEquipo(primerEquipo);
        }
      }
      
      // Cargar configuración de calendario laboral
      const resCalendario = await fetch('/api/empresa/calendario-laboral');
      if (resCalendario.ok) {
        const dataCalendario = await resCalendario.json();
        if (dataCalendario.diasLaborables) {
          setDiasLaborables(dataCalendario.diasLaborables);
        }
      }
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
  }, [cargarPoliticaEquipo]);

  useEffect(() => {
    if (open) {
      cargarDatos();
    } else {
      // Resetear al cerrar
      setEquipoSeleccionado('');
      setPoliticas({});
      setSolapamientoPct('50');
      setAntelacionDias('5');
    }
  }, [open, cargarDatos]);

  async function handleCambiarEquipo(equipoId: string) {
    setEquipoSeleccionado(equipoId);
    
    // Si ya tenemos la política en cache, cargarla
    if (politicas[equipoId]) {
      setSolapamientoPct(politicas[equipoId].maxSolapamientoPct.toString());
      setAntelacionDias(politicas[equipoId].requiereAntelacionDias.toString());
    } else {
      // Cargar la política
      await cargarPoliticaEquipo(equipoId);
    }
  }

  async function handleGuardarSaldo() {
    setCargando(true);
    try {
      const res = await fetch('/api/ausencias/saldo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nivel,
          diasTotales: parseInt(diasTotales),
          equipoIds: nivel === 'equipo' ? equiposSeleccionados : undefined,
        }),
      });

      if (res.ok) {
        toast.success('Saldo guardado correctamente');
        if (onSaved) onSaved();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al guardar saldo');
      }
    } catch (e) {
      console.error('Error guardando saldo:', e);
      toast.error('Error al guardar saldo');
    } finally {
      setCargando(false);
    }
  }
  
  async function handleGuardarPolitica() {
    if (!equipoSeleccionado) {
      toast.error('Selecciona un equipo');
      return;
    }

    setCargando(true);
    try {
      // Validar datos
      const pct = parseInt(solapamientoPct);
      const dias = parseInt(antelacionDias);
      
      if (isNaN(pct) || pct < 0 || pct > 100) {
        toast.error('El porcentaje de solapamiento debe estar entre 0 y 100');
        return;
      }
      
      if (isNaN(dias) || dias < 0 || dias > 365) {
        toast.error('Los días de antelación deben estar entre 0 y 365');
        return;
      }

      const res = await fetch(`/api/organizacion/equipos/${equipoSeleccionado}/politica`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxSolapamientoPct: pct,
          requiereAntelacionDias: dias,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPoliticas({
          ...politicas,
          [equipoSeleccionado]: data,
        });
        toast.success('Política de ausencias guardada correctamente');
        if (onSaved) onSaved();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al guardar política');
      }
    } catch (e) {
      console.error('Error guardando política:', e);
      toast.error('Error al guardar política de ausencias');
    } finally {
      setCargando(false);
    }
  }
  
  async function handleGuardarCalendario() {
    setCargando(true);
    try {
      const response = await fetch('/api/empresa/calendario-laboral', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diasLaborables),
      });

      if (response.ok) {
        toast.success('Calendario laboral guardado correctamente');
        if (onSaved) onSaved();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar calendario');
      }
    } catch (e) {
      console.error('Error guardando calendario:', e);
      toast.error('Error al guardar calendario');
    } finally {
      setCargando(false);
    }
  }
  
  async function handleImportarFestivos() {
    if (!confirm('¿Importar festivos nacionales para el año actual y próximo?')) {
      return;
    }

    setCargando(true);
    try {
      const response = await fetch('/api/festivos/importar-nacionales', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Festivos importados exitosamente');
        if (onSaved) onSaved();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al importar festivos');
      }
    } catch (e) {
      console.error('Error importando festivos:', e);
      toast.error('Error al importar festivos');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Ausencias</DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (value === 'pendientes' || value === 'historial') {
              setTab(value);
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="saldo">Saldo Anual</TabsTrigger>
            <TabsTrigger value="calendario">Calendario Laboral</TabsTrigger>
            <TabsTrigger value="politicas">Políticas de Ausencia</TabsTrigger>
          </TabsList>

          {/* Tab: Saldo */}
          <TabsContent value="saldo" className="space-y-4">
            <Field>
              <FieldLabel>Nivel de asignación</FieldLabel>
              <Select
                value={nivel}
                onValueChange={(value) => {
                  if (value === 'empresa' || value === 'equipo' || value === 'empleado') {
                    setNivel(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Toda la empresa</SelectItem>
                  <SelectItem value="equipo">Por equipos</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {nivel === 'equipo' && (
              <Field>
                <FieldLabel>Equipos</FieldLabel>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {equipos.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay equipos disponibles</p>
                  ) : (
                    equipos.map((equipo) => (
                      <div key={equipo.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`equipo-${equipo.id}`}
                          checked={equiposSeleccionados.includes(equipo.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEquiposSeleccionados([...equiposSeleccionados, equipo.id]);
                            } else {
                              setEquiposSeleccionados(equiposSeleccionados.filter((id) => id !== equipo.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`equipo-${equipo.id}`} className="text-sm text-gray-900 cursor-pointer">
                          {equipo.nombre}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </Field>
            )}

            <Field>
              <FieldLabel>Días totales anuales</FieldLabel>
              <Input
                type="number"
                value={diasTotales}
                onChange={(e) => setDiasTotales(e.target.value)}
                min="0"
                max="365"
                placeholder="22"
              />
            </Field>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <LoadingButton onClick={handleGuardarSaldo} loading={cargando} disabled={cargando}>
                {cargando ? 'Guardando...' : 'Guardar Saldo'}
              </LoadingButton>
            </DialogFooter>
          </TabsContent>

          {/* Tab: Calendario */}
          <TabsContent value="calendario" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Configuración del Calendario Laboral</h3>
              <LoadingButton
                size="sm"
                variant="outline"
                onClick={handleImportarFestivos}
                loading={cargando}
                disabled={cargando}
              >
                {cargando ? 'Importando...' : 'Importar Calendario Nacional'}
              </LoadingButton>
            </div>

            <Field>
              <FieldLabel>Días laborables de la empresa</FieldLabel>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { key: 'lunes', label: 'Lunes' },
                  { key: 'martes', label: 'Martes' },
                  { key: 'miercoles', label: 'Miércoles' },
                  { key: 'jueves', label: 'Jueves' },
                  { key: 'viernes', label: 'Viernes' },
                  { key: 'sabado', label: 'Sábado' },
                  { key: 'domingo', label: 'Domingo' },
                ].map((dia) => (
                  <div key={dia.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`dia-${dia.key}`}
                      checked={diasLaborables[dia.key as keyof typeof diasLaborables]}
                      onChange={(e) => {
                        setDiasLaborables({
                          ...diasLaborables,
                          [dia.key]: e.target.checked,
                        });
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label htmlFor={`dia-${dia.key}`} className="text-sm text-gray-900 cursor-pointer">
                      {dia.label}
                    </label>
                  </div>
                ))}
              </div>
            </Field>

            <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Festivos y Días No Laborables</h4>
                <InfoTooltip
                  content="Esta configuración se usa para calcular los días de ausencia. Los cambios se aplican a todas las solicitudes futuras."
                  variant="subtle"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setVerCalendario(!verCalendario)}
              >
                {verCalendario ? 'Ver Lista' : 'Ver Calendario'}
              </Button>
            </div>

            {verCalendario ? (
              <CalendarioFestivos onUpdate={cargarDatos} />
            ) : (
              <ListaFestivos onUpdate={cargarDatos} />
            )}
          </TabsContent>

          {/* Tab: Políticas de Ausencia */}
          <TabsContent value="politicas" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">Configuración de Políticas de Ausencia por Equipo</h3>
                <InfoTooltip
                  content="Estas políticas se aplican automáticamente al validar solicitudes. La antelación sólo afecta a vacaciones y ausencias 'otro', y el solapamiento se aplica únicamente a vacaciones."
                  variant="subtle"
                  side="left"
                />
              </div>
              
              <Field>
                <FieldLabel>Seleccionar Equipo</FieldLabel>
                <Select 
                  value={equipoSeleccionado} 
                  onValueChange={handleCambiarEquipo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipos.length === 0 ? (
                      <SelectItem value="" disabled>No hay equipos disponibles</SelectItem>
                    ) : (
                      equipos.map((equipo) => (
                        <SelectItem key={equipo.id} value={equipo.id}>
                          {equipo.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>

              {equipoSeleccionado && (
                <>
                  <div className="border-t pt-4 space-y-4">
                    <Field>
                      <div className="flex items-center gap-2">
                        <FieldLabel>Días de antelación mínima</FieldLabel>
                        <InfoTooltip
                          content={(
                            <div className="space-y-2 text-sm">
                              <p className="font-medium">¿Qué es la antelación mínima?</p>
                              <p className="text-xs">
                                Número mínimo de días que deben pasar entre la solicitud de ausencia y la fecha de inicio.
                                Solo aplica a ausencias que requieren aprobación (vacaciones y "otro").
                              </p>
                              <p className="text-xs mt-2">
                                Ejemplo: Con 5 días de antelación, una ausencia que empieza el 15 de enero debe solicitarse antes del 10 de enero.
                              </p>
                            </div>
                          )}
                          variant="subtle"
                        />
                      </div>
                      
                      <div className="flex items-center gap-4 mt-4">
                        <Input
                          type="number"
                          value={antelacionDias}
                          onChange={(e) => setAntelacionDias(e.target.value)}
                          min="0"
                          max="365"
                          className="w-32"
                        />
                        <span className="text-sm text-gray-600">días</span>
                      </div>
                    </Field>

                    <Field>
                      <div className="flex items-center gap-2">
                        <FieldLabel>Solapamiento máximo permitido</FieldLabel>
                        <InfoTooltip
                          content={(
                            <div className="space-y-2 text-sm">
                              <p className="font-medium">¿Qué significa el solapamiento?</p>
                              <p className="text-xs">
                                Número máximo de personas del equipo que pueden coincidir de vacaciones al mismo tiempo.
                                Controla la capacidad del equipo durante los periodos con más ausencias.
                              </p>
                              <p className="text-xs mt-2">
                                Ejemplo: Con un solapamiento máximo de 2 personas, si ya hay 2 miembros en vacaciones
                                durante una semana, una tercera solicitud para esa misma semana se rechazará automáticamente.
                              </p>
                            </div>
                          )}
                          variant="subtle"
                        />
                      </div>
                      
                      <div className="flex items-center gap-4 mt-4">
                        <Input
                          type="number"
                          value={solapamientoPct}
                          onChange={(e) => setSolapamientoPct(e.target.value)}
                          min="0"
                          max="100"
                          className="w-32"
                        />
                        <span className="text-sm text-gray-600">%</span>
                      </div>
                    </Field>
                  </div>
                </>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleGuardarPolitica}
                  disabled={cargando || !equipoSeleccionado}
                >
                  {cargando ? 'Guardando...' : 'Guardar Política'}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


