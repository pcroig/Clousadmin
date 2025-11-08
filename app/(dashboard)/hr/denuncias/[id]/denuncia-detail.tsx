// ========================================
// Denuncia Detail Component
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Calendar, MapPin, ArrowLeft, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DenunciaDetailProps {
  denuncia: {
    id: string;
    descripcion: string;
    fechaIncidente: Date | null;
    ubicacion: string | null;
    estado: string;
    prioridad: string;
    esAnonima: boolean;
    denunciante: {
      id: string;
      nombre: string;
      email: string;
      telefono: string | null;
      avatar: string | null;
    } | null;
    asignadaA: string | null;
    asignadaEn: Date | null;
    resolucion: string | null;
    resueltaEn: Date | null;
    notasInternas: string | null;
    documentos: any;
    createdAt: string;
    updatedAt: string;
  };
  hrAdmins: Array<{ id: string; nombre: string }>;
}

export function DenunciaDetail({ denuncia, hrAdmins }: DenunciaDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    estado: denuncia.estado,
    prioridad: denuncia.prioridad,
    asignadaA: denuncia.asignadaA || '',
    resolucion: denuncia.resolucion || '',
    notasInternas: denuncia.notasInternas || '',
  });

  const estadoLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    en_revision: 'En revisión',
    resuelta: 'Resuelta',
    archivada: 'Archivada',
  };

  const prioridadColors: Record<string, string> = {
    baja: 'bg-blue-100 text-blue-800',
    media: 'bg-yellow-100 text-yellow-800',
    alta: 'bg-orange-100 text-orange-800',
    critica: 'bg-red-100 text-red-800',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/denuncias/${denuncia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: formData.estado,
          prioridad: formData.prioridad,
          asignadaA: formData.asignadaA || null,
          resolucion: formData.resolucion.trim() || undefined,
          notasInternas: formData.notasInternas.trim() || undefined,
        }),
      });

      if (response.ok) {
        toast.success('Denuncia actualizada correctamente');
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al actualizar la denuncia');
      }
    } catch (error) {
      console.error('Error al actualizar denuncia:', error);
      toast.error('Error al actualizar la denuncia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/hr/denuncias')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Detalle de Denuncia</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Recibida el {format(new Date(denuncia.createdAt), 'dd MMMM yyyy - HH:mm', { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descripción */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Descripción</h2>
            <p className="text-sm whitespace-pre-wrap">{denuncia.descripcion}</p>
          </Card>

          {/* Detalles */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Detalles</h2>

            {denuncia.fechaIncidente && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Fecha del incidente:</span>
                <span>{format(new Date(denuncia.fechaIncidente), 'dd MMMM yyyy', { locale: es })}</span>
              </div>
            )}

            {denuncia.ubicacion && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Ubicación/Contexto:</span>
                <span>{denuncia.ubicacion}</span>
              </div>
            )}

            {denuncia.esAnonima && (
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Tipo:</span>
                <Badge variant="outline">Denuncia Anónima</Badge>
              </div>
            )}
          </Card>

          {/* Formulario de actualización */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Gestión</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_revision">En revisión</option>
                    <option value="resuelta">Resuelta</option>
                    <option value="archivada">Archivada</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prioridad">Prioridad</Label>
                  <select
                    id="prioridad"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asignadaA">Asignar a</Label>
                <select
                  id="asignadaA"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.asignadaA}
                  onChange={(e) => setFormData({ ...formData, asignadaA: e.target.value })}
                >
                  <option value="">Sin asignar</option>
                  {hrAdmins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolucion">Resolución</Label>
                <Textarea
                  id="resolucion"
                  placeholder="Describe la resolución de la denuncia..."
                  value={formData.resolucion}
                  onChange={(e) => setFormData({ ...formData, resolucion: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notasInternas">Notas internas (solo HR)</Label>
                <Textarea
                  id="notasInternas"
                  placeholder="Notas privadas para el equipo de HR..."
                  value={formData.notasInternas}
                  onChange={(e) => setFormData({ ...formData, notasInternas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <LoadingButton type="submit" loading={loading}>
                  Guardar cambios
                </LoadingButton>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar - Denunciante */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Denunciante</h2>
            {denuncia.esAnonima ? (
              <div className="text-center py-6">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground italic">
                  Denuncia anónima
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  No se registró la identidad del denunciante
                </p>
              </div>
            ) : denuncia.denunciante ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={denuncia.denunciante.avatar || undefined} />
                    <AvatarFallback>
                      {denuncia.denunciante.nombre.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{denuncia.denunciante.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {denuncia.denunciante.email}
                    </p>
                  </div>
                </div>
                {denuncia.denunciante.telefono && (
                  <div className="text-sm">
                    <span className="font-medium">Teléfono: </span>
                    {denuncia.denunciante.telefono}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin información</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Estado actual</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <div className="mt-1">
                  <Badge className="text-sm">
                    {estadoLabels[denuncia.estado] || denuncia.estado}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Prioridad</Label>
                <div className="mt-1">
                  <Badge className={prioridadColors[denuncia.prioridad]}>
                    {denuncia.prioridad.charAt(0).toUpperCase() + denuncia.prioridad.slice(1)}
                  </Badge>
                </div>
              </div>
              {denuncia.resueltaEn && (
                <div>
                  <Label className="text-xs text-muted-foreground">Resuelta el</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(denuncia.resueltaEn), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
