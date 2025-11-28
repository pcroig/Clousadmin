// ========================================
// Documentos Client Component - HR View
// ========================================

'use client';

import { FileText, Folder, FolderPlus, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { MobilePageHeader } from '@/components/adaptive/MobilePageHeader';
import { ResponsiveContainer } from '@/components/adaptive/ResponsiveContainer';
import { CrearCarpetaConDocumentosModal } from '@/components/hr/crear-carpeta-con-documentos-modal';
import { PlantillasList } from '@/components/hr/plantillas-list';
import { SubirDocumentosModal } from '@/components/hr/subir-documentos-modal';
import { SubirPlantillaModal } from '@/components/hr/subir-plantilla-modal';
import { type CarpetaCardData, CarpetasGrid } from '@/components/shared/carpetas-grid';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MOBILE_DESIGN } from '@/lib/constants/mobile-design';
import { useIsMobile } from '@/lib/hooks/use-viewport';
import { cn } from '@/lib/utils';

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
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('documentos');
  const [modalCrearCarpeta, setModalCrearCarpeta] = useState(false);
  const [modalSubirPlantilla, setModalSubirPlantilla] = useState(false);
  const [modalSubirDocumentos, setModalSubirDocumentos] = useState(false);

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

  const desktopHeader = (
    <div className="mb-6 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-600 mt-1">
            {activeTab === 'documentos'
              ? 'Gestiona documentos y carpetas de la empresa'
              : 'Gestiona plantillas de documentos con variables'}
          </p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'documentos' ? (
            <>
              <Button variant="outline" onClick={() => setModalCrearCarpeta(true)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Crear Carpeta
              </Button>
              <Button variant="default" onClick={() => setModalSubirDocumentos(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Subir Documentos
              </Button>
            </>
          ) : (
            <Button variant="default" onClick={() => setModalSubirPlantilla(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Subir Plantilla
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ResponsiveContainer variant="page" className="h-full w-full flex flex-col overflow-hidden">
        {isMobile ? (
          <MobilePageHeader
            title="Documentos"
            subtitle={
              activeTab === 'documentos'
                ? `${carpetas.length} ${carpetas.length === 1 ? 'carpeta' : 'carpetas'}`
                : 'Plantillas de documentos'
            }
            actions={
              activeTab === 'documentos' ? (
                <div className="flex gap-2">
                <Button
                  onClick={() => setModalCrearCarpeta(true)}
                  size="sm"
                  className={cn(MOBILE_DESIGN.button.secondary)}
                >
                  <FolderPlus className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
                  Crear
                </Button>
                  <Button
                    onClick={() => setModalSubirDocumentos(true)}
                    size="sm"
                    className={cn(MOBILE_DESIGN.button.primary)}
                  >
                    <Upload className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
                    Subir
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setModalSubirPlantilla(true)}
                  size="sm"
                  className={cn(MOBILE_DESIGN.button.secondary)}
                >
                  <Upload className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
                  Subir
                </Button>
              )
            }
          />
        ) : (
          desktopHeader
        )}

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList
            className={cn(
              isMobile
                ? 'mb-3 grid w-full grid-cols-2 gap-2'
                : 'mb-6 flex-shrink-0 w-fit'
            )}
          >
            <TabsTrigger
              value="documentos"
              className={cn(
                isMobile && MOBILE_DESIGN.text.bodyMedium,
                isMobile && 'data-[state=active]:bg-white'
              )}
            >
              <Folder className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
              Documentos
            </TabsTrigger>
            <TabsTrigger
              value="plantillas"
              className={cn(
                isMobile && MOBILE_DESIGN.text.bodyMedium,
                isMobile && 'data-[state=active]:bg-white'
              )}
            >
              <FileText className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
              Plantillas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documentos" className="flex-1 flex flex-col min-h-0 mt-0">
            {isMobile ? (
              <div className="flex-1 min-h-0 overflow-auto pb-4">
                {carpetas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
                    <Folder className="mb-3 h-12 w-12 text-gray-300" strokeWidth={1.5} />
                    <p className={cn(MOBILE_DESIGN.text.bodyMedium, 'font-medium text-gray-700')}>
                      No hay carpetas creadas
                    </p>
                    <p className={cn(MOBILE_DESIGN.text.caption, 'mt-1')}>
                      Crea tu primera carpeta para organizar documentos
                    </p>
                    <Button
                      onClick={() => setModalCrearCarpeta(true)}
                      className={cn(MOBILE_DESIGN.button.primary, 'mt-4')}
                    >
                      <FolderPlus className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
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
            ) : (
              <>
                <div className="mb-6 flex-shrink-0">
                  <p className="text-sm text-gray-700 font-medium">
                    {carpetas.length} {carpetas.length === 1 ? 'carpeta' : 'carpetas'}
                  </p>
                </div>
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
              </>
            )}
          </TabsContent>

          <TabsContent
            value="plantillas"
            className={cn('flex-1 min-h-0 mt-0', isMobile && 'overflow-auto')}
          >
            <PlantillasList />
          </TabsContent>
        </Tabs>
      </ResponsiveContainer>
      {/* Modal Crear Carpeta con Documentos */}
      <CrearCarpetaConDocumentosModal
        open={modalCrearCarpeta}
        onClose={() => setModalCrearCarpeta(false)}
        onSuccess={(_carpetaId) => {
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

      <SubirDocumentosModal
        open={modalSubirDocumentos}
        onOpenChange={setModalSubirDocumentos}
        onUploaded={() => {
          router.refresh();
        }}
      />
    </>
  );
}
