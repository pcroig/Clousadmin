'use client';

// ========================================
// Jornada Form Fields - Componente Reutilizable
// ========================================
// Se usa en: onboarding, crear jornada, editar jornada

import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  equipoSeleccionado?: string;
  onEquipoSeleccionadoChange?: (id: string) => void;
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
  equipoSeleccionado = '',
  onEquipoSeleccionadoChange,
}: JornadaFormFieldsProps) {
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
              <FieldLabel>Seleccionar equipo</FieldLabel>
              <Select 
                value={equipoSeleccionado} 
                onValueChange={(v) => onEquipoSeleccionadoChange?.(v)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elige un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {equipos.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.nombre} ({eq.miembros} {eq.miembros === 1 ? 'miembro' : 'miembros'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        <Field>
          <FieldLabel htmlFor="descanso">Tiempo de descanso (minutos)</FieldLabel>
          <Input
            id="descanso"
            type="number"
            min={0}
            max={480}
            step={15}
            value={data.descansoMinutos}
            onChange={(e) => updateData({ descansoMinutos: e.target.value })}
            placeholder="30"
          />
          <p className="text-sm text-gray-500 mt-1">
            {data.tipoJornada === 'flexible' 
              ? 'Descanso mínimo obligatorio al calcular balances'
              : 'Tiempo de descanso diario (se aplicará de 14:00 a 14:00 + minutos)'}
          </p>
        </Field>
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




