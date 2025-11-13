// ========================================
// Documentos Client Component - HR View
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Upload, FolderPlus, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { CrearCarpetaConDocumentosModal } from '@/components/hr/crear-carpeta-con-documentos-modal';
import { GenerarDesdePlantillaModal } from '@/components/hr/generar-desde-plantilla-modal';

interface Carpeta {
  id: string;
  nombre: string;
  esSistema: boolean;
  numeroDocumentos: number;
  numeroSubcarpetas: number;
}

interface DocumentosClientProps {
  carpetas: Carpeta[];
}

export function DocumentosClient({ carpetas }: DocumentosClientProps) {
  const router = useRouter();
  const [modalCrearCarpeta, setModalCrearCarpeta] = useState(false);
  const [modalGenerarPlantilla, setModalGenerarPlantilla] = useState(false);

  const handleAbrirCarpeta = (carpetaId: string) => {
    router.push(`/hr/documentos/${carpetaId}`);
  };

  return (
    <>
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona documentos y carpetas de la empresa
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setModalCrearCarpeta(true)}
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Crear Carpeta
              </Button>
              <Button
                variant="outline"
                onClick={() => setModalGenerarPlantilla(true)}
              >
                <FileType className="w-4 h-4 mr-2" />
                Generar desde Plantilla
              </Button>
              <Button
                variant="default"
                onClick={() => router.push('/hr/documentos/subir')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Documentos
              </Button>
            </div>
          </div>
        </div>

        {/* Contador de carpetas */}
        <div className="mb-6 flex-shrink-0">
          <p className="text-sm text-gray-700 font-medium">
            {carpetas.length} {carpetas.length === 1 ? 'carpeta' : 'carpetas'}
          </p>
        </div>

        {/* Grid de carpetas */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-6">
            {carpetas.map((carpeta) => (
              <div
                key={carpeta.id}
                className="group cursor-pointer"
                onClick={() => handleAbrirCarpeta(carpeta.id)}
              >
                {/* Contenedor con fondo suave */}
                <div className="bg-gray-50/50 rounded-3xl p-6 group-hover:bg-gray-100/50 transition-all duration-200 border border-gray-200">
                  <div className="flex flex-col items-center space-y-3">
                    {/* Círculo con icono de carpeta */}
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-200 shadow-sm">
                      <Folder className="w-14 h-14 text-gray-600 group-hover:text-gray-700 transition-colors" strokeWidth={1.5} />
                    </div>

                    {/* Nombre de la carpeta */}
                    <div className="text-center w-full">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        {carpeta.nombre}
                      </p>

                      {/* Info adicional */}
                      <div className="flex flex-col items-center gap-0.5">
                        {carpeta.esSistema && (
                          <span className="text-xs text-gray-500 font-medium">Sistema</span>
                        )}
                        {carpeta.numeroDocumentos > 0 && (
                          <p className="text-xs text-gray-500">
                            {carpeta.numeroDocumentos} doc{carpeta.numeroDocumentos !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Mensaje si no hay carpetas */}
            {carpetas.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  layout="card"
                  icon={Folder}
                  title="No hay carpetas creadas"
                  description="Crea tu primera carpeta para organizar los documentos de la empresa"
                  action={
                    <Button onClick={() => setModalCrearCarpeta(true)}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Crear Carpeta
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Crear Carpeta con Documentos */}
      <CrearCarpetaConDocumentosModal
        open={modalCrearCarpeta}
        onClose={() => setModalCrearCarpeta(false)}
        onSuccess={(carpetaId) => {
          // Recargar página para mostrar nueva carpeta
          router.refresh();
        }}
      />

      {/* Modal Generar desde Plantilla */}
      <GenerarDesdePlantillaModal
        open={modalGenerarPlantilla}
        onOpenChange={setModalGenerarPlantilla}
        onSuccess={() => {
          // Recargar página para mostrar nuevos documentos
          router.refresh();
        }}
      />
    </>
  );
}
