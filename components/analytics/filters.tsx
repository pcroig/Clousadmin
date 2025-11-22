"use client"

import { Building2, Calendar as CalendarIcon, Download, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface FilterValues {
  genero: string
  equipo: string
  antiguedad: string
}

interface AnalyticsFiltersProps {
  filters: FilterValues
  onFilterChange: (key: keyof FilterValues, value: string) => void
  onExport?: () => Promise<void>
  equipos?: Array<{ id: string; nombre: string }>
}

export function AnalyticsFilters({
  filters,
  onFilterChange,
  onExport,
  equipos = [],
}: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Filtro de Género */}
      <Select value={filters.genero} onValueChange={(value) => onFilterChange('genero', value)}>
        <SelectTrigger className="w-[180px]">
          <Users className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Género" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="hombre">Hombre</SelectItem>
          <SelectItem value="mujer">Mujer</SelectItem>
          <SelectItem value="otro">Otro</SelectItem>
          <SelectItem value="no_especificado">No especificado</SelectItem>
        </SelectContent>
      </Select>

      {/* Filtro de Equipo */}
      <Select value={filters.equipo} onValueChange={(value) => onFilterChange('equipo', value)}>
        <SelectTrigger className="w-[180px]">
          <Building2 className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Equipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los equipos</SelectItem>
          {equipos.length > 0 ? (
            equipos.map((equipo) => (
              <SelectItem key={equipo.id} value={equipo.id}>
                {equipo.nombre}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="" disabled>Cargando equipos...</SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Filtro de Antigüedad */}
      <Select value={filters.antiguedad} onValueChange={(value) => onFilterChange('antiguedad', value)}>
        <SelectTrigger className="w-[180px]">
          <CalendarIcon className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Antigüedad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="menos_6_meses">&lt; 6 meses</SelectItem>
          <SelectItem value="6_12_meses">6-12 meses</SelectItem>
          <SelectItem value="1_3_años">1-3 años</SelectItem>
          <SelectItem value="3_5_años">3-5 años</SelectItem>
          <SelectItem value="mas_5_años">&gt; 5 años</SelectItem>
        </SelectContent>
      </Select>

      {/* Botón de Exportación */}
      {onExport && (
        <Button
          variant="default"
          size="sm"
          onClick={onExport}
          className="ml-auto bg-gray-900 text-white hover:bg-gray-800"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      )}
    </div>
  )
}
