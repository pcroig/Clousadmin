'use client';

// ========================================
// Carpeta Selector Component
// ========================================
// Selector reutilizable para elegir carpeta o crear una nueva

import { useEffect, useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FolderPlus } from 'lucide-react';

interface Carpeta {
  id: string;
  nombre: string;
  esSistema: boolean;
}

interface CarpetaSelectorProps {
  empleadoId?: string;
  value: string | null;
  onChange: (carpetaId: string | null) => void;
  onNuevaCarpeta?: (nombre: string) => Promise<string | null>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CarpetaSelector({
  empleadoId,
  value,
  onChange,
  onNuevaCarpeta,
  label = 'Carpeta de destino',
  placeholder = 'Seleccionar carpeta',
  disabled = false,
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
      if (response.ok) {
        const data = await response.json();
        setCarpetas(data.carpetas || []);
      }
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


