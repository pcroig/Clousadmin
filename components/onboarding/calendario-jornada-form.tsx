'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { toast } from 'sonner';

import { configurarCalendarioYJornadaAction } from '@/app/(dashboard)/onboarding/cargar-datos/actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseJson } from '@/lib/utils/json';

import type { DiasLaborables } from '@/lib/calculos/dias-laborables';
import { DIAS_LABORABLES_DEFAULT } from '@/lib/calculos/dias-laborables';
import { DEFAULT_JORNADA_FORM_VALUES } from '@/lib/jornadas/defaults';
import type { CalendarioJornadaOnboardingInput } from '@/lib/validaciones/schemas';

type DiaKey = keyof DiasLaborables;

const DIA_LABELS: Array<{ key: DiaKey; label: string }> = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

interface CalendarioJornadaFormProps {
  onSuccess?: () => void;
}

export interface CalendarioJornadaFormHandle {
  guardar: () => Promise<boolean>;
}

interface CalendarioResponse {
  diasLaborables?: Partial<DiasLaborables>;
}

interface JornadaLite {
  id: string;
  nombre: string;
  esPredefinida?: boolean;
  horasSemanales?: number | string;
  config?: Record<string, unknown>;
}

interface JornadaConfigData extends Record<string, unknown> {
  tipo?: string;
  limiteInferior?: string;
  limiteSuperior?: string;
  lunes?: Record<string, unknown>;
}

export const CalendarioJornadaForm = forwardRef<
  CalendarioJornadaFormHandle,
  CalendarioJornadaFormProps
