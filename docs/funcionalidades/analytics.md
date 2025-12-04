# Módulo de Analytics

## Descripción General

El módulo de Analytics proporciona visualizaciones y métricas en tiempo real sobre la plantilla, compensación y fichajes de la empresa. Está diseñado exclusivamente para usuarios con rol **HR Admin**.

**Ubicación:** `/hr/analytics`
**Estado:** ✅ COMPLETADO Y LISTO PARA USAR
**Versión:** 3.0
**Fecha:** 4 de Diciembre de 2025

---

## 1. Características Principales

### Definiciones únicas de métricas
- Las definiciones de cada KPI viven en `lib/analytics/metrics.ts`.
- Todos los endpoints (`/api/analytics/*`) devuelven `metadata.metrics` con esa misma lista, evitando divergencias entre frontend y documentación.

### 1.1 Organización por Pestañas

El módulo está organizado en 4 pestañas principales:

- **Plantilla**: Métricas sobre empleados, equipos, distribución y evolución
- **Compensación**: Análisis de costes salariales y distribución salarial
- **Fichajes**: Horas trabajadas y tendencias de asistencia
- **Brechas y Equidad**: Análisis de brechas salariales, diversidad e inclusión

### 1.2 Filtros Globales

Los filtros se aplican a todas las visualizaciones en tiempo real:

- **Género**: Todos, Hombre, Mujer, Otro, No especificado
- **Equipo**: Filtro dinámico basado en los equipos activos de la empresa (usa IDs reales)
- **Antigüedad**: Todos, < 6 meses, 6-12 meses, 1-3 años, 3-5 años, > 5 años

### 1.3 Exportación a Excel

Botón de exportación que genera un archivo Excel con 5 hojas:
- **Info**: Metadatos y filtros aplicados
- **Plantilla**: Listado de empleados con datos personales
- **Compensación**: Salarios por empleado
- **Fichajes**: Resumen de horas trabajadas del mes
- **Brechas y Equidad**: Datos detallados de género, edad, puesto y salarios para análisis de equidad
- Todos los filtros se aplican directamente en la base de datos (sin filtrado en memoria)

---

## 2. Métricas por Pestaña

### Pestaña: Plantilla

**KPIs destacados:**
1. **Total empleados**: Número total de empleados activos (incluye variación vs mes anterior)
2. **Altas del mes**: Nuevas incorporaciones en el mes actual
3. **Bajas del mes**: Finalizaciones de contrato en el mes actual

**Gráficas disponibles:**

1. **Empleados por Equipo** (Gráfico de Barras)
   - Distribución actual de empleados por equipo
   - Incluye categoría "Sin equipo" para empleados no asignados

2. **Evolución Plantilla** (Gráfico de Área)
   - Tendencia de crecimiento de plantilla en los últimos 12 meses
   - Muestra el total de empleados activos al final de cada mes

3. **Distribución por Género** (Gráfico de Donut)
   - Composición de la plantilla por género
   - Muestra el total de empleados en el centro

4. **Altas y Bajas** (Gráfico de Barras Múltiple)
   - Comparativa de altas vs bajas en los últimos 6 meses
   - Color verde para altas, rojo para bajas

5. **Distribución por Antigüedad** (Gráfico de Donut)
   - Empleados agrupados por años en la empresa
   - Rangos: < 1 año, 1-3 años, 3-5 años, > 5 años

6. **Rotación Mensual** (Gráfico de Área)
   - Porcentaje de bajas sobre la plantilla de cada mes (últimos 6 meses)
   - Calculado a partir de las bajas mensuales y el headcount medio

**Métricas calculadas:**
- Total de empleados activos
- Cambio vs mes anterior
- Distribución por equipo (incluye "Sin equipo")
- Evolución de plantilla (12 meses históricos)
- Altas y bajas del mes
- Distribución por género
- Evolución de altas y bajas (6 meses)
- Distribución por antigüedad (calculada en tiempo real)

### Pestaña: Compensación

**KPIs principales destacados:**
1. **Coste total nómina**: Suma de todos los salarios brutos mensuales (muestra variación vs mes anterior)
2. **Salario promedio**: Media del salario base mensual por empleado
3. **Brecha salarial (H vs M)**: Diferencia absoluta y porcentual entre los salarios promedios de hombres y mujeres
4. *(Opcional)* **Nóminas procesadas**: Número de nóminas emitidas en el año en curso (visible solo cuando existe histórico)

