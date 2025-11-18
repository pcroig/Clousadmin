// ========================================
// Denuncias Details Component - Read-only
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, AlertCircle, ChevronRight, X } from 'lucide-react';
import { getInitials } from '@/components/shared/utils';
import { getAvatarStyle } from '@/lib/design-system';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Denuncia {
  id: string;
  descripcion: string;
  fecha: string;
  esAnonima: boolean;
  createdAt: string;
  denunciante: {
    id: string;
    nombre: string;
    apellidos: string;
    email: string;
    fotoUrl: string | null;
  } | null;
  documentos: Array<{
    id: string;
    nombre: string;
    s3Key: string;
    mimeType: string;
    tamano: number;
  }>;
}

interface DenunciasDetailsProps {
  onClose: () => void;
  initialDenunciaId?: string;
}

export function DenunciasDetails({ onClose, initialDenunciaId }: DenunciasDetailsProps) {
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDenuncia, setSelectedDenuncia] = useState<Denuncia | null>(null);
  const [initialSelectionApplied, setInitialSelectionApplied] = useState(false);

  useEffect(() => {
    fetchDenuncias();
  }, []);

  const fetchDenuncias = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/denuncias');

      if (!response.ok) {
        throw new Error('Error al cargar denuncias');
      }

      const data = await response.json();
      setDenuncias(data);
    } catch (error) {
      console.error('Error fetching denuncias:', error);
      toast.error('Error al cargar las denuncias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      !loading &&
      initialDenunciaId &&
      !initialSelectionApplied &&
      denuncias.length > 0
    ) {
      const target = denuncias.find((denuncia) => denuncia.id === initialDenunciaId);
      if (target) {
        setSelectedDenuncia(target);
        setInitialSelectionApplied(true);
      }
    }
  }, [denuncias, initialDenunciaId, initialSelectionApplied, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">Cargando denuncias...</div>
      </div>
    );
  }

  if (selectedDenuncia) {
    // Vista de detalle individual
    const avatarStyle = selectedDenuncia.denunciante
      ? getAvatarStyle(`${selectedDenuncia.denunciante.nombre} ${selectedDenuncia.denunciante.apellidos}`)
      : null;

    return (
      <div className="space-y-6">
        {/* Header con ID y botones */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            #{selectedDenuncia.id.slice(0, 8).toUpperCase()}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDenuncia(null)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Volver
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Fecha del incidente */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Fecha del incidente
          </h4>
          <p className="text-sm text-gray-900">
            {format(new Date(selectedDenuncia.fecha), "d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>

        {/* Fecha de reporte */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Reportada el
          </h4>
          <p className="text-sm text-gray-900">
            {format(new Date(selectedDenuncia.createdAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
          </p>
        </div>

        {/* Denunciante */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Denunciante
          </h4>
          {selectedDenuncia.esAnonima ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <AlertCircle className="w-4 h-4 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 font-medium">Denuncia Anónima</p>
                <p className="text-xs text-gray-500">El denunciante optó por mantener su identidad oculta</p>
              </div>
            </div>
          ) : selectedDenuncia.denunciante ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <Avatar className="h-9 w-9">
                {selectedDenuncia.denunciante.fotoUrl && (
                  <AvatarImage src={selectedDenuncia.denunciante.fotoUrl} />
                )}
                <AvatarFallback
                  className="text-xs font-semibold uppercase"
                  style={avatarStyle || undefined}
                >
                  {getInitials(`${selectedDenuncia.denunciante.nombre} ${selectedDenuncia.denunciante.apellidos}`)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 font-medium">
                  {selectedDenuncia.denunciante.nombre} {selectedDenuncia.denunciante.apellidos}
                </p>
                <p className="text-xs text-gray-500">{selectedDenuncia.denunciante.email}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Descripción */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Descripción
          </h4>
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {selectedDenuncia.descripcion}
            </p>
          </div>
        </div>

        {/* Documentos */}
        {selectedDenuncia.documentos && selectedDenuncia.documentos.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Documentos ({selectedDenuncia.documentos.length})
            </h4>
            <div className="space-y-2">
              {selectedDenuncia.documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium truncate">{doc.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {(doc.tamano / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista de lista
  const denunciasNuevas = denuncias.length; // Todas son "nuevas" por ahora

  return (
    <div className="space-y-6">
      {/* Header simple */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Canal de Denuncias</h3>
          <p className="text-sm text-gray-500 mt-1">{denunciasNuevas} denuncias nuevas</p>
        </div>
      </div>

      {/* Lista de denuncias */}
      {denuncias.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No hay denuncias registradas
        </p>
      ) : (
        <div className="space-y-2">
          {denuncias.map((denuncia) => {
            const avatarStyle = denuncia.denunciante
              ? getAvatarStyle(`${denuncia.denunciante.nombre} ${denuncia.denunciante.apellidos}`)
              : null;

            return (
              <button
                key={denuncia.id}
                onClick={() => setSelectedDenuncia(denuncia)}
                className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
              >
                {denuncia.esAnonima ? (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-gray-500" />
                  </div>
                ) : denuncia.denunciante ? (
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    {denuncia.denunciante.fotoUrl && (
                      <AvatarImage src={denuncia.denunciante.fotoUrl} />
                    )}
                    <AvatarFallback
                      className="text-xs font-semibold uppercase"
                      style={avatarStyle || undefined}
                    >
                      {getInitials(`${denuncia.denunciante.nombre} ${denuncia.denunciante.apellidos}`)}
                    </AvatarFallback>
                  </Avatar>
                ) : null}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-gray-900 font-medium">
                      {denuncia.esAnonima
                        ? 'Denuncia Anónima'
                        : `${denuncia.denunciante?.nombre} ${denuncia.denunciante?.apellidos}`
                      }
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    {format(new Date(denuncia.createdAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {denuncia.descripcion}
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
