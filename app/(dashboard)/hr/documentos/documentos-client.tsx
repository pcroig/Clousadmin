// ========================================
// Documentos Client Component - HR View
// ========================================

'use client';

import { FileSignature, FileText, Folder, FolderPlus, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { PageLayout } from '@/components/layout/page-layout';
import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { FirmasDetails } from '@/components/firma/firmas-details';
import { DetailsPanel } from '@/components/shared/details-panel';
import { CrearCarpetaConDocumentosModal } from '@/components/hr/crear-carpeta-con-documentos-modal';
import { PlantillasList } from '@/components/hr/plantillas-list';
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
  plantillasEnabled: boolean;
}

export function DocumentosClient({ carpetas, plantillasEnabled }: DocumentosClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'documentos' | 'plantillas'>('documentos');
  const [modalCrearCarpeta, setModalCrearCarpeta] = useState(false);
  const [modalSubirPlantilla, setModalSubirPlantilla] = useState(false);
  const [firmasDetailsOpen, setFirmasDetailsOpen] = useState(false);
  const showPlantillasSection = plantillasEnabled;

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

  const handleTabChange = useCallback(
    (value: string) => {
      const nextValue: 'documentos' | 'plantillas' = value === 'plantillas' ? 'plantillas' : 'documentos';
      if (nextValue === 'plantillas' && !plantillasEnabled) {
        return;
      }
      setActiveTab(nextValue);
    },
    [plantillasEnabled]
  );

  const documentosSubtitle = `${carpetas.length} ${carpetas.length === 1 ? 'carpeta' : 'carpetas'}`;
  const desktopDescription =
    !showPlantillasSection || activeTab === 'documentos'
      ? 'Gestiona documentos y carpetas de la empresa'
      : 'Gestiona plantillas de documentos con variables';

  const desktopHeader = (
    <div className="mb-6 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-600 mt-1">{desktopDescription}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Botón de Firmas */}
          <Button variant="outline" onClick={() => setFirmasDetailsOpen(true)}>
            <FileSignature className="w-4 h-4 mr-2" />
            Firmas
          </Button>

          {activeTab === 'documentos' || !showPlantillasSection ? (
            <Button variant="outline" onClick={() => setModalCrearCarpeta(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Crear Carpeta
            </Button>
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
      <PageLayout>
        {isMobile ? (
          <>
            <PageMobileHeader
              title="Documentos"
              subtitle={
                !showPlantillasSection || activeTab === 'documentos'
                  ? documentosSubtitle
                  : 'Plantillas de documentos'
              }
              actionsNode={
                <div className="flex items-center gap-1">
                  {/* Botón de Firmas */}
                  <button
                    onClick={() => setFirmasDetailsOpen(true)}
                    className="p-2 hover:bg-gray-100 rounded-md transition"
                    aria-label="Firmas"
                  >
                    <FileSignature className="h-5 w-5 text-gray-700" />
                  </button>

                  {/* Botones según el tab activo */}
                  {activeTab === 'documentos' || !showPlantillasSection ? (
                    <Button
                      onClick={() => setModalCrearCarpeta(true)}
                      size="sm"
                      className={cn(MOBILE_DESIGN.button.secondary)}
                    >
                      <FolderPlus className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
                      Crear
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setModalSubirPlantilla(true)}
                      size="sm"
                      className={cn(MOBILE_DESIGN.button.secondary)}
                    >
                      <Upload className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
                      Subir
                    </Button>
                  )}
                </div>
              }
            />

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="flex-1 flex flex-col min-h-0"
            >
              <div>
                <TabsList
                  className={cn(
                    'mb-3 grid w-full gap-2',
                    showPlantillasSection ? 'grid-cols-2' : 'grid-cols-1'
                  )}
                >
                  <TabsTrigger
                    value="documentos"
                    className={cn(
                      MOBILE_DESIGN.text.bodyMedium,
                      'data-[state=active]:bg-white'
                    )}
                  >
                    <Folder className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
                    Documentos
                  </TabsTrigger>
                  {showPlantillasSection && (
                    <TabsTrigger
                      value="plantillas"
                      className={cn(
                        MOBILE_DESIGN.text.bodyMedium,
                        'data-[state=active]:bg-white'
                      )}
                    >
                      <FileText className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
                      Plantillas
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="documentos" className="flex-1 flex flex-col min-h-0 mt-0">
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
              </TabsContent>

              {showPlantillasSection && (
                <TabsContent
                  value="plantillas"
                  className="flex-1 min-h-0 mt-0 overflow-auto"
                >
                  <PlantillasList />
                </TabsContent>
              )}
            </Tabs>
          </>
        ) : (
          <>
            {desktopHeader}

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="mb-6 flex-shrink-0 w-fit">
                <TabsTrigger value="documentos">
                  <Folder className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
                  Documentos
                </TabsTrigger>
                {showPlantillasSection && (
                  <TabsTrigger value="plantillas">
                    <FileText className={cn(MOBILE_DESIGN.components.icon.small, 'mr-2')} />
                    Plantillas
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="documentos" className="flex-1 flex flex-col min-h-0 mt-0">
                <div className="flex-1 min-h-0 overflow-y-auto pb-6">
                  <div>
                    <p className="text-sm text-gray-700 font-medium mb-4">
                      {carpetas.length} {carpetas.length === 1 ? 'carpeta' : 'carpetas'}
                    </p>
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
                </div>
              </TabsContent>

              {showPlantillasSection && (
                <TabsContent
                  value="plantillas"
                  className="flex-1 min-h-0 mt-0"
                >
                  <PlantillasList />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </PageLayout>
      {/* Modal Crear Carpeta con Documentos */}
      <CrearCarpetaConDocumentosModal
        open={modalCrearCarpeta}
        onClose={() => setModalCrearCarpeta(false)}
        onSuccess={(_carpetaId) => {
          // Ya no se necesita router.refresh(), se revalida automáticamente
        }}
      />

      {/* Modal Subir Plantilla */}
      {showPlantillasSection && (
        <SubirPlantillaModal
          open={modalSubirPlantilla}
          onOpenChange={setModalSubirPlantilla}
          onSuccess={() => {
            // Ya no se necesita router.refresh(), se revalida automáticamente
          }}
        />
      )}

      {/* Panel de Firmas */}
      <DetailsPanel
        isOpen={firmasDetailsOpen}
        onClose={() => setFirmasDetailsOpen(false)}
        title="Firmas"
      >
        <FirmasDetails
          isHRView={true}
          onClose={() => setFirmasDetailsOpen(false)}
        />
      </DetailsPanel>
    </>
  );
}