**KPIs de nóminas procesadas (año actual vs año anterior):**
1. **Total neto abonado**: Total neto pagado en nóminas del año actual
2. **Complementos abonados**: Total de complementos pagados
3. **Nóminas procesadas**: Número total de nóminas procesadas

**Gráficas disponibles:**

1. **Total neto abonado** (Gráfico de Área)
   - Evolución mensual del total neto abonado en el año actual
   
2. **Coste neto por equipo** (Gráfico de Barras)
   - Top equipos por coste total neto del año actual

3. **Top complementos abonados** (Gráfico de Barras)
   - Complementos más utilizados por importe total del año actual

4. **Salario Promedio por Equipo** (Gráfico de Barras)
   - Salario base mensual promedio por equipo
   - En euros mensuales

5. **Evolución Coste Nómina** (Gráfico de Área)
   - Tendencia del coste total de nómina en los últimos 6 meses
   - Muestra la suma de todos los salarios brutos mensuales

6. **Distribución Salarial** (Gráfico de Barras)
   - Número de empleados por rango salarial anual
   - Rangos: Menos de 20k, 20k-30k, 30k-40k, 40k-50k, 50k-70k, Más de 70k

**Métricas calculadas:**
- Coste total de nómina mensual
- Cambio de coste vs mes anterior
- Salario promedio de la empresa
- Salario promedio por equipo
- Evolución de coste (6 meses)
- Distribución salarial por rangos (6 rangos)
- Analytics de nóminas (año actual vs anterior)

### Pestaña: Fichajes

**KPIs destacados:**
1. **Total horas mes**: Suma de horas trabajadas en el mes actual
2. **Promedio horas/día**: Media de horas trabajadas diarias
3. **Balance acumulado**: Horas extra o pendientes acumuladas
4. **Tasa de absentismo**: Porcentaje de días de ausencia sobre días posibles

**Gráficas disponibles:**

0. **KPIs de Control Horario** (Tarjetas KPI)
   - Total de horas del mes con variación respecto al mes anterior
   - Balance acumulado (horas extra o pendientes)
   - Tasa de absentismo global (en %)

1. **Horas Trabajadas Diarias** (Gráfico de Área)
   - Total de horas trabajadas por día del mes actual
   - Solo incluye días laborables (lunes a viernes)
   - Solo incluye fichajes con estado 'finalizado' o 'pendiente (revisión)'

2. **Promedio de Horas por Equipo** (Gráfico de Barras)
   - Horas trabajadas promedio del mes por equipo
   - Incluye categoría "Sin equipo"

3. **Tasa de Absentismo por Equipo** (Gráfico de Barras)
   - Porcentaje de ausencias por equipo
   - Calculado sobre días laborables del mes
   - Calcula días reales de ausencia (no solo número de ausencias)

**Métricas calculadas:**
- Total horas trabajadas del mes
- Cambio vs mes anterior
- Promedio de horas por día
- Horas trabajadas diarias (solo días laborables)
- Tasa de absentismo
- Balance de horas acumulado
- Promedio de horas por equipo
- Tasa de absentismo por equipo

### Pestaña: Brechas y Equidad

**KPIs principales destacados:**
1. **Brecha salarial género**: Diferencia absoluta y porcentual entre salarios de hombres y mujeres
2. **Índice de diversidad**: Score global (0-100%) que combina diversidad de género, liderazgo y equidad salarial
3. **Managers mujeres**: Porcentaje de mujeres en posiciones de liderazgo vs plantilla general
4. **Total puestos analizados**: Número de puestos con datos suficientes para análisis

**Componentes del Índice de Diversidad:**
- **Diversidad de Género (33%)**: Equilibrio en la distribución de género en la plantilla general
- **Diversidad en Liderazgo (33%)**: Representación equitativa en posiciones de gestión
- **Equidad Salarial (33%)**: Consistencia salarial dentro de cada puesto (baja desviación)

**Gráficas disponibles:**

1. **Salario Promedio por Género** (Gráfico de Barras)
   - Comparación de salarios base mensuales entre géneros
   - Incluye todos los géneros registrados en el sistema

2. **Salario Promedio por Edad** (Gráfico de Barras)
   - Distribución salarial por rangos de edad: < 30, 30-40, 40-50, 50+
   - Solo incluye empleados con fecha de nacimiento registrada

