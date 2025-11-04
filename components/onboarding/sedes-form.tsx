'use client';

// ========================================
// Sedes Form Component - Onboarding
// ========================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, MapPin } from 'lucide-react';
import { crearSedeAction, eliminarSedeAction } from '@/app/(dashboard)/onboarding/cargar-datos/actions';

interface Sede {
  id: string;
  nombre: string;
  ciudad: string;
}

interface SedesFormProps {
  sedesIniciales?: Sede[];
}

export function SedesForm({ sedesIniciales = [] }: SedesFormProps) {
  const [sedes, setSedes] = useState<Sede[]>(sedesIniciales);
  const [ciudad, setCiudad] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAgregarSede = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await crearSedeAction(ciudad);

      if (result.success && result.sede) {
        setSedes([...sedes, result.sede]);
        setCiudad('');
      } else {
        setError(result.error || 'Error al crear la sede');
      }
    } catch (err) {
      setError('Error al crear la sede');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarSede = async (sedeId: string) => {
    try {
      const result = await eliminarSedeAction(sedeId);

      if (result.success) {
        setSedes(sedes.filter((s) => s.id !== sedeId));
      } else {
        setError(result.error || 'Error al eliminar la sede');
      }
    } catch (err) {
      setError('Error al eliminar la sede');
      console.error('Error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Sedes de la empresa</h3>
        <p className="text-sm text-gray-500">
          Agrega las ubicaciones físicas de tu empresa. Podrás asignar equipos a cada sede.
        </p>
      </div>

      {/* Formulario para agregar sede */}
      <form onSubmit={handleAgregarSede} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ciudad">Ciudad *</Label>
          <Input
            id="ciudad"
            placeholder="Madrid"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? 'Agregando...' : 'Agregar sede'}
        </Button>
      </form>

      {/* Lista de sedes */}
      {sedes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Sedes agregadas:</h4>
          <div className="space-y-2">
            {sedes.map((sede) => (
              <div
                key={sede.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-sm">{sede.nombre}</p>
                    <p className="text-xs text-gray-500">{sede.ciudad}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEliminarSede(sede.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sedes.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <MapPin className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            No hay sedes agregadas. Puedes omitir este paso si solo tienes una ubicación.
          </p>
        </div>
      )}
    </div>
  );
}

