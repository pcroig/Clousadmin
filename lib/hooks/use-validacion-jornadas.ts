// ========================================
// Hook: useValidacionJornadas
// ========================================
// Hook compartido para validar asignaciones de jornadas

import { useState } from 'react';
import { toast } from 'sonner';

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
}

interface ValidacionResult {
  valida: boolean;
  totalEmpleados: number;
  empleadosConJornada: number;
  empleadosSinJornada: Empleado[];
  empleadosConMultiplesJornadas: Array<{
    empleado: Empleado;
    jornadas: Array<{ id: string; etiqueta: string }>;
  }>;
  errores: string[];
  mensajeResumen: string;
}

export function useValidacionJornadas() {
  const [validacion, setValidacion] = useState<ValidacionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const validar = async (): Promise<boolean> => {
    setLoading(true);

    try {
      const response = await fetch('/api/jornadas/validar-asignaciones');

      if (!response.ok) {
        throw new Error('Error al validar jornadas');
      }

      const data = (await response.json()) as ValidacionResult;
      setValidacion(data);

      return data.valida;
    } catch (error) {
      console.error('Error validando jornadas:', error);
      toast.error('Error al validar las asignaciones de jornadas');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const mostrarErrores = () => {
    if (!validacion) return;

    if (validacion.empleadosSinJornada.length > 0) {
      const empleados = validacion.empleadosSinJornada;
      const nombresCortos = empleados
        .slice(0, 3)
        .map((e) => `${e.nombre} ${e.apellidos}`)
        .join(', ');

      let mensaje = `${empleados.length} empleado${empleados.length !== 1 ? 's' : ''} sin jornada: ${nombresCortos}`;

      if (empleados.length > 3) {
        mensaje += ` y ${empleados.length - 3} más`;
      }

      toast.error(mensaje, {
        duration: 8000,
        description:
          'Todos los empleados deben tener una jornada asignada antes de continuar.',
      });
    }

    if (validacion.empleadosConMultiplesJornadas.length > 0) {
      toast.error(
        `${validacion.empleadosConMultiplesJornadas.length} empleado${validacion.empleadosConMultiplesJornadas.length !== 1 ? 's' : ''} con múltiples jornadas`,
        {
          duration: 8000,
          description:
            'Cada empleado debe tener exactamente una jornada asignada.',
        }
      );
    }
  };

  const limpiar = () => {
    setValidacion(null);
  };

  return {
    validacion,
    loading,
    validar,
    mostrarErrores,
    limpiar,
  };
}