3. **Salario Promedio por Puesto** (Gráfico de Barras)
   - Top 10 puestos con mayor remuneración
   - Ayuda a identificar segregación salarial por rol

4. **Distribución de Género por Puesto** (Gráfico de Barras Múltiple)
   - Composición de género en cada puesto
   - Solo puestos con 3+ empleados para representatividad estadística
   - Identifica posibles segregaciones ocupacionales

5. **Distribución de Género por Equipo** (Gráfico de Barras Múltiple)
   - Composición de género en cada equipo
   - Ayuda a identificar equipos con desequilibrios

6. **Salario vs Antigüedad por Género** (Gráfico de Barras Múltiple)
   - Comparación de evolución salarial según años en la empresa
   - Rangos: 0-2, 3-5, 6-10, 10+ años
   - Identifica brechas en progresión de carrera

7. **Representación en Liderazgo** (Gráfico de Donut)
   - Distribución de género en posiciones de gestión
   - Solo incluye empleados que tienen reportes directos

**Tabla Detallada por Puesto:**
- Análisis completo de cada puesto con:
  - Número de empleados
  - Salario promedio
  - Rango salarial (mín-máx)
  - Porcentaje de hombres y mujeres
  - Top 10 puestos por defecto

**Métricas calculadas:**
- Brecha salarial por género (diferencia absoluta y porcentual)
- Brecha salarial por edad (4 rangos)
- Brecha salarial por puesto (con desviación estándar)
- Distribución de género por puesto (solo puestos con 3+ empleados)
- Distribución de género por equipo
- Representación en liderazgo (managers vs plantilla general)
- Salario vs antigüedad por género (4 rangos)
- Distribución de tipos de contrato por género
- Índice de diversidad compuesto (score 0-100%)

**Consideraciones metodológicas:**
- Los análisis por puesto requieren mínimo 3 empleados para representatividad
- Los datos de edad requieren `fechaNacimiento` registrada
- Los managers se identifican como empleados con reportes directos
- El índice de diversidad pondera equitativamente tres dimensiones (género, liderazgo, equidad)

---

## 3. Arquitectura Técnica

### 3.1 Estructura de Archivos

```
app/
├── (dashboard)/hr/analytics/
│   ├── page.tsx                 # Página principal (server component)
│   └── analytics-client.tsx     # Cliente React con lógica de estado
├── api/analytics/
│   ├── equipos/route.ts         # GET: Lista de equipos
│   ├── plantilla/route.ts       # GET: Métricas de plantilla
│   ├── compensacion/route.ts    # GET: Métricas de compensación
│   ├── fichajes/route.ts        # GET: Métricas de fichajes
│   ├── brechas/route.ts         # GET: Métricas de brechas y equidad
│   └── export/route.ts          # GET: Exportar a Excel (5 hojas)
components/analytics/
├── filters.tsx                  # Componente de filtros globales
├── area-chart.tsx               # Componente reutilizable de gráfico de área
├── bar-chart.tsx                # Componente reutilizable de gráfico de barras
├── pie-chart.tsx                # Componente reutilizable de gráfico circular
└── kpi-card.tsx                 # Componente de tarjeta KPI
```

### 3.2 API Endpoints

#### GET `/api/analytics/equipos`
**Descripción:** Obtiene lista de equipos activos
**Autenticación:** HR Admin
**Respuesta:**
```json
[
  { "id": "uuid", "nombre": "Tech" },
  { "id": "uuid", "nombre": "Marketing" }
]
```

#### GET `/api/analytics/plantilla?genero=X&equipo=Y&antiguedad=Z`
**Descripción:** Métricas de plantilla
**Parámetros:**
- `genero`: todos | hombre | mujer | otro | no_especificado
- `equipo`: todos | {equipoId}
- `antiguedad`: todos | menos_6_meses | 6_12_meses | 1_3_años | 3_5_años | mas_5_años

