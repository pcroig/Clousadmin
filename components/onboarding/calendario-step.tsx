'use client';

// ========================================
// Calendario Laboral Step - Onboarding
// ========================================

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { toast } from 'sonner';

import { CalendarioFestivos, CalendarioFestivosLegend } from '@/components/hr/calendario-festivos';
import { ImportarFestivosModal } from '@/components/hr/importar-festivos-modal';
import { ListaFestivos } from '@/components/hr/lista-festivos';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseJson } from '@/lib/utils/json';
import { type Festivo, type FestivoEditorState } from '@/types/festivos';

export interface CalendarioStepHandle {
  guardar: () => Promise<boolean>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CalendarioStepProps {}

export const CalendarioStep = forwardRef<CalendarioStepHandle, CalendarioStepProps>(function CalendarioStep(_, ref) {
  const [diasLaborables, setDiasLaborables] = useState({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: false,
    domingo: false,
  });
  // Global time limits for fichajes (applies to ALL jornadas)
  const [limiteInferiorFichaje, setLimiteInferiorFichaje] = useState('07:00');
  const [limiteSuperiorFichaje, setLimiteSuperiorFichaje] = useState('21:00');
  const [festivosView, setFestivosView] = useState<'calendario' | 'lista'>('lista');
  const [festivoEditor, setFestivoEditor] = useState<FestivoEditorState | null>(null);
  const [festivosRefreshKey, setFestivosRefreshKey] = useState(0);
  const [_saving, _setSaving] = useState(false);
  const [importandoNacionales, setImportandoNacionales] = useState(false);
  const [importarModalOpen, setImportarModalOpen] = useState(false);
  const [añoSeleccionadoImportar, setAñoSeleccionadoImportar] = useState<number>();

  const cargarDatos = useCallback(async () => {
    try {
      const resCalendario = await fetch('/api/empresa/calendario-laboral');
      if (resCalendario.ok) {
        const dataCalendario = await parseJson<{
          diasLaborables?: typeof diasLaborables;
          limiteInferiorFichaje?: string;
          limiteSuperiorFichaje?: string;
        }>(resCalendario);
        if (dataCalendario?.diasLaborables) {
          setDiasLaborables(dataCalendario.diasLaborables);
        }
        if (dataCalendario?.limiteInferiorFichaje) {
          setLimiteInferiorFichaje(dataCalendario.limiteInferiorFichaje);
        }
        if (dataCalendario?.limiteSuperiorFichaje) {
          setLimiteSuperiorFichaje(dataCalendario.limiteSuperiorFichaje);
        }
      }
    } catch (e) {
      console.error('Error cargando calendario:', e);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    let importado = false;
    async function ensureFestivosNacionales() {
      if (importado) return;
      importado = true;
      setImportandoNacionales(true);
      try {
        const response = await fetch('/api/festivos/importar-nacionales', {
          method: 'POST',
        });

        if (response.ok) {
          setFestivosRefreshKey((prev) => prev + 1);
        } else {
          console.warn('[CalendarioStep] No se pudieron importar los festivos nacionales por defecto.');
        }
      } catch (error) {
        console.error('Error importando festivos nacionales por defecto:', error);
      } finally {
        setImportandoNacionales(false);
      }
    }

    void ensureFestivosNacionales();
  }, []);

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

  const handleCloseEditor = () => setFestivoEditor(null);

  const handleImportSuccess = async () => {
    await cargarDatos();
    setFestivosRefreshKey((prev) => prev + 1);
  };

  const handleOpenImportarModal = (año?: number) => {
    setAñoSeleccionadoImportar(año);
    setImportarModalOpen(true);
  };

  const guardar = async (): Promise<boolean> => {
    _setSaving(true);
    try {
      const response = await fetch('/api/empresa/calendario-laboral', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diasLaborables,
          limiteInferiorFichaje,
          limiteSuperiorFichaje,
        }),
      });

      if (response.ok) {
        toast.success('Calendario laboral guardado correctamente');
        return true;
      } else {
        throw new Error('Error al guardar calendario');
      }
    } catch (e) {
      console.error('Error guardando calendario:', e);
      toast.error('Error al guardar calendario');
      return false;
    } finally {
      _setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    guardar
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {importandoNacionales && (
          <p className="text-sm text-muted-foreground">
            Importando festivos nacionales por defecto...
          </p>
        )}
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

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Field>
            <FieldLabel htmlFor="limiteInferiorFichaje">
              Hora mínima de inicio
            </FieldLabel>
            <Input
              id="limiteInferiorFichaje"
              type="time"
              value={limiteInferiorFichaje}
              onChange={(e) => setLimiteInferiorFichaje(e.target.value)}
              placeholder="07:00"
              className="mt-2"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="limiteSuperiorFichaje">
              Hora máxima de salida
            </FieldLabel>
            <Input
              id="limiteSuperiorFichaje"
              type="time"
              value={limiteSuperiorFichaje}
              onChange={(e) => setLimiteSuperiorFichaje(e.target.value)}
              placeholder="21:00"
              className="mt-2"
            />
          </Field>
        </div>

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

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCreateFestivoInline()}
              >
                Añadir festivo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenImportarModal()}
              >
                Importar
              </Button>
            </div>
          </div>

          <TabsContent value="calendario" className="space-y-4">
            <CalendarioFestivosLegend />
            <CalendarioFestivos
              diasLaborables={diasLaborables}
              onUpdate={cargarDatos}
              refreshToken={festivosRefreshKey}
              onRequestCreate={handleCreateFestivoInline}
              onRequestEdit={handleEditFestivoInline}
              numberOfMonths={2}
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
              onImportRequest={(año) => handleOpenImportarModal(año)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de importar festivos */}
      <ImportarFestivosModal
        open={importarModalOpen}
        onClose={() => setImportarModalOpen(false)}
        onSuccess={handleImportSuccess}
        añoSeleccionado={añoSeleccionadoImportar}
      />
    </div>
  );
});

