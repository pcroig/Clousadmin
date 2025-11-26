'use client';

// ========================================
// Invitar HR Admins Component - Onboarding
// ========================================

import { Check, Copy, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { invitarHRAdminAction } from '@/app/(auth)/signup/actions';
import { Button } from '@/components/ui/button';
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

interface Invitacion {
  email: string;
  nombre: string;
  url: string;
}

interface EmpleadoCandidato {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  rol?: string;
}

interface ApiEmpleado {
  id: string;
  nombre?: string | null;
  apellidos?: string | null;
  email?: string | null;
  usuario?: {
    rol?: string | null;
  } | null;
}

interface EmpleadosResponse {
  data?: ApiEmpleado[];
}

export function InvitarHRAdmins() {
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [empleados, setEmpleados] = useState<EmpleadoCandidato[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);

  useEffect(() => {
    const loadEmpleados = async () => {
      setCargandoEmpleados(true);
      try {
        const response = await fetch('/api/empleados?limit=100&activos=true');
        if (!response.ok) {
          throw new Error('No se pudieron cargar los empleados');
        }
        const data = await parseJson<EmpleadosResponse>(response);
        const lista: ApiEmpleado[] = Array.isArray(data?.data) ? data.data : [];
        const candidatos = lista.filter((emp) => emp?.usuario?.rol !== 'hr_admin');
        setEmpleados(
          candidatos.map((emp) => ({
            id: emp.id,
            nombre: emp?.nombre ?? '',
            apellidos: emp?.apellidos ?? '',
            email: emp?.email ?? '',
            rol: emp?.usuario?.rol ?? undefined,
          }))
        );
      } catch (err) {
        console.warn('[InvitarHRAdmins] Error cargando empleados', err);
      } finally {
        setCargandoEmpleados(false);
      }
    };

    loadEmpleados();
  }, []);

  const handleSelectEmpleado = (value: string) => {
    setEmpleadoSeleccionado(value);
    setError('');

    if (!value) {
      setNombre('');
      setApellidos('');
      setEmail('');
      return;
    }

    const empleado = empleados.find((emp) => emp.id === value);
    if (empleado) {
      setNombre(empleado.nombre);
      setApellidos(empleado.apellidos);
      setEmail(empleado.email);
    }
  };

  const inputsDisabled = Boolean(empleadoSeleccionado);

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await invitarHRAdminAction({
        email,
        nombre,
        apellidos,
        empleadoId: empleadoSeleccionado || undefined,
      });

      if (result.success && result.invitacionUrl) {
        setInvitaciones([
          ...invitaciones,
          {
            email,
            nombre: `${nombre} ${apellidos}`,
            url: result.invitacionUrl,
          },
        ]);
        setNombre('');
        setApellidos('');
        setEmail('');
        setEmpleadoSeleccionado('');
      } else {
        setError(result.error || 'Error al enviar la invitación');
      }
    } catch (err) {
      setError('Error al enviar la invitación');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarUrl = (index: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Formulario para invitar */}
      <form onSubmit={handleInvitar} className="space-y-4">
        <div className="space-y-2">
          <Label>Selecciona un empleado existente (opcional)</Label>
          <Select
            value={empleadoSeleccionado || 'manual'}
            onValueChange={(val) => handleSelectEmpleado(val === 'manual' ? '' : val)}
            disabled={cargandoEmpleados || empleados.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Introduce los datos manualmente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Introduce los datos manualmente</SelectItem>
              {empleados.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.nombre} {emp.apellidos} ({emp.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Usa los empleados importados para promoverlos a administradores sin volver a rellenar sus
            datos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              placeholder="Juan"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={inputsDisabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apellidos">Apellidos</Label>
            <Input
              id="apellidos"
              placeholder="García"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              required
              disabled={inputsDisabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="juan.garcia@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={inputsDisabled}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? 'Enviando invitación...' : 'Enviar invitación'}
        </Button>
      </form>

      {/* Lista de invitaciones enviadas */}
      {invitaciones.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Invitaciones enviadas:
          </h4>
          <div className="space-y-2">
            {invitaciones.map((invitacion, index) => (
              <div
                key={index}
                className="rounded-lg border p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{invitacion.nombre}</p>
                    <p className="text-xs text-gray-500">{invitacion.email}</p>
                  </div>
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    value={invitacion.url}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopiarUrl(index, invitacion.url)}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-xs text-gray-500">
                  Envía este enlace al nuevo administrador para que complete su registro
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {invitaciones.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <UserPlus className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            No hay invitaciones enviadas. Puedes omitir este paso si eres el único administrador.
          </p>
        </div>
      )}
    </div>
  );
}