**Respuesta:**
```json
{
  "totalEmpleados": 73,
  "cambioMes": 5,
  "porEquipo": [
    { "equipo": "Tech", "empleados": 25 },
    { "equipo": "Sin equipo", "empleados": 10 }
  ],
  "evolucionPlantilla": [
    { "mes": "ene 2024", "empleados": 68 },
    { "mes": "feb 2024", "empleados": 70 }
  ],
  "altasMes": 6,
  "bajasMes": 1,
  "distribucionGenero": [
    { "genero": "hombre", "empleados": 40 },
    { "genero": "mujer", "empleados": 33 }
  ],
  "evolucionAltasBajas": [
    { "mes": "ene 2024", "altas": 5, "bajas": 2 }
  ]
}
```

#### GET `/api/analytics/compensacion?genero=X&equipo=Y&antiguedad=Z`
**Descripción:** Métricas de compensación
**Respuesta:**
```json
{
  "costeTotalNomina": 180000,
  "cambioCoste": 5000,
  "salarioPromedio": 2466,
  "salarioPromedioEquipo": [
    { "equipo": "Tech", "promedio": 3000 }
  ],
  "evolucionCoste": [
    { "mes": "ene 2024", "coste": 175000 }
  ],
  "distribucionSalarial": [
    { "rango": "20k - 30k", "empleados": 15 }
  ]
}
```

#### GET `/api/analytics/fichajes?equipo=X&antiguedad=Y`
**Descripción:** Métricas de fichajes (no usa filtro de género)
**Respuesta:**
```json
{
  "totalHorasMes": 1520.5,
  "cambioHoras": 50.2,
  "promedioHorasDia": 7.8,
  "horasDiarias": [
    { "fecha": "2024-11-01", "horas": 158.5 }
  ],
  "tasaAbsentismo": 3.2,
  "balanceAcumulado": -15.5,
  "promedioHorasPorEquipo": [
    { "equipo": "Tech", "promedio": 165.2 }
  ],
  "tasaAbsentismoPorEquipo": [
    { "equipo": "Tech", "tasa": 2.5 }
  ]
}
```

#### GET `/api/analytics/brechas?genero=X&equipo=Y&antiguedad=Z`
**Descripción:** Métricas de brechas y equidad
**Parámetros:** Igual que plantilla/compensación
**Respuesta:**
```json
{
  "brechaSalarialGenero": {
    "diferencia": 250,
    "porcentaje": 8.5,
    "promedioHombres": 3200,
    "promedioMujeres": 2950,
    "empleadosHombres": 40,
    "empleadosMujeres": 35
  },
  "salarioPromedioPorGenero": [
    { "genero": "hombre", "promedio": 3200, "empleados": 40, "mediana": 3100 },
    { "genero": "mujer", "promedio": 2950, "empleados": 35, "mediana": 2900 }
  ],
  "salarioPromedioPorEdad": [
    { "rango": "< 30 años", "promedio": 2500, "empleados": 20, "mediana": 2450 },
    { "rango": "30-40 años", "promedio": 3200, "empleados": 30, "mediana": 3150 }
  ],
  "salarioPromedioPorPuesto": [
    { 
      "puesto": "Senior Developer", 
      "promedio": 4500, 
      "empleados": 12,
      "min": 3800,
      "max": 5200,
      "desviacion": 450,
      "mediana": 4400,
      "porcentajeHombres": 75.0,
      "porcentajeMujeres": 25.0
    }
  ],
  "distribucionGeneroPorPuesto": [
    {
      "puesto": "Developer",
      "hombres": 20,
      "mujeres": 8,
      "total": 28,
      "porcentajeHombres": 71.4,
      "porcentajeMujeres": 28.6
    }
  ],
  "distribucionGeneroPorEquipo": [
    {
      "equipo": "Tech",
      "hombres": 18,
      "mujeres": 7,
      "otros": 0,
      "total": 25,
      "porcentajeHombres": 72.0,
      "porcentajeMujeres": 28.0
    }
  ],
  "representacionLiderazgo": [
    { "genero": "hombre", "empleados": 8, "porcentaje": 66.7 },
    { "genero": "mujer", "empleados": 4, "porcentaje": 33.3 }
  ],
  "brechaLiderazgo": {
    "totalManagers": 12,
    "porcentajeManagersHombres": 66.7,
    "porcentajeManagersMujeres": 33.3,
    "porcentajeGeneralHombres": 53.3,
    "porcentajeGeneralMujeres": 46.7,
    "diferencia": 33.4
  },
  "salarioPorAntiguedadGenero": [
    {
      "rango": "0-2 años",
      "promedioHombres": 2800,
      "promedioMujeres": 2700,
      "empleadosHombres": 15,
      "empleadosMujeres": 12,
      "brecha": 100
    }
  ],
  "distribucionContratosPorGenero": [
    {
      "genero": "hombre",
      "contratos": [
        { "tipo": "indefinido", "empleados": 35 },
        { "tipo": "temporal", "empleados": 5 }
      ],
      "total": 40
    }
  ],
  "indiceDiversidad": {
    "score": 78.5,
    "diversidadGenero": 85.2,
    "diversidadLiderazgo": 72.5,
    "equidadSalarial": 77.8
  },
  "totalEmpleados": 75,
  "empleadosSinFechaNacimiento": 3
}
```