>(function CalendarioJornadaForm({ onSuccess }, ref) {
  const createDefaultDias = () => ({ ...DIAS_LABORABLES_DEFAULT });
  const [diasLaborables, setDiasLaborables] = useState<DiasLaborables>(createDefaultDias());
  const [nombre, setNombre] = useState(DEFAULT_JORNADA_FORM_VALUES.nombre);
  const [tipo, setTipo] = useState<'flexible' | 'fija'>(DEFAULT_JORNADA_FORM_VALUES.tipo);
  const [horasSemanales, setHorasSemanales] = useState(
    DEFAULT_JORNADA_FORM_VALUES.horasSemanales.toString()
  );
  const [limiteInferior, setLimiteInferior] = useState(
    DEFAULT_JORNADA_FORM_VALUES.limiteInferior
  );
  const [limiteSuperior, setLimiteSuperior] = useState(
    DEFAULT_JORNADA_FORM_VALUES.limiteSuperior
  );
  const [horaEntrada, setHoraEntrada] = useState(DEFAULT_JORNADA_FORM_VALUES.horaEntrada);
  const [horaSalida, setHoraSalida] = useState(DEFAULT_JORNADA_FORM_VALUES.horaSalida);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useImperativeHandle(ref, () => ({
    guardar: async () => guardarConfiguracion(),
  }));

  useEffect(() => {
    let isMounted = true;

    const cargarConfiguracion = async () => {
      try {
        const [calendarioRes, jornadasRes] = await Promise.all([
          fetch('/api/empresa/calendario-laboral'),
          fetch('/api/jornadas'),
        ]);

        if (isMounted && calendarioRes.ok) {
          const data = await parseJson<CalendarioResponse>(calendarioRes);
          if (data?.diasLaborables) {
            setDiasLaborables((prev) => ({
              ...prev,
              ...data.diasLaborables,
            }));
          }
        }

        if (isMounted && jornadasRes.ok) {
          const data = await parseJson<JornadaLite[] | { jornadas?: JornadaLite[] }>(jornadasRes);
          const lista: JornadaLite[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.jornadas)
              ? data.jornadas ?? []
              : [];
          const predefinida = lista.find((j) => j.esPredefinida);

          if (predefinida) {
            setNombre(predefinida.nombre);
            const horas = Number(predefinida.horasSemanales ?? 40);
            setHorasSemanales(Number.isNaN(horas) ? '40' : horas.toString());

            const config = (predefinida.config ?? {}) as JornadaConfigData;
            const nuevoTipo = config.tipo === 'fija' ? 'fija' : 'flexible';
            setTipo(nuevoTipo);

            const updatedDias: DiasLaborables = createDefaultDias();
            DIA_LABELS.forEach(({ key }) => {
              const diaConfig = config[key];
              if (diaConfig && typeof diaConfig === 'object' && 'activo' in diaConfig) {
                updatedDias[key] = Boolean(
                  (diaConfig as { activo?: unknown }).activo
                );
              }
            });
            setDiasLaborables(updatedDias);

            if (nuevoTipo === 'flexible') {
              if (typeof config.limiteInferior === 'string') {
                setLimiteInferior(config.limiteInferior);
              }
              if (typeof config.limiteSuperior === 'string') {
                setLimiteSuperior(config.limiteSuperior);
              }
            } else {
              const diaReferencia = config.lunes as { entrada?: unknown; salida?: unknown } | undefined;
              if (diaReferencia?.entrada && typeof diaReferencia.entrada === 'string') {
                setHoraEntrada(diaReferencia.entrada);
              }
              if (diaReferencia?.salida && typeof diaReferencia.salida === 'string') {
                setHoraSalida(diaReferencia.salida);
              }
            }
          }
        }
      } catch (error) {
        console.error('[CalendarioJornadaForm] Error cargando configuración', error);
        toast.error('No se pudo cargar la configuración guardada');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    cargarConfiguracion();

    return () => {
      isMounted = false;
    };
  }, []);

  const restaurarValores = () => {
    if (loading) return;
    setDiasLaborables(createDefaultDias());
    setNombre(DEFAULT_JORNADA_FORM_VALUES.nombre);
    setTipo(DEFAULT_JORNADA_FORM_VALUES.tipo);
    setHorasSemanales(DEFAULT_JORNADA_FORM_VALUES.horasSemanales.toString());
    setLimiteInferior(DEFAULT_JORNADA_FORM_VALUES.limiteInferior);
    setLimiteSuperior(DEFAULT_JORNADA_FORM_VALUES.limiteSuperior);
    setHoraEntrada(DEFAULT_JORNADA_FORM_VALUES.horaEntrada);
    setHoraSalida(DEFAULT_JORNADA_FORM_VALUES.horaSalida);
  };

  const guardarConfiguracion = async () => {
    if (saving) return false;

    if (loading) {
      toast.error('Espera a que carguemos la configuración inicial');
      return false;
    }

    setSaving(true);
    try {
      const horas = Number(horasSemanales);
      if (Number.isNaN(horas) || horas <= 0) {
        toast.error('Introduce unas horas semanales válidas');
        setSaving(false);
        return false;
      }

      const payload: CalendarioJornadaOnboardingInput = {
        diasLaborables,
        jornada: {
          nombre: nombre.trim() || DEFAULT_JORNADA_FORM_VALUES.nombre,
          tipo,
          horasSemanales: horas || DEFAULT_JORNADA_FORM_VALUES.horasSemanales,
          limiteInferior:
            tipo === 'flexible'
              ? limiteInferior || DEFAULT_JORNADA_FORM_VALUES.limiteInferior
              : undefined,
          limiteSuperior:
            tipo === 'flexible'
              ? limiteSuperior || DEFAULT_JORNADA_FORM_VALUES.limiteSuperior
              : undefined,
          horaEntrada: horaEntrada || DEFAULT_JORNADA_FORM_VALUES.horaEntrada,
          horaSalida: horaSalida || DEFAULT_JORNADA_FORM_VALUES.horaSalida,
        },
      };

      const result = await configurarCalendarioYJornadaAction(payload);
      if (!result.success) {
        toast.error(result.error || 'No se pudo guardar la configuración');
        return false;
      }

      toast.success('Calendario y jornada guardados');
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('[CalendarioJornadaForm] Error al guardar', error);
      toast.error('Error al guardar la configuración');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Calendario y jornada base</h3>
          <p className="text-sm text-gray-500">
            Te proponemos una configuración inicial para que no empieces desde cero. Puedes
            modificarla ahora o más tarde desde el panel de RRHH.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={restaurarValores}
          disabled={loading}
        >
          Restaurar valores recomendados
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-white p-4">
          <div>
            <Label htmlFor="nombre-jornada">Nombre de la jornada</Label>
            <Input
              id="nombre-jornada"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="horas-semanales">Horas semanales</Label>
            <Input
              id="horas-semanales"
              type="number"
              min={1}
              max={168}
              value={horasSemanales}
              onChange={(e) => setHorasSemanales(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label>Tipo de jornada</Label>
            <Select
              value={tipo}
              onValueChange={(value) => {
                if (value === 'flexible' || value === 'fija') {
                  setTipo(value);
                }
              }}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">Flexible (rango horario)</SelectItem>
                <SelectItem value="fija">Horario fijo (entrada y salida)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-white p-4">
          {tipo === 'flexible' ? (
            <>
              <div>
                <Label>Horario mínimo diario</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500">Desde</span>
                    <Input
                      type="time"
                      value={limiteInferior}
                      onChange={(e) => setLimiteInferior(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Hasta</span>
                    <Input
                      type="time"
                      value={limiteSuperior}
                      onChange={(e) => setLimiteSuperior(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Horario fijo diario</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500">Entrada</span>
                    <Input
                      type="time"
                      value={horaEntrada}
                      onChange={(e) => setHoraEntrada(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Salida</span>
                    <Input
                      type="time"
                      value={horaSalida}
                      onChange={(e) => setHoraSalida(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Días laborables</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DIA_LABELS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={diasLaborables[key]}
                    onCheckedChange={(checked) =>
                      setDiasLaborables((prev) => ({
                        ...prev,
                        [key]: Boolean(checked),
                      }))
                    }
                    disabled={loading}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Puedes activar fines de semana si tu empresa trabaja esos días.
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
          Cargando configuración predeterminada...
        </div>
      )}

      <div className="text-xs text-gray-500">
        Esta configuración se aplicará a los empleados existentes que todavía no tengan jornada
        asignada. Podrás crear variaciones más adelante.
      </div>

    </div>
  );
});

