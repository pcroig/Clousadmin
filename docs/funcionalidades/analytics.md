# Módulo de Analytics

## Descripción General

El módulo de Analytics proporciona visualizaciones y métricas en tiempo real sobre la plantilla, compensación y fichajes de la empresa. Está diseñado exclusivamente para usuarios con rol **HR Admin**.

**Ubicación:** `/hr/analytics`
**Estado:** ✅ COMPLETADO Y LISTO PARA USAR
**Versión:** 2.2
**Fecha:** 12 de Noviembre de 2025

---

## 1. Características Principales

### 1.1 Organización por Pestañas

El módulo está organizado en 3 pestañas principales:

- **Plantilla**: Métricas sobre empleados, equipos, distribución y evolución
- **Compensación**: Análisis de costes salariales y distribución salarial
- **Fichajes**: Horas trabajadas y tendencias de asistencia

### 1.2 Filtros Globales

Los filtros se aplican a todas las visualizaciones en tiempo real:

- **Género**: Todos, Hombre, Mujer, Otro, No especificado
- **Equipo**: Filtro dinámico basado en los equipos activos de la empresa (usa IDs reales)
- **Antigüedad**: Todos, < 6 meses, 6-12 meses, 1-3 años, 3-5 años, > 5 años

### 1.3 Exportación a Excel

Botón de exportación que genera un archivo Excel con 4 hojas:
- **Info**: Metadatos y filtros aplicados
- **Plantilla**: Listado de empleados con datos personales
- **Compensación**: Salarios por empleado
- **Fichajes**: Resumen de horas trabajadas del mes
- Todos los filtros se aplican directamente en la base de datos (sin filtrado en memoria)

---

## 2. Métricas por Pestaña

### Pestaña: Plantilla

**KPIs destacados:**
1. **Total empleados**: Número total de empleados activos
2. **Altas del mes**: Nuevas incorporaciones en el mes actual
3. **Bajas del mes**: Finalizaciones de contrato en el mes actual
4. **Tasa de rotación**: Porcentaje de bajas sobre el total de plantilla

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
1. **Coste total nómina**: Suma de todos los salarios brutos mensuales
2. **Salario promedio**: Media del salario bruto mensual de la empresa
3. **Coste por empleado**: Coste promedio de nómina por empleado
4. **Variación coste**: Porcentaje de cambio respecto al mes anterior

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
   - Salario bruto mensual promedio por equipo
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
│   └── export/route.ts          # GET: Exportar a Excel
components/analytics/
├── filters.tsx                  # Componente de filtros globales
├── area-chart.tsx               # Componente reutilizable de gráfico de área
├── bar-chart.tsx                # Componente reutilizable de gráfico de barras
├── pie-chart.tsx                # Componente reutilizable de gráfico circular
└── kpi-card.tsx                 # Componente de tarjeta KPI (opcional)
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

#### GET `/api/analytics/export?genero=X&equipo=Y&antiguedad=Z`
**Descripción:** Exportar datos a Excel
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
| Más gráficas y KPIs relevantes | ✅ | 13 gráficas + 14 KPIs destacados |
| Sistema de pestañas | ✅ | 3 pestañas implementadas |
| Diseño consistente | ✅ | Matching mi-espacio |
| Tabs + Export misma altura | ✅ | Layout optimizado (botones arriba) |
| Filtros debajo de tabs | ✅ | Posición correcta |
| Exportación Excel | ✅ | Funcional con filtros en BD |
| Solo HR Admin | ✅ | Autenticación implementada |

**Total:** 8/8 requisitos cumplidos ✅

---

## 11. Changelog

### Versión 2.2 (12 Nov 2025)
- ✅ Mejora del layout: botones (Exportar/Actualizar) movidos arriba a la derecha
- ✅ Filtros reubicados debajo de las tabs para mejor UX
- ✅ Eliminado timestamp de "última actualización" para UI más limpia
- ✅ **KPIs destacados añadidos en Plantilla**: Total empleados, Altas/Bajas del mes, Tasa de rotación
- ✅ **KPIs principales añadidos en Compensación**: Coste total nómina, Salario promedio, Coste por empleado, Variación coste
- ✅ **KPI adicional en Fichajes**: Promedio horas/día
- ✅ **Nueva gráfica en Plantilla**: Distribución por Antigüedad (calculada en tiempo real desde fechaAlta)
- ✅ Endpoint de Plantilla actualizado con distribución por antigüedad

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

**Última actualización:** 12 de Noviembre de 2025
**Versión:** 2.1
**Mantenedor:** Clousadmin Development Team
