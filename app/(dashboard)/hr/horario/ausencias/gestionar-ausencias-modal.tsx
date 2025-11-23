'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CalendarioFestivos } from '@/components/hr/calendario-festivos';
import { ListaFestivos } from '@/components/hr/lista-festivos';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GestionarAusenciasModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface Equipo {
  id: string;
  nombre: string;
}

interface _PoliticaEquipo {
  equipoId: string;
  maxSolapamientoPct: number;
  requiereAntelacionDias: number;
}

export function GestionarAusenciasModal({ open, onClose, onSaved }: GestionarAusenciasModalProps) {
  const [cargando, setCargando] = useState(false);
  const [tab, setTab] = useState<'politicas' | 'calendario'>('politicas');

  // Saldo y Políticas (ahora juntos)
  const [nivel, setNivel] = useState<'empresa' | 'equipo'>('empresa');
  const [diasTotales, setDiasTotales] = useState('22');
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);
  
  // Políticas de Ausencia - Para toda la empresa
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

  const cargarDatos = useCallback(async () => {
    try {
      // Cargar equipos
      const resEquipos = await fetch('/api/organizacion/equipos');
      if (resEquipos.ok) {
        const dataEquipos = await resEquipos.json() as Record<string, any>;
        setEquipos(dataEquipos);
      }
      
      // Cargar configuración de calendario laboral
      const resCalendario = await fetch('/api/empresa/calendario-laboral');
      if (resCalendario.ok) {
        const dataCalendario = await resCalendario.json() as Record<string, any>;
        if (dataCalendario.diasLaborables) {
          setDiasLaborables(dataCalendario.diasLaborables);
        }
      }
      
      // Cargar políticas de ausencias de la empresa
      const resPoliticas = await fetch('/api/empresa/politica-ausencias');
      if (resPoliticas.ok) {
        const dataPoliticas = await resPoliticas.json() as Record<string, any>;
        if (dataPoliticas.maxSolapamientoPct !== undefined) {
          setSolapamientoPct(dataPoliticas.maxSolapamientoPct.toString());
        }
        if (dataPoliticas.requiereAntelacionDias !== undefined) {
          setAntelacionDias(dataPoliticas.requiereAntelacionDias.toString());
        }
      }
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
  }, []);

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open, cargarDatos]);

  async function handleGuardarPoliticaYSaldo() {
    setCargando(true);
    try {
      // Validar datos de política
      const pct = parseInt(solapamientoPct);
      const dias = parseInt(antelacionDias);
      
      if (isNaN(pct) || pct < 0 || pct > 100) {
        toast.error('El porcentaje de solapamiento debe estar entre 0 y 100');
        setCargando(false);
        return;
      }
      
      if (isNaN(dias) || dias < 0 || dias > 365) {
        toast.error('Los días de antelación deben estar entre 0 y 365');
        setCargando(false);
        return;
      }

      // Guardar política de ausencias (nivel empresa)
      const resPolitica = await fetch('/api/empresa/politica-ausencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxSolapamientoPct: pct,
          requiereAntelacionDias: dias,
        }),
      });

      if (!resPolitica.ok) {
        const error = await resPolitica.json() as Record<string, any>;
        toast.error(error.error || 'Error al guardar política');
        setCargando(false);
        return;
      }

      // Guardar saldo
      const resSaldo = await fetch('/api/ausencias/saldo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nivel,
          diasTotales: parseInt(diasTotales),
          equipoIds: nivel === 'equipo' ? equiposSeleccionados : undefined,
        }),
      });

      if (!resSaldo.ok) {
        const error = await resSaldo.json() as Record<string, any>;
        toast.error(error.error || 'Error al guardar saldo');
        setCargando(false);
        return;
      }

      toast.success('Política de ausencias y saldo guardados correctamente');
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Error guardando configuración:', e);
      toast.error('Error al guardar la configuración');
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
        const error = await response.json() as Record<string, any>;
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
        const data = await response.json() as Record<string, any>;
        toast.success(data.message || 'Festivos importados exitosamente');
        if (onSaved) onSaved();
      } else {
        const error = await response.json() as Record<string, any>;
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
            if (value === 'politicas' || value === 'calendario') {
              setTab(value);
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="politicas">Política de ausencias</TabsTrigger>
            <TabsTrigger value="calendario">Calendario Laboral</TabsTrigger>
          </TabsList>

          {/* Tab: Política de ausencias (Saldo + Políticas) */}
          <TabsContent value="politicas" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Saldo Anual de Vacaciones</h3>
              
              <Field>
                <FieldLabel>Nivel de asignación</FieldLabel>
                <Select
                  value={nivel}
                  onValueChange={(value) => {
                    if (value === 'empresa' || value === 'equipo') {
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
            </div>

            <div className="border-t pt-6 space-y-4">
              <div className="flex items-start gap-2">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">Políticas de Ausencia</h3>
                <InfoTooltip
                  content="Estas políticas se aplican a toda la empresa. La antelación sólo afecta a vacaciones y ausencias 'otro', y el solapamiento se aplica únicamente a vacaciones."
                  side="left"
                />
              </div>

              <Field>
                <div className="flex items-center gap-2">
                  <FieldLabel>Días de antelación mínima</FieldLabel>
                  <InfoTooltip
                    content={(
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">¿Qué es la antelación mínima?</p>
                        <p className="text-xs">
                          Número mínimo de días que deben pasar entre la solicitud de ausencia y la fecha de inicio.
                          Solo aplica a ausencias que requieren aprobación (vacaciones y «otro»).
                        </p>
                        <p className="text-xs mt-2">
                          Ejemplo: Con 5 días de antelación, una ausencia que empieza el 15 de enero debe solicitarse antes del 10 de enero.
                        </p>
                      </div>
                    )}
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
                          Porcentaje máximo de empleados que pueden estar de vacaciones al mismo tiempo.
                          Controla la capacidad de la empresa durante los periodos con más ausencias.
                        </p>
                        <p className="text-xs mt-2">
                          Ejemplo: Con un 50%, si la empresa tiene 10 empleados, máximo 5 podrán estar de vacaciones simultáneamente.
                        </p>
                      </div>
                    )}
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

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <LoadingButton onClick={handleGuardarPoliticaYSaldo} loading={cargando} disabled={cargando}>
                {cargando ? 'Guardando...' : 'Guardar Configuración'}
              </LoadingButton>
            </DialogFooter>
          </TabsContent>

          {/* Tab: Calendario */}
          <TabsContent value="calendario" className="space-y-6">
            <Field>
              <FieldLabel>Días laborables de la semana</FieldLabel>
              
              <div className="flex gap-2 mt-3">
                {[
                  { key: 'lunes', label: 'Lun' },
                  { key: 'martes', label: 'Mar' },
                  { key: 'miercoles', label: 'Mié' },
                  { key: 'jueves', label: 'Jue' },
                  { key: 'viernes', label: 'Vie' },
                  { key: 'sabado', label: 'Sáb' },
                  { key: 'domingo', label: 'Dom' },
                ].map((dia) => {
                  const activo = diasLaborables[dia.key as keyof typeof diasLaborables];
                  
                  return (
                    <button
                      key={dia.key}
                      type="button"
                      onClick={() => {
                        setDiasLaborables({
                          ...diasLaborables,
                          [dia.key]: !activo,
                        });
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activo
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } cursor-pointer`}
                    >
                      {dia.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="border-t pt-6">
              <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Calendario de Festivos</h4>
                  <InfoTooltip
                    content="Los festivos se excluyen automáticamente del cálculo de días laborables en las solicitudes de ausencia."
                  />
                </div>
                <div className="flex gap-2">
                  <LoadingButton
                    size="sm"
                    variant="outline"
                    onClick={handleImportarFestivos}
                    loading={cargando}
                    disabled={cargando}
                  >
                    {cargando ? 'Importando...' : 'Importar Calendario'}
                  </LoadingButton>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setVerCalendario(!verCalendario)}
                  >
                    {verCalendario ? 'Ver Lista' : 'Ver Calendario'}
                  </Button>
                </div>
              </div>

              {verCalendario ? (
                <CalendarioFestivos onUpdate={cargarDatos} />
              ) : (
                <ListaFestivos onUpdate={cargarDatos} />
              )}
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <LoadingButton onClick={handleGuardarCalendario} loading={cargando} disabled={cargando}>
                {cargando ? 'Guardando...' : 'Guardar Calendario'}
              </LoadingButton>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


