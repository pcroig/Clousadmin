'use client';

// ========================================
// Carpeta Selector Component
// ========================================
// Selector reutilizable para elegir carpeta o crear una nueva

import { FolderPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseJson } from '@/lib/utils/json';

interface Carpeta {
  id: string;
  nombre: string;
  esSistema: boolean;
}

interface CarpetasResponse {
  carpetas?: Carpeta[];
  error?: string;
}

interface CarpetaSelectorProps {
  empleadoId?: string;
  value: string | null;
  onChange: (carpetaId: string | null) => void;
  onNuevaCarpeta?: (nombre: string) => Promise<string | null>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  defaultNombre?: string;
}

export function CarpetaSelector({
  empleadoId,
  value,
  onChange,
  onNuevaCarpeta,
  label = 'Carpeta de destino',
  placeholder = 'Seleccionar carpeta',
  disabled = false,
  defaultNombre,
}: CarpetaSelectorProps) {
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [nombreNuevaCarpeta, setNombreNuevaCarpeta] = useState('');

  const cargarCarpetas = useCallback(async () => {
    if (!empleadoId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/carpetas?empleadoId=${empleadoId}`);
      const data = await parseJson<CarpetasResponse>(response).catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Error al cargar carpetas');
      }
      setCarpetas(data?.carpetas || []);
    } catch (error) {
      console.error('Error cargando carpetas:', error);
    } finally {
      setLoading(false);
    }
  }, [empleadoId]);

  useEffect(() => {
    if (empleadoId) {
      cargarCarpetas();
    }
  }, [empleadoId, cargarCarpetas]);

  useEffect(() => {
    if (!value && defaultNombre) {
      const encontrada = carpetas.find(
        (carpeta) =>
          carpeta.nombre.toLowerCase() === defaultNombre.toLowerCase()
      );
      if (encontrada) {
        onChange(encontrada.id);
      }
    }
  }, [value, defaultNombre, carpetas, onChange]);

  const handleCrearCarpeta = async () => {
    if (!nombreNuevaCarpeta.trim() || !onNuevaCarpeta) return;

    const nuevaCarpetaId = await onNuevaCarpeta(nombreNuevaCarpeta);
    if (nuevaCarpetaId) {
      // Recargar carpetas
      await cargarCarpetas();
      onChange(nuevaCarpetaId);
      setNombreNuevaCarpeta('');
      setCreandoCarpeta(false);
    }
  };

  if (creandoCarpeta && onNuevaCarpeta) {
    return (
      <div className="space-y-2">
        <Label>Crear nueva carpeta</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Nombre de la carpeta"
            value={nombreNuevaCarpeta}
            onChange={(e) => setNombreNuevaCarpeta(e.target.value)}
            disabled={disabled}
          />
          <Button onClick={handleCrearCarpeta} disabled={disabled}>
            Crear
          </Button>
          <Button variant="outline" onClick={() => setCreandoCarpeta(false)} disabled={disabled}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select value={value || undefined} onValueChange={onChange} disabled={loading || disabled}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? 'Cargando...' : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {carpetas.map((carpeta) => (
              <SelectItem key={carpeta.id} value={carpeta.id}>
                {carpeta.nombre} {carpeta.esSistema && '(Sistema)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onNuevaCarpeta && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCreandoCarpeta(true)}
            disabled={loading || disabled}
            title="Crear nueva carpeta"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}


