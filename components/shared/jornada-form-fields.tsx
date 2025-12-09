'use client';

// ========================================
// Jornada Form Fields - Componente Reutilizable
// ========================================
// Se usa en: onboarding, crear jornada, editar jornada

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

interface HorarioDia {
  activo: boolean;
  entrada: string;
  salida: string;
  pausa_inicio?: string;
  pausa_fin?: string;
}

export interface JornadaFormData {
  // NOTE: 'nombre' field has been removed - jornadas are now identified by their configuration
  tipoJornada: 'fija' | 'flexible';
  horasSemanales: string;
  // NOTE: limiteInferior and limiteSuperior are NO LONGER per-jornada - they are global in Empresa.config
  horariosFijos: Record<string, HorarioDia>;
  tieneDescanso: boolean;
  descansoMinutos: string;
}

interface JornadaFormFieldsProps {
  data: JornadaFormData;
  onChange: (data: JornadaFormData) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  showAsignacion?: boolean;
  nivelAsignacion?: 'empresa' | 'equipo' | 'individual';
  onNivelAsignacionChange?: (nivel: 'empresa' | 'equipo' | 'individual') => void;
  empleados?: Array<{ id: string; nombre: string; apellidos: string }>;
  empleadosSeleccionados?: string[];
  onEmpleadosSeleccionChange?: (ids: string[]) => void;
  equipos?: Array<{ id: string; nombre: string; miembros: number }>;
  equiposSeleccionados?: string[]; // Cambiado de singular a plural para múltiples equipos
  onEquiposSeleccionadosChange?: (ids: string[]) => void; // Cambiado para recibir array
}

const DIA_KEYS: Array<{ key: DiaKey; label: string; shortLabel: string }> = [
  { key: 'lunes', label: 'Lunes', shortLabel: 'Lun' },
  { key: 'martes', label: 'Martes', shortLabel: 'Mar' },
  { key: 'miercoles', label: 'Miércoles', shortLabel: 'Mie' },
  { key: 'jueves', label: 'Jueves', shortLabel: 'Jue' },
  { key: 'viernes', label: 'Viernes', shortLabel: 'Vie' },
  { key: 'sabado', label: 'Sábado', shortLabel: 'Sab' },
  { key: 'domingo', label: 'Domingo', shortLabel: 'Dom' },
];

