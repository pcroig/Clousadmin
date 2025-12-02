'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type CarpetaCardData, CarpetasGrid } from '@/components/shared/carpetas-grid';
import { FirmasCardCompact } from '@/components/firma/firmas-card-compact';

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
      {/* Firmas Card - compacto en mobile */}
      <div className="sm:mt-2">
        <FirmasCardCompact />
      </div>

      {/* Toggle Personales/Compartidos */}
      <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/60 p-1 shadow-sm">
        <button
          onClick={() => handleChangeTab('personales')}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeDocTab === 'personales'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Personales
        </button>
        <button
          onClick={() => handleChangeTab('compartidos')}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeDocTab === 'compartidos'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Compartidos
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-600">
          {activeDocTab === 'personales'
            ? `${carpetasPersonales.length} ${carpetasPersonales.length === 1 ? 'carpeta personal' : 'carpetas personales'}`
            : `${carpetasCompartidas.length} ${carpetasCompartidas.length === 1 ? 'carpeta compartida' : 'carpetas compartidas'}`}
        </p>
        <CarpetasGrid
          carpetas={carpetasVisibles}
          onCarpetaClick={handleCarpetaClick}
          emptyStateTitle={emptyStateConfig.title}
          emptyStateDescription={emptyStateConfig.description}
        />
      </div>
    </div>
  );
}