#### GET `/api/analytics/export?genero=X&equipo=Y&antiguedad=Z`
**Descripción:** Exportar datos a Excel (5 hojas)
**Respuesta:** Archivo .xlsx

---

## 4. Modelo de Datos

### 4.1 Relación Empleado - Equipo

El sistema usa la relación **N:N** entre `Empleado` y `Equipo` a través de `EmpleadoEquipo`:

```prisma
model Empleado {
  equipos EmpleadoEquipo[] // Relación N:N
}

model Equipo {
  miembros EmpleadoEquipo[]
}

model EmpleadoEquipo {
  empleadoId String
  equipoId   String
  empleado   Empleado
  equipo     Equipo
}
```

**Nota:** El campo `Empleado.departamento` ha sido eliminado. Analytics ahora usa la relación `Equipo` para agrupar empleados.

### 4.2 Cálculo de Antigüedad

```typescript
function calcularAntiguedad(fechaAlta: Date): string {
  const meses = (hoy - fechaAlta) en meses

  if (meses < 6) return 'menos_6_meses'
  if (meses < 12) return '6_12_meses'
  if (meses < 36) return '1_3_años'
  if (meses < 60) return '3_5_años'
  return 'mas_5_años'
}
```

---

## 5. Tecnologías Utilizadas

- **Frontend:**
  - React 19 con Hooks (useState, useEffect)
  - Shadcn/UI (Tabs, Select, Card, etc.)
  - Recharts (librería de gráficos)
  - Tailwind CSS

- **Backend:**
  - Next.js 16 App Router
  - API Routes (Route Handlers)
  - Prisma ORM
  - PostgreSQL

- **Exportación:**
  - XLSX (librería para generar archivos Excel)

---

## 6. Permisos y Seguridad

- **Acceso:** Solo usuarios con `rol === 'hr_admin'`
- **Aislamiento:** Todos los queries filtran por `empresaId` del usuario autenticado
- **Validación:** Los endpoints validan la sesión antes de devolver datos

---

## 7. Diseño y UX

### Características de Diseño