export function JornadaFormFields({
  data,
  onChange,
  errors = {},
  disabled = false,
  showAsignacion = false,
  nivelAsignacion = 'empresa',
  onNivelAsignacionChange,
  empleados = [],
  empleadosSeleccionados = [],
  onEmpleadosSeleccionChange,
  equipos = [],
  equiposSeleccionados = [],
  onEquiposSeleccionadosChange,
}: JornadaFormFieldsProps) {
  const DESCANSO_MIN = 0;
  const DESCANSO_MAX = 480;
  const DESCANSO_STEP = 15;

  function updateData(updates: Partial<JornadaFormData>) {
    onChange({ ...data, ...updates });
  }

  function updateHorarioFijo(dia: string, updates: Partial<HorarioDia>) {
    updateData({
      horariosFijos: {
        ...data.horariosFijos,
        [dia]: { ...data.horariosFijos[dia], ...updates },
      },
    });
  }

  function toggleDia(dia: string) {
    const activo = data.horariosFijos[dia]?.activo ?? false;
    updateHorarioFijo(dia, { activo: !activo });
  }

  function toggleEmpleado(empleadoId: string) {
    if (!onEmpleadosSeleccionChange) return;
    const newSelection = empleadosSeleccionados.includes(empleadoId)
      ? empleadosSeleccionados.filter(id => id !== empleadoId)
      : [...empleadosSeleccionados, empleadoId];
    onEmpleadosSeleccionChange(newSelection);
  }

  function toggleEquipo(equipoId: string) {
    if (!onEquiposSeleccionadosChange) return;
    const newSelection = equiposSeleccionados.includes(equipoId)
      ? equiposSeleccionados.filter(id => id !== equipoId)
      : [...equiposSeleccionados, equipoId];
    onEquiposSeleccionadosChange(newSelection);
  }

  const parseDescansoValue = (value: string): number => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const clampDescanso = (value: number) => Math.min(DESCANSO_MAX, Math.max(DESCANSO_MIN, value));

  const setDescansoValue = (value: number) => {
    const clamped = clampDescanso(value);
    updateData({ descansoMinutos: clamped === 0 ? '' : clamped.toString() });
  };

  const handleDescansoBlur = () => {
    if (data.descansoMinutos === '') return;
    setDescansoValue(parseDescansoValue(data.descansoMinutos));
  };

  return (
    <div className="space-y-4">
      {/* NOTE: 'Nombre de la jornada' field has been removed */}
      {/* Configuración básica */}
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="tipo">Tipo de jornada</FieldLabel>
          <Select
            value={data.tipoJornada}
            onValueChange={(v) => {
              updateData({ 
                tipoJornada: v as 'fija' | 'flexible',
                descansoMinutos: '', // Limpiar descanso al cambiar tipo
              });
            }}
            disabled={disabled}
          >
            <SelectTrigger id="tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flexible">Flexible</SelectItem>
              <SelectItem value="fija">Fija</SelectItem>
            </SelectContent>
          </Select>
          {errors.tipoJornada && <FieldError>{errors.tipoJornada}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="horas">Horas semanales *</FieldLabel>
          <Input
            id="horas"
            type="number"
            value={data.horasSemanales}
            onChange={(e) => updateData({ horasSemanales: e.target.value })}
            placeholder="40"
            aria-invalid={!!errors.horasSemanales}
            disabled={disabled}
          />
          {errors.horasSemanales && <FieldError>{errors.horasSemanales}</FieldError>}
        </Field>
      </div>

      {/* Asignación */}
      {showAsignacion && (
        <div className="pt-4 border-t">
          <h3 className="text-base font-semibold text-gray-900 mb-3">¿A quién aplicar esta jornada?</h3>
          
          <Field>
            <Select 
              value={nivelAsignacion} 
              onValueChange={(v) => onNivelAsignacionChange?.(v as 'empresa' | 'equipo' | 'individual')}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empresa">Toda la empresa</SelectItem>
                <SelectItem value="equipo">Un equipo concreto</SelectItem>
                <SelectItem value="individual">Empleados específicos</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {nivelAsignacion === 'equipo' && (
            <Field className="mt-3">
              <FieldLabel>Seleccionar equipos</FieldLabel>
              <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto mt-2">
                {equipos.map(equipo => (
                  <div key={equipo.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={equiposSeleccionados.includes(equipo.id)}
                      onCheckedChange={() => toggleEquipo(equipo.id)}
                      disabled={disabled}
                    />
                    <span className="text-sm">
                      {equipo.nombre} ({equipo.miembros} {equipo.miembros === 1 ? 'miembro' : 'miembros'})
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {equiposSeleccionados.length} equipo{equiposSeleccionados.length !== 1 ? 's' : ''} seleccionado{equiposSeleccionados.length !== 1 ? 's' : ''}
              </p>
            </Field>
          )}

          {nivelAsignacion === 'individual' && (
            <Field className="mt-3">
              <FieldLabel>Seleccionar empleados</FieldLabel>
              <div className="border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto mt-2">
                {empleados.map(empleado => (
                  <div key={empleado.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={empleadosSeleccionados.includes(empleado.id)}
                      onCheckedChange={() => toggleEmpleado(empleado.id)}
                      disabled={disabled}
                    />
                    <span className="text-sm">{empleado.nombre} {empleado.apellidos}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {empleadosSeleccionados.length} empleado{empleadosSeleccionados.length !== 1 ? 's' : ''} seleccionado{empleadosSeleccionados.length !== 1 ? 's' : ''}
              </p>
            </Field>
          )}
        </div>
      )}

      {/* Días laborables */}
      <div className="pt-4 border-t">
        <FieldLabel>Días laborables</FieldLabel>
        <div className="flex gap-2 mt-2">
          {DIA_KEYS.map((dia) => {
            const horarioDia = data.horariosFijos[dia.key];
            const activo = horarioDia?.activo ?? false;
            
            return (
              <button
                key={dia.key}
                type="button"
                onClick={() => !disabled && toggleDia(dia.key)}
                disabled={disabled}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activo
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {dia.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tiempo de descanso */}
      {!disabled && (
        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="tiene-descanso" className="flex items-center gap-2">
                ¿Tiene descanso?
              </FieldLabel>
              <InfoTooltip
                content="Los descansos son obligatorios: si la jornada supera las 6 horas debes garantizar al menos 15 minutos consecutivos."
                side="right"
              />
            </div>
            <Switch
              id="tiene-descanso"
              checked={data.tieneDescanso}
              onCheckedChange={(checked) => {
                updateData({ 
                  tieneDescanso: checked,
                  descansoMinutos: checked ? (data.descansoMinutos || '60') : ''
                });
              }}
            />
          </div>
          
          {data.tieneDescanso && (
            <Field>
              <FieldLabel htmlFor="descanso">Duración del descanso</FieldLabel>
              <InputGroup className="mt-2">
                <InputGroupInput
                  id="descanso"
                  type="number"
                  min={DESCANSO_MIN}
                  max={DESCANSO_MAX}
                  step={DESCANSO_STEP}
                  value={data.descansoMinutos}
                  onChange={(e) => updateData({ descansoMinutos: e.target.value })}
                  onBlur={handleDescansoBlur}
                  placeholder="60"
                />
                <InputGroupAddon align="inline-end" className="gap-1">
                  <InputGroupText>min</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          )}
        </div>
      )}

      {/* Horarios específicos (solo si es tipo fija) */}
      {data.tipoJornada === 'fija' && !disabled && (
        <div>
          <FieldLabel>Horarios por día</FieldLabel>
          <div className="space-y-3 mt-3">
            {DIA_KEYS.filter(d => data.horariosFijos[d.key]?.activo).map((dia) => {
              const horario = data.horariosFijos[dia.key];
              return (
                <div key={dia.key} className="flex items-center gap-4">
                  <span className="w-24 capitalize text-sm">{dia.label}</span>
                  <Input
                    type="time"
                    value={horario.entrada}
                    onChange={(e) => updateHorarioFijo(dia.key, { entrada: e.target.value })}
                    className="w-32"
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    type="time"
                    value={horario.salida}
                    onChange={(e) => updateHorarioFijo(dia.key, { salida: e.target.value })}
                    className="w-32"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NOTE: Límites de fichaje (inferior/superior) are now GLOBAL per company */}
      {/* They are configured in Empresa.config, not per-jornada */}
      {/* See: calendario-step.tsx for configuration */}
    </div>
  );
}




