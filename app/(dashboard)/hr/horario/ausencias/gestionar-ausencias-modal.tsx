'use client';

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
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
import { parseJson } from '@/lib/utils/json';
import { Switch } from '@/components/ui/switch';
import type { Festivo, FestivoEditorState } from '@/types/festivos';

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
  const [savingPolitica, setSavingPolitica] = useState(false);
  const [savingCalendario, setSavingCalendario] = useState(false);
  const [processingFestivos, setProcessingFestivos] = useState(false);
  const [tab, setTab] = useState<'politicas' | 'calendario'>('politicas');

  // Saldo y Políticas (ahora juntos)
  const [nivel, setNivel] = useState<'empresa' | 'equipo'>('empresa');
  const [diasTotales, setDiasTotales] = useState('22');
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);
  
  // Políticas de Ausencia - Para toda la empresa
  const [solapamientoPct, setSolapamientoPct] = useState('50');
  const [antelacionDias, setAntelacionDias] = useState('5');
  const [carryOverMode, setCarryOverMode] = useState<'limpiar' | 'extender'>('limpiar');
  const [carryOverMonths, setCarryOverMonths] = useState('4');
  
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
  const [festivosView, setFestivosView] = useState<'calendario' | 'lista'>('lista');
  const [festivoEditor, setFestivoEditor] = useState<FestivoEditorState | null>(null);
  const [festivosRefreshKey, setFestivosRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargarDatos = useCallback(async () => {
    try {
      // Cargar equipos
      const resEquipos = await fetch('/api/organizacion/equipos');
      if (resEquipos.ok) {
        const dataEquipos = await parseJson<Equipo[]>(resEquipos);
        setEquipos(Array.isArray(dataEquipos) ? dataEquipos : []);
      }
      
      // Cargar configuración de calendario laboral
      const resCalendario = await fetch('/api/empresa/calendario-laboral');
      if (resCalendario.ok) {
        const dataCalendario = await parseJson<{ diasLaborables?: typeof diasLaborables }>(
          resCalendario
        );
        if (dataCalendario?.diasLaborables) {
          setDiasLaborables(dataCalendario.diasLaborables);
        }
      }
      
      // Cargar políticas de ausencias de la empresa
      const resPoliticas = await fetch('/api/empresa/politica-ausencias');
      if (resPoliticas.ok) {
        const dataPoliticas = await parseJson<{
          maxSolapamientoPct?: number;
          requiereAntelacionDias?: number;
          diasVacacionesDefault?: number;
          carryOverModo?: 'limpiar' | 'extender';
          carryOverMeses?: number;
        }>(resPoliticas);
        if (dataPoliticas.maxSolapamientoPct !== undefined) {
          setSolapamientoPct(dataPoliticas.maxSolapamientoPct.toString());
        }
        if (dataPoliticas.requiereAntelacionDias !== undefined) {
          setAntelacionDias(dataPoliticas.requiereAntelacionDias.toString());
        }
        if (dataPoliticas.diasVacacionesDefault !== undefined) {
          setDiasTotales(dataPoliticas.diasVacacionesDefault.toString());
        }
        if (dataPoliticas.carryOverModo) {
          setCarryOverMode(dataPoliticas.carryOverModo);
        } else {
          setCarryOverMode('limpiar');
        }
        if (dataPoliticas.carryOverMeses !== undefined) {
          setCarryOverMonths(dataPoliticas.carryOverMeses.toString());
        } else {
          setCarryOverMonths('4');
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
    setSavingPolitica(true);
    try {
      // Validar datos de política
      const pct = parseInt(solapamientoPct, 10);
      const dias = parseInt(antelacionDias, 10);
      
      if (isNaN(pct) || pct < 0 || pct > 100) {
        toast.error('El porcentaje de solapamiento debe estar entre 0 y 100');
        setSavingPolitica(false);
        return;
      }
      
      if (isNaN(dias) || dias < 0 || dias > 365) {
        toast.error('Los días de antelación deben estar entre 0 y 365');
        setSavingPolitica(false);
        return;
      }

      let mesesExtension = parseInt(carryOverMonths || '4', 10);
      if (Number.isNaN(mesesExtension)) {
        mesesExtension = 4;
      }
      if (carryOverMode === 'extender' && (mesesExtension < 1 || mesesExtension > 12)) {
        toast.error('Los meses de extensión deben estar entre 1 y 12');
        setSavingPolitica(false);
        return;
      }

      // Guardar política de ausencias (nivel empresa)
      const resPolitica = await fetch('/api/empresa/politica-ausencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxSolapamientoPct: pct,
          requiereAntelacionDias: dias,
          carryOverModo: carryOverMode,
          carryOverMeses: carryOverMode === 'extender' ? mesesExtension : 0,
        }),
      });

      if (!resPolitica.ok) {
        const error = await parseJson<{ error?: string }>(resPolitica).catch(() => ({
          error: 'Error desconocido',
        }));
        toast.error(error.error || 'Error al guardar política');
        setSavingPolitica(false);
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
        const error = await parseJson<{ error?: string }>(resSaldo).catch(() => ({
          error: 'Error desconocido',
        }));
        toast.error(error.error || 'Error al guardar saldo');
        setSavingPolitica(false);
        return;
      }

      toast.success('Política de ausencias y saldo guardados correctamente');
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Error guardando configuración:', e);
      toast.error('Error al guardar la configuración');
    } finally {
      setSavingPolitica(false);
    }
  }
  
  async function handleGuardarCalendario() {
    setSavingCalendario(true);
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
        const error = await parseJson<{ error?: string }>(response).catch(() => ({
          error: 'Error desconocido',
        }));
        toast.error(error.error || 'Error al guardar calendario');
      }
    } catch (e) {
      console.error('Error guardando calendario:', e);
      toast.error('Error al guardar calendario');
    } finally {
      setSavingCalendario(false);
    }
  }
  
  async function handleArchivoFestivosChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setProcessingFestivos(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/festivos/importar', {
        method: 'POST',
        body: formData,
      });

      const data = await parseJson<{ message?: string; error?: string }>(response).catch(() => null);

      if (response.ok) {
        toast.success(data?.message || 'Calendario importado correctamente');
        await cargarDatos();
        setFestivosRefreshKey((prev) => prev + 1);
        onSaved?.();
      } else {
        toast.error(data?.error || 'Error al importar calendario');
      }
    } catch (error) {
      console.error('Error importando calendario desde archivo:', error);
      toast.error('Error al importar calendario');
    } finally {
      setProcessingFestivos(false);
      event.target.value = '';
    }
  }

  const handleCloseEditor = () => setFestivoEditor(null);

  const handleCreateFestivoInline = (fecha?: string) => {
    setFestivosView('lista');
    setFestivoEditor({
      mode: 'crear',
      fecha,
    });
  };

  const handleEditFestivoInline = (festivo: Festivo) => {
    setFestivosView('lista');
    setFestivoEditor({
      mode: 'editar',
      festivo,
    });
  };

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

              <Field>
                <div className="flex items-center justify-between">
                  <div>
                    <FieldLabel>Tratamiento de saldo al cierre</FieldLabel>
                    <p className="text-xs text-gray-500">
                      Define si el saldo pendiente se limpia automáticamente o se extiende unos meses.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Limpiar</span>
                    <Switch
                      checked={carryOverMode === 'extender'}
                      onCheckedChange={(checked) =>
                        setCarryOverMode(checked ? 'extender' : 'limpiar')
                      }
                    />
                    <span className="text-xs text-gray-500">Extender</span>
                  </div>
                </div>
                {carryOverMode === 'extender' && (
                  <div className="mt-4 flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={carryOverMonths}
                      onChange={(e) => setCarryOverMonths(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">meses adicionales</span>
                  </div>
                )}
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
              <LoadingButton
                onClick={handleGuardarPoliticaYSaldo}
                loading={savingPolitica}
                disabled={savingPolitica}
              >
                {savingPolitica ? 'Guardando...' : 'Guardar Configuración'}
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

            <Tabs
              value={festivosView}
              onValueChange={(value) => {
                if (value === 'calendario' || value === 'lista') {
                  setFestivosView(value);
                }
              }}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="calendario">Calendario visual</TabsTrigger>
                <TabsTrigger value="lista">Lista de festivos</TabsTrigger>
              </TabsList>

              <TabsContent value="calendario" className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,.csv"
                  className="hidden"
                  onChange={handleArchivoFestivosChange}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processingFestivos}
                  >
                    {processingFestivos ? 'Importando...' : 'Importar calendario'}
                  </Button>
                </div>

                <CalendarioFestivos
                  diasLaborables={diasLaborables}
                  onUpdate={cargarDatos}
                  refreshToken={festivosRefreshKey}
                  onRequestCreate={handleCreateFestivoInline}
                  onRequestEdit={handleEditFestivoInline}
                />
              </TabsContent>

              <TabsContent value="lista">
                <ListaFestivos
                  refreshToken={festivosRefreshKey}
                  onUpdate={cargarDatos}
                  editorState={festivoEditor}
                  onEditorClose={handleCloseEditor}
                  onCreateRequest={() => handleCreateFestivoInline()}
                  onEditRequest={handleEditFestivoInline}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <LoadingButton
                onClick={handleGuardarCalendario}
                loading={savingCalendario}
                disabled={savingCalendario}
              >
                {savingCalendario ? 'Guardando...' : 'Guardar Calendario'}
              </LoadingButton>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


