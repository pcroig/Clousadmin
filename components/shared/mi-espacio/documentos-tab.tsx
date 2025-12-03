'use client';

import { FileText, Folder } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type CarpetaCardData, CarpetasGrid } from '@/components/shared/carpetas-grid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { MiEspacioCarpeta, MiEspacioEmpleado } from '@/types/empleado';

interface DocumentosTabProps {
  empleado: MiEspacioEmpleado;
}

type DocumentosTabKey = 'personales' | 'compartidos';

export function DocumentosTab({ empleado }: DocumentosTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const initialTab = useMemo<DocumentosTabKey>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'compartidos') {
      return tabParam;
    }
    return 'personales';
  }, [searchParams]);

  const [activeDocTab, setActiveDocTab] = useState<DocumentosTabKey>(initialTab);

  useEffect(() => {
    setActiveDocTab(initialTab);
  }, [initialTab]);

  const handleChangeTab = useCallback(
    (tab: DocumentosTabKey) => {
      setActiveDocTab(tab);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', tab);
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [searchParams, pathname, router]
  );

  // Memoizar carpetas filtradas
  const { carpetasPersonales, carpetasCompartidas } = useMemo(() => {
    const carpetas: MiEspacioCarpeta[] = empleado.carpetas ?? [];
    return {
      carpetasPersonales: carpetas.filter((c) => !c.compartida),
      carpetasCompartidas: carpetas.filter((c) => c.compartida),
    };
  }, [empleado.carpetas]);

  // Convertir a formato compatible con CarpetaCardData
  const carpetasVisibles = useMemo<CarpetaCardData[]>(() => {
    const carpetas = activeDocTab === 'personales' ? carpetasPersonales : carpetasCompartidas;
    return carpetas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      esSistema: c.esSistema,
      compartida: c.compartida,
      documentos: c.documentos,
    }));
  }, [activeDocTab, carpetasPersonales, carpetasCompartidas]);

  const handleCarpetaClick = useCallback(
    (carpetaId: string) => {
      // Navegar a la carpeta según el contexto
      const basePath = pathname?.includes('/hr/') ? '/hr' : '/empleado/mi-espacio';
      router.push(`${basePath}/documentos/${carpetaId}`);
    },
    [pathname, router]
  );

  const emptyStateConfig = useMemo(() => {
    if (activeDocTab === 'personales') {
      return {
        title: 'No hay carpetas personales',
        description: 'Empieza subiendo documentos desde el escritorio principal',
      };
    }
    return {
      title: 'No hay carpetas compartidas',
      description: 'Las carpetas compartidas aparecerán aquí',
    };
  }, [activeDocTab]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs
        value={activeDocTab}
        onValueChange={(value) => handleChangeTab(value as DocumentosTabKey)}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="mb-3">
          {/* Mobile: Full width con iconos | Desktop: Solo ancho del contenido sin iconos */}
          <TabsList className="grid w-full grid-cols-2 gap-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="personales" className="text-sm">
              <Folder className="h-4 w-4 mr-2 sm:hidden" />
              Personales
            </TabsTrigger>
            <TabsTrigger value="compartidos" className="text-sm">
              <FileText className="h-4 w-4 mr-2 sm:hidden" />
              Compartidos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="personales" className="flex-1 min-h-0 mt-0">
          <div className="space-y-4">
          <p className="text-sm font-medium text-gray-600">
            {`${carpetasPersonales.length} ${carpetasPersonales.length === 1 ? 'carpeta personal' : 'carpetas personales'}`}
          </p>
          <CarpetasGrid
            carpetas={carpetasVisibles}
            onCarpetaClick={handleCarpetaClick}
            emptyStateTitle={emptyStateConfig.title}
            emptyStateDescription={emptyStateConfig.description}
          />
        </div>
      </TabsContent>

      <TabsContent value="compartidos" className="flex-1 min-h-0 mt-0">
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-600">
            {`${carpetasCompartidas.length} ${carpetasCompartidas.length === 1 ? 'carpeta compartida' : 'carpetas compartidas'}`}
          </p>
          <CarpetasGrid
            carpetas={carpetasVisibles}
            onCarpetaClick={handleCarpetaClick}
            emptyStateTitle={emptyStateConfig.title}
            emptyStateDescription={emptyStateConfig.description}
          />
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
}
