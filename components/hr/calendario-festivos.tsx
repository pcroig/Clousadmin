'use client';

// ========================================
// Calendario Visual de Festivos
// ========================================

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

import { EditarFestivoModal } from './editar-festivo-modal';

interface Festivo {
  id: string;
  fecha: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

interface CalendarioFestivosProps {
  onUpdate?: () => void;
}

export function CalendarioFestivos({ onUpdate }: CalendarioFestivosProps) {
  const [mesActual, setMesActual] = useState(new Date());
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [festivosDates, setFestivosDates] = useState<Date[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>();
  const [modalEditar, setModalEditar] = useState<{
    open: boolean;
    festivo: Festivo | null;
    modo: 'crear' | 'editar';
  }>({
    open: false,
    festivo: null,
    modo: 'crear',
  });

  const cargarFestivos = useCallback(async () => {
    setCargando(true);
    try {
      const año = mesActual.getFullYear();
      const response = await fetch(`/api/festivos?año=${año}`);
      if (response.ok) {
        const data = await response.json();
        const festivosList = data.festivos || [];
        setFestivos(festivosList);
        
        // Convertir fechas a objetos Date para el calendario
        const dates = festivosList
          .filter((f: Festivo) => f.activo)
          .map((f: Festivo) => new Date(f.fecha + 'T00:00:00'));
        setFestivosDates(dates);
      }
    } catch (error) {
      console.error('Error cargando festivos:', error);
    } finally {
      setCargando(false);
    }
  }, [mesActual]);

  useEffect(() => {
    cargarFestivos();
  }, [cargarFestivos]);

  function handleDiaClick(date: Date | undefined) {
    if (!date) return;

    // Formatear fecha como YYYY-MM-DD
    const fechaStr = date.toISOString().split('T')[0];
    
    // Buscar si existe un festivo en esa fecha
    const festivoExistente = festivos.find((f) => f.fecha === fechaStr);

    if (festivoExistente) {
      // Abrir modal de edición
      setModalEditar({
        open: true,
        festivo: festivoExistente,
        modo: 'editar',
      });
    } else {
      // Abrir modal de creación con fecha preseleccionada
      setFechaSeleccionada(date);
      setModalCrear(true);
    }
  }

  function cambiarMes(direccion: 'anterior' | 'siguiente') {
    setMesActual((prev) => {
      const nueva = new Date(prev);
      if (direccion === 'anterior') {
        nueva.setMonth(nueva.getMonth() - 1);
      } else {
        nueva.setMonth(nueva.getMonth() + 1);
      }
      return nueva;
    });
  }

  const nombreMes = mesActual.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">{nombreMes}</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => cambiarMes('anterior')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => cambiarMes('siguiente')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setFechaSeleccionada(undefined);
              setModalCrear(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuevo Festivo
          </Button>
        </div>
      </div>

      <div className="rounded-md border p-4">
        {cargando ? (
          <div className="text-center py-8 text-gray-500">Cargando calendario...</div>
        ) : (
          <Calendar
            mode="single"
            selected={undefined}
            onSelect={handleDiaClick}
            month={mesActual}
            onMonthChange={setMesActual}
            modifiers={{
              festivo: festivosDates,
            }}
            modifiersClassNames={{
              festivo: 'bg-red-100 text-red-900 font-semibold hover:bg-red-200',
            }}
            className="mx-auto"
          />
        )}
      </div>

      <EditarFestivoModal
        open={modalCrear}
        festivo={
          fechaSeleccionada
            ? {
                id: '',
                fecha: fechaSeleccionada.toISOString().split('T')[0],
                nombre: '',
                tipo: 'empresa',
                activo: true,
              }
            : null
        }
        modo="crear"
        onClose={() => {
          setModalCrear(false);
          setFechaSeleccionada(undefined);
        }}
        onSuccess={() => {
          cargarFestivos();
          if (onUpdate) onUpdate();
        }}
      />

      <EditarFestivoModal
        open={modalEditar.open}
        festivo={modalEditar.festivo}
        modo={modalEditar.modo}
        onClose={() => setModalEditar({ open: false, festivo: null, modo: 'crear' })}
        onSuccess={() => {
          cargarFestivos();
          if (onUpdate) onUpdate();
        }}
      />
    </div>
  );
}

