'use client';

// ========================================
// Plantillas List Component - Lista de plantillas con filtros
// ========================================

import { FileText, FileType, Filter, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'oficial' | 'personalizada';
  formato: 'docx' | 'pdf_rellenable';
  categoria: string | null;
  esOficial: boolean;
  activa: boolean;
  variablesUsadas: string[];
  requiereFirma: boolean;
  carpetaDestinoDefault: string | null;
  totalDocumentosGenerados?: number;
  createdAt: string;
}

interface PlantillasResponse {
  success?: boolean;
  plantillas?: Plantilla[];
}

export function PlantillasList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todas');
  const [filtroFormato, setFiltroFormato] = useState<string>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');

  useEffect(() => {
    cargarPlantillas();
  }, []);

  const cargarPlantillas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plantillas');
      const data = await parseJson<PlantillasResponse>(res);

      if (data.success) {
        setPlantillas(data.plantillas || []);
      }
    } catch (error) {
      console.error('[PlantillasList] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar plantillas
  const plantillasFiltradas = plantillas.filter((p) => {
    // Filtro de búsqueda
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) {
      return false;
    }

    // Filtro de tipo
    if (filtroTipo !== 'todas') {
      if (filtroTipo === 'oficial' && !p.esOficial) return false;
      if (filtroTipo === 'personalizada' && p.esOficial) return false;
    }

    // Filtro de formato
    if (filtroFormato !== 'todos' && p.formato !== filtroFormato) {
      return false;
    }

    // Filtro de categoría
    if (filtroCategoria !== 'todas' && p.categoria !== filtroCategoria) {
      return false;
    }

    return true;
  });

  // Obtener categorías únicas
  const categorias = Array.from(new Set(plantillas.map((p) => p.categoria).filter(Boolean)));

  const handleClickPlantilla = (plantillaId: string) => {
    router.push(`/hr/documentos/plantillas/${plantillaId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Filtros y búsqueda */}
      <div className="mb-6 flex-shrink-0 space-y-4">
        {/* Barra de búsqueda */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar plantillas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 items-center flex-wrap">
          <Filter className="h-4 w-4 text-gray-500" />
          
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="oficial">Oficiales</SelectItem>
              <SelectItem value="personalizada">Personalizadas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroFormato} onValueChange={setFiltroFormato}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Formato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="docx">DOCX</SelectItem>
              <SelectItem value="pdf_rellenable">PDF Rellenable</SelectItem>
            </SelectContent>
          </Select>

          {categorias.length > 0 && (
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat!}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(busqueda || filtroTipo !== 'todas' || filtroFormato !== 'todos' || filtroCategoria !== 'todas') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBusqueda('');
                setFiltroTipo('todas');
                setFiltroFormato('todos');
                setFiltroCategoria('todas');
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Contador */}
        <p className="text-sm text-gray-700 font-medium">
          {plantillasFiltradas.length} {plantillasFiltradas.length === 1 ? 'plantilla' : 'plantillas'}
        </p>
      </div>

      {/* Lista de plantillas */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {plantillasFiltradas.length === 0 ? (
          <EmptyState
            layout="card"
            icon={FileText}
            title={busqueda || filtroTipo !== 'todas' || filtroFormato !== 'todos' ? 'No se encontraron plantillas' : 'No hay plantillas creadas'}
            description={busqueda || filtroTipo !== 'todas' || filtroFormato !== 'todos' ? 'Intenta ajustar los filtros de búsqueda' : 'Crea tu primera plantilla para empezar a generar documentos'}
          />
        ) : (
          <div className="space-y-3 pb-6">
            {plantillasFiltradas.map((plantilla) => (
              <div
                key={plantilla.id}
                className="border rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer bg-white"
                onClick={() => handleClickPlantilla(plantilla.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Icono y contenido */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FileType className="w-6 h-6 text-gray-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Título y badges */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900">
                          {plantilla.nombre}
                        </h3>

                        {/* Badges */}
                        {plantilla.esOficial && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Oficial
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {plantilla.formato === 'docx' ? 'DOCX' : 'PDF'}
                        </span>
                        {plantilla.categoria && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            {plantilla.categoria}
                          </span>
                        )}
                        {plantilla.requiereFirma && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            Requiere firma
                          </span>
                        )}
                        {!plantilla.activa && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            Inactiva
                          </span>
                        )}
                      </div>

                      {/* Descripción */}
                      {plantilla.descripcion && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {plantilla.descripcion}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{plantilla.variablesUsadas.length} variables</span>
                        {plantilla.totalDocumentosGenerados !== undefined && (
                          <span>{plantilla.totalDocumentosGenerados} docs generados</span>
                        )}
                        {plantilla.carpetaDestinoDefault && (
                          <span>Carpeta: {plantilla.carpetaDestinoDefault}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

