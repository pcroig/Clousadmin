// ========================================
// Documentos Client Component - HR View
// ========================================

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Upload, FolderPlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CrearCarpetaConDocumentosModal } from '@/components/hr/crear-carpeta-con-documentos-modal';
import { SubirPlantillaModal } from '@/components/hr/subir-plantilla-modal';
import { PlantillasList } from '@/components/hr/plantillas-list';
import { CarpetasGrid, type CarpetaCardData } from '@/components/shared/carpetas-grid';

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
  const [activeTab, setActiveTab] = useState('documentos');
  const [modalCrearCarpeta, setModalCrearCarpeta] = useState(false);
  const [modalSubirPlantilla, setModalSubirPlantilla] = useState(false);

  const handleAbrirCarpeta = useCallback(
    (carpetaId: string) => {
      router.push(`/hr/documentos/${carpetaId}`);
    },
    [router]
  );

  // Convertir carpetas a formato compatible
  const carpetasFormateadas = carpetas.map<CarpetaCardData>((c) => ({
    id: c.id,
    nombre: c.nombre,
    esSistema: c.esSistema,
    numeroDocumentos: c.numeroDocumentos,
  }));

  return (
    <>
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
              <p className="text-sm text-gray-600 mt-1">
                {activeTab === 'documentos' 
                  ? 'Gestiona documentos y carpetas de la empresa'
                  : 'Gestiona plantillas de documentos con variables'
                }
              </p>
            </div>
            <div className="flex gap-3">
              {activeTab === 'documentos' ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setModalCrearCarpeta(true)}
                  >
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Crear Carpeta
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => router.push('/hr/documentos/subir')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Documentos
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  onClick={() => setModalSubirPlantilla(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Plantilla
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mb-6 flex-shrink-0 w-fit">
            <TabsTrigger value="documentos">
              <Folder className="w-4 h-4 mr-2" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="plantillas">
              <FileText className="w-4 h-4 mr-2" />
              Plantillas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documentos" className="flex-1 flex flex-col min-h-0 mt-0">
            {/* Contador de carpetas */}
            <div className="mb-6 flex-shrink-0">
              <p className="text-sm text-gray-700 font-medium">
                {carpetas.length} {carpetas.length === 1 ? 'carpeta' : 'carpetas'}
              </p>
            </div>

            {/* Grid de carpetas */}
            <div className="flex-1 min-h-0 overflow-y-auto pb-6">
              {carpetas.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-12 text-center">
                  <Folder className="mb-3 h-12 w-12 text-gray-300" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-gray-700">No hay carpetas creadas</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Crea tu primera carpeta para organizar los documentos de la empresa
                  </p>
                  <Button onClick={() => setModalCrearCarpeta(true)} className="mt-4">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Crear Carpeta
                  </Button>
                </div>
              ) : (
                <CarpetasGrid
                  carpetas={carpetasFormateadas}
                  onCarpetaClick={handleAbrirCarpeta}
                  emptyStateTitle="No hay carpetas creadas"
                  emptyStateDescription="Crea tu primera carpeta para organizar los documentos de la empresa"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="plantillas" className="flex-1 min-h-0 mt-0">
            <PlantillasList />
          </TabsContent>
        </Tabs>
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

      {/* Modal Subir Plantilla */}
      <SubirPlantillaModal
        open={modalSubirPlantilla}
        onOpenChange={setModalSubirPlantilla}
        onSuccess={() => {
          // Recargar página para mostrar nueva plantilla
          router.refresh();
        }}
      />
    </>
  );
}
