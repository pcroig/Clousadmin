'use client';

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CalendarPlus } from 'lucide-react';

import { CalendarioFestivos, CalendarioFestivosLegend } from '@/components/hr/calendario-festivos';
import { ListaFestivos } from '@/components/hr/lista-festivos';
import { SwitchWithTooltip } from '@/components/shared/switch-with-tooltip';
import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogScrollableContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseJson } from '@/lib/utils/json';

import type { Festivo, FestivoEditorState } from '@/types/festivos';

interface GestionarAusenciasModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function GestionarAusenciasModal({ open, onClose, onSaved }: GestionarAusenciasModalProps) {
  const [saving, setSaving] = useState(false);
  const [processingFestivos, setProcessingFestivos] = useState(false);

  // Saldo de ausencias
  const [diasTotales, setDiasTotales] = useState('22');
  const [carryOverMode, setCarryOverMode] = useState<'limpiar' | 'extender'>('limpiar');
  
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
        if (dataPoliticas.diasVacacionesDefault !== undefined) {
          setDiasTotales(dataPoliticas.diasVacacionesDefault.toString());
        }
        if (dataPoliticas.carryOverModo) {
          setCarryOverMode(dataPoliticas.carryOverModo);
        } else {
          setCarryOverMode('limpiar');
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

  async function handleGuardar() {
    setSaving(true);
    try {
      // Validar días mínimos globales
      const diasMinimos = parseInt(diasTotales, 10);
      if (Number.isNaN(diasMinimos) || diasMinimos < 0 || diasMinimos > 365) {
        toast.error('El saldo anual debe estar entre 0 y 365 días');
        setSaving(false);
        return;
      }

      // Guardar saldo mínimo global
      const resSaldo = await fetch('/api/ausencias/saldo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diasTotales: diasMinimos,
        }),
      });

      if (!resSaldo.ok) {
        const error = await parseJson<{ error?: string }>(resSaldo).catch(() => ({
          error: 'Error desconocido',
        }));
        toast.error(error.error || 'Error al guardar saldo');
        setSaving(false);
        return;
      }

      // Guardar política de carry-over
      const resPolitica = await fetch('/api/empresa/politica-ausencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carryOverModo: carryOverMode,
          carryOverMeses: carryOverMode === 'extender' ? 4 : 0,
        }),
      });

      if (!resPolitica.ok) {
        const error = await parseJson<{ error?: string }>(resPolitica).catch(() => ({
          error: 'Error desconocido',
        }));
        toast.error(error.error || 'Error al guardar política');
        setSaving(false);
        return;
      }

      // Guardar calendario laboral
      const resCalendario = await fetch('/api/empresa/calendario-laboral', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diasLaborables),
      });

      if (!resCalendario.ok) {
        const error = await parseJson<{ error?: string }>(resCalendario).catch(() => ({
          error: 'Error desconocido',
        }));
        toast.error(error.error || 'Error al guardar calendario');
        setSaving(false);
        return;
      }

      toast.success('Configuración guardada correctamente');
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Error guardando configuración:', e);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
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
      <DialogScrollableContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Gestionar Ausencias</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-8">
          {/* Saldo Anual */}
          <div className="space-y-3">
            <div className="flex items-start gap-6">
              <div className="flex-1 space-y-1">
                <FieldLabel>Saldo Anual de ausencias</FieldLabel>
                <p className="text-xs text-gray-500">
                  Puedes asignar más días a empleados específicos desde su perfil.
                </p>
              </div>
              <div className="w-40">
                <InputGroup>
                  <InputGroupInput
                    type="number"
                    value={diasTotales}
                    onChange={(e) => setDiasTotales(e.target.value)}
                    min="0"
                    max="365"
                    placeholder="22"
                    inputMode="numeric"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>días</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>

            <SwitchWithTooltip
              label="Extender compensación 4 meses"
              tooltipContent="Si está activo, el saldo pendiente se puede usar durante 4 meses tras cerrar el año."
              checked={carryOverMode === 'extender'}
              onCheckedChange={(checked) => setCarryOverMode(checked ? 'extender' : 'limpiar')}
              disabled={saving}
            />
          </div>

          {/* Calendario Laboral */}
          <div className="space-y-4 pt-4">
            <Field>
              <FieldLabel>Días laborables de la semana</FieldLabel>
              
              <div className="flex gap-2 mt-2 mb-6">
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
              <div className="flex flex-wrap items-center gap-4 md:justify-between">
                <TabsList className="w-auto flex-shrink-0">
                  <TabsTrigger value="calendario">Calendario</TabsTrigger>
                  <TabsTrigger value="lista">Festivos</TabsTrigger>
                </TabsList>
                
                <div className="flex flex-1 flex-wrap items-center justify-end gap-4">
                  {festivosView === 'calendario' && <CalendarioFestivosLegend className="flex-nowrap" />}
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCreateFestivoInline()}
                      aria-label="Añadir festivo"
                      title="Añadir festivo"
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processingFestivos}
                    >
                      {processingFestivos ? 'Importando...' : 'Importar'}
                    </Button>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".ics,.csv"
                className="hidden"
                onChange={handleArchivoFestivosChange}
              />

              <TabsContent value="calendario" className="space-y-4">
                <CalendarioFestivos
                  diasLaborables={diasLaborables}
                  onUpdate={cargarDatos}
                  refreshToken={festivosRefreshKey}
                  onRequestCreate={handleCreateFestivoInline}
                  onRequestEdit={handleEditFestivoInline}
                  numberOfMonths={1}
                  showLegend={false}
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
                  showCreateButton={false}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <LoadingButton
            onClick={handleGuardar}
            loading={saving}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </LoadingButton>
        </DialogFooter>
      </DialogScrollableContent>
    </Dialog>
  );
}