- ✅ Consistente con el resto de la aplicación
- ✅ Tabs personalizadas (matching mi-espacio, no Shadcn Tabs component)
- ✅ Layout responsive (desktop/tablet/móvil)
- ✅ Colores corporativos (#d97757, #6B6A64, etc.)
- ✅ Botón Exportar alineado con tabs (misma altura)
- ✅ Botón de *refresh* manual y timestamp de "Última actualización"
- ✅ Filtros posicionados debajo de tabs
- ✅ Estados vacíos con mensaje "No hay datos" en todas las gráficas

### Layout Estructura

```
Header
├── Título: "Analytics"
├── Tabs + Exportar (misma altura, flex justify-between)
│   ├── Tabs: Plantilla | Compensación | Fichajes
│   └── Botón Exportar
└── Filtros (debajo de tabs)
    ├── Género
    ├── Equipo
    └── Antigüedad

Content (scroll)
└── Grid de gráficas (responsive: 2 cols lg, 1 col mobile)
```

### Características UX

- Estado de carga implementado ("Cargando datos...")
- Mensajes de error visibles con botón de reintento y toast de notificación
- Tooltips en todas las gráficas
- Gráficas responsive
- Diseño limpio y profesional
- Carga paralela de datos (Promise.all)
- Placeholders informativos cuando no hay datos disponibles

---

## 8. Optimizaciones Futuras

1. **Caché de datos:** Implementar caché de métricas agregadas
2. **Carga progresiva:** Lazy loading de gráficas por pestaña
3. **Filtros avanzados:** Añadir rango de fechas personalizado
4. **Comparativas:** Comparar periodos (este mes vs mes anterior)
5. **Más gráficas:**
   - Compensación: Evolución salario promedio
   - Plantilla: Tasa de retención
6. **Análisis avanzado nóminas:** Integrar pestaña adicional con insights de /api/nominas/analytics
7. **Análisis predictivo de brechas:** Proyecciones de equidad basadas en tendencias
8. **Benchmarking sectorial:** Comparar índices de diversidad con estándares de la industria
9. **Análisis interseccional:** Combinar múltiples dimensiones (género + edad + puesto)

---

## 9. Troubleshooting

### Problema: No aparecen equipos en el filtro
**Solución:** Verificar que existan equipos activos en la empresa

### Problema: Las gráficas no cargan
**Solución:**
1. Verificar que hay datos en la base de datos
2. Revisar los logs del servidor para errores de Prisma
3. Verificar que el usuario tiene rol 'hr_admin'

### Problema: Error al exportar
**Solución:** Verificar que la librería XLSX está instalada correctamente

### Problema: Datos incorrectos
**Solución:**
1. Verificar que los empleados están asignados a equipos correctamente
2. Verificar que los fichajes tienen estado 'finalizado' o 'pendiente (revisión)'
3. Verificar que los salarios están correctamente asignados

---

## 10. Validación de Requisitos

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Datos reales (Equipos N:N) | ✅ | Implementado correctamente |
| Gráficas y KPIs relevantes | ✅ | Visualizaciones clave por pestaña + KPIs curados |
| Sistema de pestañas | ✅ | 3 pestañas implementadas |
| Diseño consistente | ✅ | Matching mi-espacio |
| Tabs + Export misma altura | ✅ | Layout optimizado (botones arriba) |
| Filtros debajo de tabs | ✅ | Posición correcta |
| Exportación Excel | ✅ | Funcional con filtros en BD (5 hojas) |
| Solo HR Admin | ✅ | Autenticación implementada |
| Análisis de brechas | ✅ | Pestaña completa con métricas de equidad |
| Índice de diversidad | ✅ | Score compuesto con 3 dimensiones |

**Total:** 10/10 requisitos cumplidos ✅

---

## 11. Changelog

### Versión 3.0 (4 Dic 2025) - NUEVO
- ✅ **Nueva pestaña: Brechas y Equidad** con análisis completo de equidad salarial
- ✅ **Brecha salarial por género**: Análisis detallado con diferencia absoluta y porcentual
- ✅ **Brecha salarial por edad**: Distribución en 4 rangos (< 30, 30-40, 40-50, 50+)
- ✅ **Brecha salarial por puesto**: Análisis de consistencia salarial con desviación estándar
- ✅ **Índice de Diversidad**: Score compuesto (0-100%) que mide diversidad de género, liderazgo y equidad salarial
- ✅ **Representación en liderazgo**: Análisis de género en posiciones de gestión vs plantilla general
- ✅ **Distribución de género por puesto y equipo**: Identificación de segregaciones ocupacionales
- ✅ **Salario vs antigüedad por género**: Análisis de progresión salarial en 4 rangos de antigüedad
- ✅ **Tabla detallada por puesto**: Vista tabular con métricas clave (salario, rango, % género)
- ✅ **Exportación ampliada**: Nueva hoja "Brechas y Equidad" en Excel con datos completos
- ✅ **Visualizaciones avanzadas**: 7 gráficas nuevas + 1 tabla interactiva
- ✅ **Nota metodológica**: Información transparente sobre cálculos y limitaciones

### Versión 2.2 (12 Nov 2025)
- ✅ Mejora de cabecera: filtros globales y exportación juntos en la parte superior derecha
- ✅ Eliminado el botón de actualización manual y el timestamp para simplificar la UI
- ✅ **KPIs de Plantilla optimizados**: Total empleados (con variación), Altas y Bajas del mes
- ✅ **KPIs de Compensación optimizados**: Coste total nómina (con delta), Salario promedio y Brecha salarial (H vs M)
- ✅ **KPI adicional en Fichajes**: Promedio horas/día
- ✅ **Nuevas gráficas de Plantilla**: Distribución por Antigüedad (tiempo real) y Rotación mensual
- ✅ Endpoint de Plantilla actualizado con distribución por antigüedad y endpoint de Compensación con promedios por género

### Versión 2.1 (12 Nov 2025)
- ✅ Filtro de equipos basado en IDs (100% compatible con API)
- ✅ Queries optimizados (sin N+1) para plantilla y fichajes
- ✅ Cálculo de absentismo por días reales
- ✅ Exportación con filtros aplicados en base de datos
- ✅ Manejo de errores visible + botón de reintento y toast
- ✅ Timestamp de última carga y botón de actualización manual
- ✅ Placeholders de "No hay datos" en gráficas
- ✅ Balance acumulado expuesto como KPI en fichajes

### Versión 2.0 (Nov 2024)
- ✅ Implementado sistema de pestañas
- ✅ Migrado de Departamentos a Equipos (relación N:N)
- ✅ Agregadas más gráficas (distribución género, altas/bajas)
- ✅ Mejorada performance con queries optimizados
- ✅ Eliminados KPIs redundantes
- ✅ Añadidas métricas de fichajes por equipo
- ✅ Diseño consistente con resto de la app

---

## 12. Características Destacadas

### 🎯 Datos Reales
- Usa relación N:N correcta (Empleado ↔ Equipo)
- Usa la relación `Equipo` en lugar del campo `departamento` eliminado
- Cálculo dinámico de antigüedad
- Solo fichajes finalizados o en revisión pendiente

### ⚡ Performance
- Carga paralela de datos (Promise.all)
- Filtrado eficiente en backend
- Queries optimizados con Prisma

### 🔧 Mantenibilidad
- Componentes reutilizables
- Código bien documentado
- TypeScript estricto
- Estructura clara

---

**Estado Final:** ✅ **APROBADO PARA PRODUCCIÓN**

**Última actualización:** 4 de Diciembre de 2025
**Versión:** 3.0
**Mantenedor:** Clousadmin Development Team

---

## 13. Análisis de Brechas - Notas Importantes

### Metodología del Índice de Diversidad

El Índice de Diversidad es un score compuesto (0-100%) que combina tres dimensiones con igual ponderación:

1. **Diversidad de Género (33%)**: Mide el equilibrio en la distribución de género en la plantilla general
   - Score = 1 - |empleados_hombres - empleados_mujeres| / total_empleados
   - Un score de 100% indica perfecta paridad; 0% indica total homogeneidad

2. **Diversidad en Liderazgo (33%)**: Mide la representación equitativa en posiciones de gestión
   - Score = 1 - |% managers_hombres - % managers_mujeres| / 100
   - Compara la distribución de género en liderazgo vs plantilla general

3. **Equidad Salarial (33%)**: Mide la consistencia salarial dentro de cada puesto
   - Score = 1 - promedio(desviación_estándar / salario_promedio por puesto)
   - Solo incluye puestos con 5+ empleados para robustez estadística
   - Un score alto indica salarios consistentes; un score bajo indica alta variabilidad

### Consideraciones Técnicas

- **Mínimo de empleados por puesto**: Los análisis por puesto requieren 3+ empleados para aparecer en "Distribución de Género" y 5+ para el cálculo de equidad salarial
- **Datos de edad**: Requieren `fechaNacimiento` registrada; empleados sin esta información se excluyen del análisis por edad
- **Identificación de managers**: Un empleado es considerado manager si tiene al menos un reporte directo (`managerId` apunta a su ID)
- **Cálculo de antigüedad**: Basado en `fechaAlta`, calculado en años completos
- **Medianas vs promedios**: Se incluyen ambas métricas para mitigar el impacto de valores atípicos

### Interpretación de Resultados

**Índice de Diversidad:**
- 90-100%: Excelente diversidad e inclusión
- 70-89%: Buena diversidad con áreas de mejora
- 50-69%: Diversidad moderada, requiere atención
- < 50%: Baja diversidad, requiere acción inmediata

**Brecha Salarial:**
- < 5%: Brecha mínima, dentro de rangos esperados
- 5-10%: Brecha moderada, revisar causas estructurales
- 10-20%: Brecha significativa, requiere análisis profundo
- > 20%: Brecha crítica, requiere intervención inmediata

**Representación en Liderazgo:**
- Comparar % mujeres en liderazgo vs % mujeres en plantilla
- Una diferencia > 15 puntos porcentuales sugiere techo de cristal
- Idealmente, la representación en liderazgo debería reflejar la plantilla general
