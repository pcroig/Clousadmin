'use client';

import { FileText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


interface CampoFormulario {
  nombre: string;
  tipo?: string;
  origen?: string;
  confianza?: number;
}

interface RellenarDocumentoFormProps {
  documentoGeneradoId: string;
  documentoNombre: string;
  plantillaNombre: string;
  requiereFirma: boolean;
  campos: CampoFormulario[];
  valoresIniciales: Record<string, string>;
  pendienteRellenar: boolean;
}

export function RellenarDocumentoForm({
  documentoGeneradoId,
  documentoNombre,
  plantillaNombre,
  requiereFirma,
  campos,
  valoresIniciales,
  pendienteRellenar,
}: RellenarDocumentoFormProps) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(valoresIniciales);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (campo: string, valor: string) => {
    setValores((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (campos.length === 0) {
      toast.error('Esta plantilla no tiene campos configurados');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/documentos-generados/${documentoGeneradoId}/rellenar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campos: valores }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar el documento');
      }

      toast.success('Documento actualizado correctamente');
      router.push('/empleado/bandeja-entrada');
    } catch (error) {
      console.error('[RellenarDocumentoForm] Error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar el documento'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <FileText className="h-4 w-4" />
          Documento pendiente
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{documentoNombre}</h1>
        <p className="text-sm text-gray-600">
          Plantilla: <span className="font-medium">{plantillaNombre}</span>
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {pendienteRellenar ? (
            <Badge className="bg-amber-100 text-amber-800">Pendiente de completar</Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-800">Campos completados</Badge>
          )}
          {requiereFirma && (
            <Badge variant="outline" className="flex items-center gap-1 text-amber-800 border-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Requiere firma digital
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
        Completa los siguientes campos. Al enviar, generaremos el PDF con tus datos y,
        si aplica, se iniciará automáticamente el proceso de firma digital.
      </div>

      {campos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">
          Esta plantilla aún no tiene campos configurados. Contacta con HR.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {campos.map((campo) => (
              <div key={campo.nombre} className="space-y-2">
                <Label htmlFor={`campo-${campo.nombre}`}>
                  {formatearLabel(campo.nombre)}
                  {campo.origen === 'ia' && (
                    <span className="ml-2 text-xs text-gray-500">(campo sugerido)</span>
                  )}
                </Label>
                <Input
                  id={`campo-${campo.nombre}`}
                  value={valores[campo.nombre] || ''}
                  onChange={(event) => handleChange(campo.nombre, event.target.value)}
                  placeholder="Escribe aquí..."
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/empleado/bandeja-entrada">Cancelar</Link>
            </Button>
            <LoadingButton type="submit" loading={submitting}>
              Guardar y actualizar PDF
            </LoadingButton>
          </div>
        </form>
      )}
    </div>
  );
}

function formatearLabel(nombreCampo: string) {
  return nombreCampo
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

