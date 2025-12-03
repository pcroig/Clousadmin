'use client';

// ========================================
// Calendario Laboral Step - Onboarding
// ========================================

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'sonner';

import { CalendarioFestivos } from '@/components/hr/calendario-festivos';
import { ListaFestivos } from '@/components/hr/lista-festivos';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
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
  const [processingFestivos, setProcessingFestivos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importandoNacionales, setImportandoNacionales] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nacionalesImportadosRef = useRef(false);

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
    async function ensureFestivosNacionales() {
      if (nacionalesImportadosRef.current) return;
      nacionalesImportadosRef.current = true;
      setImportandoNacionales(true);
      try {
        const response = await fetch('/api/festivos/importar-nacionales', {
          method: 'POST',
        });

        if (response.ok) {
          setFestivosRefreshKey((prev) => prev + 1);
        } else {
          console.warn('[CalendarioStep] No se pudieron importar los festivos nacionales por defecto.');
          nacionalesImportadosRef.current = false;
        }
      } catch (error) {
        console.error('Error importando festivos nacionales por defecto:', error);
        nacionalesImportadosRef.current = false;
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

  async function handleArchivoFestivosChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

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
      } else {
        toast.error(data?.error || 'Error al importar calendario');
      }
    } catch (error) {
      console.error('Error importando calendario:', error);
      toast.error('Error al importar calendario');
    } finally {
      setProcessingFestivos(false);
      event.target.value = '';
    }
  }

  const guardar = async (): Promise<boolean> => {
    setSaving(true);
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
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    guardar
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">Configura el calendario laboral</h3>
        <p className="text-sm text-gray-500">
          Establece los días laborables de la semana y añade los festivos de tu localidad.
        </p>
      </div>

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
              Límite inferior de fichaje (aplica a todas las jornadas)
            </FieldLabel>
            <Input
              id="limiteInferiorFichaje"
              type="time"
              value={limiteInferiorFichaje}
              onChange={(e) => setLimiteInferiorFichaje(e.target.value)}
              placeholder="07:00"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Hora mínima de entrada permitida
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="limiteSuperiorFichaje">
              Límite superior de fichaje (aplica a todas las jornadas)
            </FieldLabel>
            <Input
              id="limiteSuperiorFichaje"
              type="time"
              value={limiteSuperiorFichaje}
              onChange={(e) => setLimiteSuperiorFichaje(e.target.value)}
              placeholder="21:00"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Hora máxima de salida permitida
            </p>
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
      </div>
    </div>
  );
});

