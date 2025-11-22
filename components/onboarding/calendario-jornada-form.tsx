'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { toast } from 'sonner';

import { configurarCalendarioYJornadaAction } from '@/app/(dashboard)/onboarding/cargar-datos/actions';
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

import type { DiasLaborables } from '@/lib/calculos/dias-laborables';
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

const DEFAULT_DIAS: DiasLaborables = {
  lunes: true,
  martes: true,
  miercoles: true,
  jueves: true,
  viernes: true,
  sabado: false,
  domingo: false,
};

interface CalendarioJornadaFormProps {
  onSuccess?: () => void;
}

export interface CalendarioJornadaFormHandle {
  guardar: () => Promise<boolean>;
}

export const CalendarioJornadaForm = forwardRef<
  CalendarioJornadaFormHandle,
  CalendarioJornadaFormProps
>(function CalendarioJornadaForm({ onSuccess }, ref) {
  const [diasLaborables, setDiasLaborables] = useState<DiasLaborables>(DEFAULT_DIAS);
  const [nombre, setNombre] = useState('Jornada estándar');
  const [tipo, setTipo] = useState<'flexible' | 'fija'>('flexible');
  const [horasSemanales, setHorasSemanales] = useState('40');
  const [limiteInferior, setLimiteInferior] = useState('07:00');
  const [limiteSuperior, setLimiteSuperior] = useState('21:00');
  const [horaEntrada, setHoraEntrada] = useState('09:00');
  const [horaSalida, setHoraSalida] = useState('18:00');
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
          const data = await calendarioRes.json();
          if (data?.diasLaborables) {
            setDiasLaborables((prev) => ({
              ...prev,
              ...data.diasLaborables,
            }));
          }
        }

        if (isMounted && jornadasRes.ok) {
          const data = await jornadasRes.json();
          const lista = Array.isArray(data) ? data : [];
          const predefinida = lista.find((j) => j.esPredefinida);

          if (predefinida) {
            setNombre(predefinida.nombre);
            const horas = Number(predefinida.horasSemanales ?? 40);
            setHorasSemanales(Number.isNaN(horas) ? '40' : horas.toString());

            const config = (predefinida.config || {}) as Record<string, unknown>;
            const nuevoTipo = config.tipo === 'fija' ? 'fija' : 'flexible';
            setTipo(nuevoTipo);

            const updatedDias: DiasLaborables = { ...DEFAULT_DIAS };
            DIA_LABELS.forEach(({ key }) => {
              const diaConfig = config[key];
              if (diaConfig && typeof diaConfig === 'object' && 'activo' in (diaConfig as Record<string, unknown>)) {
                updatedDias[key] = Boolean((diaConfig as Record<string, unknown>).activo);
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
              const diaReferencia = config.lunes as Record<string, unknown> | undefined;
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
          nombre: nombre.trim() || 'Jornada estándar',
          tipo,
          horasSemanales: horas,
          limiteInferior: tipo === 'flexible' ? limiteInferior : undefined,
          limiteSuperior: tipo === 'flexible' ? limiteSuperior : undefined,
          horaEntrada: tipo === 'fija' ? horaEntrada : horaEntrada,
          horaSalida: tipo === 'fija' ? horaSalida : horaSalida,
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
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Calendario y jornada base</h3>
        <p className="text-sm text-gray-500">
          Te proponemos una configuración inicial para que no empieces desde cero. Puedes modificarla
          ahora o más tarde desde el panel de RRHH.
        </p>
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

