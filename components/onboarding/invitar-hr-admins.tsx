'use client';

// ========================================
// Invitar HR Admins Component - Onboarding
// ========================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Check, Copy } from 'lucide-react';
import { invitarHRAdminAction } from '@/app/(dashboard)/onboarding/cargar-datos/actions';

interface Invitacion {
  email: string;
  nombre: string;
  url: string;
}

export function InvitarHRAdmins() {
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await invitarHRAdminAction(email, nombre, apellidos);

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
      <div>
        <h3 className="text-lg font-medium">Invitar administradores de RRHH</h3>
        <p className="text-sm text-gray-500">
          Invita a otros miembros del equipo de RRHH para que tengan acceso administrativo.
        </p>
      </div>

      {/* Formulario para invitar */}
      <form onSubmit={handleInvitar} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              placeholder="Juan"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
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

      <div className="rounded-lg bg-yellow-50 p-4">
        <p className="text-sm text-yellow-700">
          ⚠️ <strong>Nota:</strong> Los administradores de RRHH tendrán acceso completo a todos los datos de la empresa y empleados.
        </p>
      </div>
    </div>
  );
}




