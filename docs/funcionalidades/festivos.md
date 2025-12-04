# 📅 DOCUMENTACIÓN: SISTEMA DE FESTIVOS Y CALENDARIO LABORAL

**Versión**: 2.0  
**Fecha**: 4 Diciembre 2024  
**Estado**: Sistema completo y operativo

---

## 📋 RESUMEN

El sistema de festivos y calendario laboral permite a las empresas configurar qué días son laborables y gestionar festivos nacionales, de empresa, y personalizados por empleado. Esta configuración se integra automáticamente en todos los cálculos de ausencias y fichajes.

---

## 🎯 CARACTERÍSTICAS PRINCIPALES

### 1. Días Laborables Configurables
- Configuración por empresa de qué días de la semana son laborables
- Por defecto: Lunes a Viernes
- Personalizable: puedes activar sábados o domingos si tu empresa trabaja esos días
- Almacenado en `Empresa.config.diasLaborables` (JSONB)

### 2. Festivos de Empresa
- **Festivos Nacionales**: Importación automática de 10 festivos nacionales de España
- **Festivos Empresa**: Crea festivos específicos de tu empresa
- Gestión completa: crear, editar, eliminar, activar/desactivar
- Vista calendario visual y lista

### 3. Festivos Personalizados por Empleado
- **Nueva funcionalidad**: Permite asignar festivos específicos a cada empleado
- **Sustitución inteligente**: Los festivos personalizados **reemplazan** festivos de empresa en las mismas fechas
- **Caso de uso**: Festivos locales, autonómicos o regionales específicos del empleado
- **Gestión desde perfil**: HR Admin puede configurar desde el perfil del empleado
- **Copiar configuración**: Posibilidad de copiar festivos personalizados a otros empleados

### 4. Integración Automática
- Los cálculos de días de ausencia usan automáticamente:
  - Configuración de días laborables
  - Festivos activos de empresa
  - Festivos personalizados del empleado
- Sincronización con:
  - Calendario individual del empleado
  - Cálculos de ausencias
  - Sistema de fichajes
- No hace falta recalcular manualmente

---

## 🏗️ ARQUITECTURA

### Base de Datos

#### Modelo Festivo (Empresa)
```prisma
model festivos {
  id                String   @id @default(uuid())
  empresaId         String
  fecha             DateTime @db.Date
  nombre            String   @db.VarChar(100)
  tipo              String   @db.VarChar(50)  // 'nacional' | 'empresa'
  origen            String   @db.VarChar(50)  // 'api' | 'manual'
  activo            Boolean  @default(true)
  comunidadAutonoma String?  @db.VarChar(100)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  empresa empresas @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  
  @@unique([empresaId, fecha])
  @@index([empresaId])
  @@index([fecha])
}
```

#### Modelo Festivo Personalizado (Empleado)
```prisma
model empleado_festivos {
  id         String    @id @default(cuid())
  empleadoId String
  nombre     String    @db.VarChar(200)
  fecha      DateTime  @db.Date
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  empleado   empleados @relation(fields: [empleadoId], references: [id], onDelete: Cascade)

  @@unique([empleadoId, fecha])
  @@index([empleadoId])
  @@index([fecha])
}
```

**Nota importante**: Los festivos personalizados **NO tienen campo `activo`**. Si un festivo personalizado existe en la tabla, está activo y reemplaza al festivo de empresa. Para "desactivar" un festivo personalizado, simplemente se elimina.

#### Configuración Empresa
```json
{
  "diasLaborables": {
    "lunes": true,
    "martes": true,
    "miercoles": true,
    "jueves": true,
    "viernes": true,
    "sabado": false,
    "domingo": false
  }
}
```

### Lógica de Negocio

#### lib/festivos/importar-nacionales.ts
- `importarFestivosNacionales(empresaId, añoInicio, añoFin)`: Importa festivos
- `tieneFestivosImportados(empresaId)`: Verifica si hay festivos
- `calcularViernesSanto(año)`: Calcula Semana Santa (algoritmo de Gauss)

#### lib/calculos/dias-laborables.ts
- `getDiasLaborablesEmpresa(empresaId)`: Obtiene configuración
- `esDiaLaborable(fecha, empresaId)`: Verifica si es laborable
- `contarDiasLaborables(fechaInicio, fechaFin, empresaId)`: Cuenta días
- `getFestivosActivosParaEmpleado(empresaId, empleadoId, fechaInicio, fechaFin)`: **Función clave** que obtiene festivos de empresa + personalizados del empleado, **reemplazando** los de empresa cuando hay conflicto de fechas

---

## 🔌 API ENDPOINTS

### Festivos de Empresa

#### GET /api/festivos
Listar festivos de la empresa.

**Query Params**:
- `año` (opcional): Filtrar por año
- `tipo` (opcional): 'nacional' | 'empresa'
- `activo` (opcional): true | false

**Response**:
```json
{
  "festivos": [
    {
      "id": "uuid",
      "fecha": "2025-12-25",
      "nombre": "Navidad",
      "tipo": "nacional",
      "activo": true
    }
  ],
  "meta": {
    "total": 15,
    "año": 2025,
    "festivosAñoActual": 10,
    "festivosAñoProximo": 5
  }
}
```

**Nota**: la propiedad `fecha` siempre se normaliza a `YYYY-MM-DD` sin componente horario.

#### POST /api/festivos
Crear festivo de empresa.

**Body**:
```json
{
  "fecha": "2025-07-15",
  "nombre": "Aniversario Empresa",
  "activo": true
}
```

**Validaciones**:
- Fecha no duplicada para la empresa
- Nombre requerido (máx 100 caracteres)
- Solo HR Admin

#### PATCH /api/festivos/[id]
Editar festivo de empresa.

**Body**:
```json
{
  "nombre": "Nuevo nombre",
  "fecha": "2025-07-16",
  "activo": false
}
```

**Restricciones**:
- Festivos nacionales: solo se puede cambiar `activo`
- Festivos empresa: todos los campos editables
- Solo HR Admin

#### DELETE /api/festivos/[id]
Eliminar festivo de empresa.

**Restricciones**:
- Solo festivos tipo 'empresa'
- Festivos nacionales solo se desactivan
- Solo HR Admin

#### POST /api/festivos/importar-nacionales
Importar festivos nacionales automáticamente.

**Query Params**:
- `añoInicio` (opcional): Año inicial (default: año actual)
- `añoFin` (opcional): Año final (default: año actual + 1)

**Response**:
```json
{
  "message": "Importación completada: 20 festivos importados, 0 ya existían",
  "importados": 20,
  "omitidos": 0,
  "años": [2025, 2026]
}
```

### Festivos Personalizados por Empleado

#### GET /api/empleados/[id]/festivos
Obtener festivos personalizados de un empleado.

**Permisos**: Solo HR Admin

**Response**:
```json
[
  {
    "id": "cuid",
    "fecha": "2025-03-19",
    "nombre": "San José - Fiesta Local Valencia"
  }
]
```

#### POST /api/empleados/[id]/festivos
Crear festivo personalizado para un empleado.

**Permisos**: Solo HR Admin

**Body**:
```json
{
  "empleadoId": "cuid",
  "fecha": "2025-03-19",
  "nombre": "San José - Fiesta Local Valencia"
}
```

**Validaciones**:
- Debe existir un festivo de empresa activo en esa fecha (para reemplazar)
- No puede haber otro festivo personalizado del empleado en esa fecha
- Fecha requerida
- Nombre requerido (máx 200 caracteres)

**Response**:
```json
{
  "id": "cuid",
  "fecha": "2025-03-19",
  "nombre": "San José - Fiesta Local Valencia"
}
```

#### DELETE /api/empleados/[id]/festivos/[festivoId]
Eliminar festivo personalizado de un empleado.

**Permisos**: Solo HR Admin

**Response**:
```json
{
  "success": true
}
```

### Calendario Laboral

#### GET /api/empresa/calendario-laboral
Obtener configuración de días laborables.

**Response**:
```json
{
  "diasLaborables": {
    "lunes": true,
    "martes": true,
    "miercoles": true,
    "jueves": true,
    "viernes": true,
    "sabado": false,
    "domingo": false
  }
}
```

#### PATCH /api/empresa/calendario-laboral
Actualizar días laborables.

**Body**:
```json
{
  "lunes": true,
  "martes": true,
  "miercoles": true,
  "jueves": true,
  "viernes": true,
  "sabado": true,
  "domingo": false
}
```

**Validaciones**:
- Al menos un día debe estar activo
- Solo HR Admin

---

## 🖥️ COMPONENTES UI

### CalendarioFestivos
**Ubicación**: `components/hr/calendario-festivos.tsx`

Vista de calendario mensual para gestionar festivos de empresa.

**Características**:
- Navegación entre meses
- Festivos marcados con colores (rojo para nacionales)
- Click en día para crear festivo
- Click en festivo para editar
- Botón "Nuevo Festivo"

### ListaFestivos
**Ubicación**: `components/hr/lista-festivos.tsx`

Tabla de festivos de empresa con acciones.

**Columnas**:
- Fecha (formato largo español)
- Nombre
- Tipo (Badge: Nacional/Empresa)
- Estado (Badge: Activo/Inactivo)
- Acciones

**Acciones**:
- Editar (solo empresa)
- Eliminar (solo empresa)
- Activar/Desactivar (todos)

### FestivosPersonalizadosModal
**Ubicación**: `components/ausencias/festivos-personalizados-modal.tsx`

**Nueva funcionalidad**: Modal para gestionar festivos personalizados de un empleado.

**Características**:
- **Título**: "Personalizar festivos" (sin nombre del empleado, ya se está en su contexto)
- **Lista de festivos de empresa**: Muestra todos los festivos de empresa configurados
- **Selección inteligente**: Para cada festivo de empresa, HR puede:
  - Ver el festivo original (nombre del festivo de empresa)
  - Hacer clic en "Personalizar" para reemplazarlo
  - Escribir el nombre del festivo personalizado (ej: "San José - Fiesta Local Valencia")
  - El festivo de empresa se muestra tachado cuando hay personalización
  - El festivo personalizado se muestra con badge "Personalizado"
- **Editar/Eliminar**: Puede editar el nombre o eliminar la personalización (vuelve al festivo de empresa)
- **Botón Guardar**: Guarda todos los cambios realizados
- **Dialog de copia**: Tras guardar, si hay festivos personalizados configurados, muestra un dialog opcional para copiar la configuración a otros empleados
- **Selección múltiple**: En el dialog de copia, permite seleccionar varios empleados con checkboxes
- **Información clara**: Muestra cuántos festivos personalizados tiene el empleado

**Flujo de uso**:
1. HR Admin accede al perfil del empleado > Tab Ausencias
2. Click en icono de editar junto a "Calendario"
3. Se abre el modal "Personalizar festivos"
4. Selecciona festivos de empresa para personalizar
5. Escribe el nombre personalizado para cada uno
6. Click en "Guardar configuración"
7. (Opcional) Dialog para copiar a otros empleados
8. Selecciona empleados destino
9. Click en "Copiar configuración"

### Modal Gestionar Ausencias > Calendario Laboral
**Ubicación**: `app/(dashboard)/hr/horario/ausencias/gestionar-ausencias-modal.tsx`

Tab completo para configurar calendario laboral de empresa.

**Secciones**:
1. **Días Laborables**: Checkboxes para L-D
2. **Botón Importar**: Importa festivos nacionales
3. **Festivos**: Toggle entre calendario visual y lista
4. **Guardar**: Guarda días laborables

### Calendario Individual del Empleado
**Ubicación**: `components/shared/mi-espacio/ausencias-tab.tsx`

Calendario que muestra al empleado sus días laborables, ausencias y festivos.

**Características**:
- Muestra festivos de empresa + personalizados del empleado
- Los festivos personalizados **reemplazan** a los de empresa en las mismas fechas
- Sincronizado automáticamente con los cálculos de días laborables
- Se actualiza al guardar festivos personalizados

---

## 🔄 FLUJOS DE USO

### Setup Inicial (Automático)

Cuando se crea una empresa nueva:
1. Sistema crea configuración L-V por defecto
2. Sistema importa festivos nacionales (año actual + próximo)

### Configuración de Festivos de Empresa por HR

1. HR accede a **Horario > Ausencias**
2. Click en **Gestionar Ausencias**
3. Tab **Calendario Laboral**
4. Ajusta días laborables (checkboxes)
5. Click **Importar Calendario Nacional** (si no se hizo automáticamente)
6. Cambia a vista calendario o lista
7. Crea festivos personalizados de empresa (click en día o botón)
8. Activa/desactiva festivos según necesidad
9. Click **Guardar Configuración**

### Configuración de Festivos Personalizados por Empleado

1. HR Admin accede a **Empleados > [Empleado] > Tab Ausencias**
2. Click en icono de **editar** junto a "Calendario"
3. Se abre modal "Personalizar festivos"
4. Revisa la lista de festivos de empresa
5. Para cada festivo que desea personalizar:
   - Click en "Personalizar"
   - Escribe el nombre del festivo local/regional
   - Ej: Reemplazar "Día de la Constitución" por "Fiesta Local de Valencia"
6. Puede editar o eliminar personalizaciones existentes
7. Click en "Guardar configuración"
8. **(Opcional)** Si aparece el dialog de copia:
   - Selecciona otros empleados con checkboxes
   - Click en "Copiar configuración"
   - Los mismos festivos personalizados se copian a esos empleados

### Uso en Cálculos (Automático)

Cuando un empleado solicita ausencia:
1. Sistema obtiene días laborables de empresa
2. Sistema obtiene festivos activos de empresa
3. Sistema obtiene festivos personalizados del empleado
4. Sistema **reemplaza** festivos de empresa con personalizados en fechas coincidentes
5. Sistema calcula:
   - Días naturales (todos los días)
   - Días laborables (según config + festivos combinados)
   - Días solicitados (laborables - festivos)
6. Muestra resultado al empleado
7. Guarda en BD

---

## 📊 FESTIVOS NACIONALES INCLUIDOS

| Fecha | Nombre | Variable |
|-------|--------|----------|
| 1 enero | Año Nuevo | No |
| 6 enero | Reyes Magos | No |
| Variable | Viernes Santo | Sí (Semana Santa) |
| 1 mayo | Día del Trabajador | No |
| 15 agosto | Asunción de la Virgen | No |
| 12 octubre | Fiesta Nacional de España | No |
| 1 noviembre | Todos los Santos | No |
| 6 diciembre | Día de la Constitución | No |
| 8 diciembre | Inmaculada Concepción | No |
| 25 diciembre | Navidad | No |

### Cálculo de Viernes Santo
Usa el **algoritmo de computación de Pascua de Gauss** para calcular la fecha de Domingo de Pascua y resta 2 días.

---

## 🧪 EJEMPLOS DE USO

### Ejemplo 1: Importar Festivos Nacionales

```typescript
// Desde frontend
const response = await fetch('/api/festivos/importar-nacionales', {
  method: 'POST',
});

const data = await response.json();
console.log(data.message);
// "Importación completada: 20 festivos importados, 0 ya existían"
```

### Ejemplo 2: Crear Festivo Personalizado de Empresa

```typescript
const response = await fetch('/api/festivos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fecha: '2025-07-15',
    nombre: 'Aniversario Empresa',
    activo: true,
  }),
});
```

### Ejemplo 3: Crear Festivo Personalizado para Empleado

```typescript
const response = await fetch(`/api/empleados/${empleadoId}/festivos`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    empleadoId: empleadoId,
    fecha: '2025-03-19',
    nombre: 'San José - Fiesta Local Valencia',
  }),
});
```

**Resultado**: En la fecha 19 de marzo de 2025, el empleado tendrá el festivo "San José - Fiesta Local Valencia" en lugar del festivo de empresa que hubiera en esa fecha.

### Ejemplo 4: Actualizar Días Laborables

```typescript
const response = await fetch('/api/empresa/calendario-laboral', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: true,  // Empresa trabaja sábados
    domingo: false,
  }),
});
```

### Ejemplo 5: Obtener Festivos de un Empleado (con Personalizados)

```typescript
import { getFestivosActivosParaEmpleado } from '@/lib/calculos/dias-laborables';

// Obtiene festivos de empresa + personalizados del empleado
// Los personalizados REEMPLAZAN a los de empresa en las mismas fechas
const festivos = await getFestivosActivosParaEmpleado(
  empresaId,
  empleadoId,
  new Date('2025-01-01'),
  new Date('2025-12-31')
);

// festivos contiene:
// - Festivos de empresa (excepto los reemplazados)
// - Festivos personalizados del empleado
```

---

## 🔍 VALIDACIONES

### Festivos de Empresa
- ✅ Fecha requerida y válida
- ✅ Nombre requerido (1-100 caracteres)
- ✅ No duplicados (misma empresa + fecha)
- ✅ Solo eliminar tipo 'empresa'
- ✅ Solo HR Admin puede gestionar

### Festivos Personalizados de Empleado
- ✅ Fecha requerida y válida
- ✅ Nombre requerido (1-200 caracteres)
- ✅ No duplicados (mismo empleado + fecha)
- ✅ Debe existir festivo de empresa en esa fecha (para reemplazar)
- ✅ Solo HR Admin puede gestionar
- ✅ Empleado debe pertenecer a la misma empresa que el usuario

### Días Laborables
- ✅ Al menos un día activo
- ✅ Todos los días boolean
- ✅ Solo HR Admin puede modificar

### Importación
- ✅ Años dentro de rango ±5 años del actual
- ✅ Año fin >= año inicio
- ✅ Evita duplicados automáticamente (upsert)

---

## 🚀 PRÓXIMOS PASOS

### Implementar
1. **Hook automático**: Importar festivos al crear empresa ✅
2. **Festivos personalizados**: Sistema de festivos por empleado ✅
3. **UI mejorada**: Modal de personalización con mejor UX ✅
4. **Copiar configuración**: Copiar festivos personalizados entre empleados ✅

### Mejoras Futuras
1. **Cache**: Cachear días laborables para mejorar performance
2. **Bulk operations**: Importar múltiples festivos personalizados (CSV/Excel)
3. **Plantillas**: Plantillas de festivos por comunidad autónoma
4. **Gestión masiva**: Asignar festivos personalizados a múltiples empleados a la vez
5. **Notificaciones**: Avisar cuando se aproxima un festivo
6. **API externa**: Integrar con API oficial de festivos de España
7. **Historial**: Registro de cambios en festivos personalizados

---

## 📚 REFERENCIAS TÉCNICAS

### Archivos Clave

**Backend**:
- `lib/festivos/importar-nacionales.ts` - Importación de festivos nacionales
- `lib/calculos/dias-laborables.ts` - Lógica días laborables y festivos combinados
- `lib/validaciones/schemas.ts` - Schemas Zod
- `app/api/festivos/route.ts` - GET, POST festivos de empresa
- `app/api/festivos/[id]/route.ts` - GET, PATCH, DELETE festivos de empresa
- `app/api/festivos/importar-nacionales/route.ts` - POST importación
- `app/api/empleados/[id]/festivos/route.ts` - GET, POST festivos personalizados
- `app/api/empleados/[id]/festivos/[festivoId]/route.ts` - DELETE festivos personalizados
- `app/api/empresa/calendario-laboral/route.ts` - GET, PATCH días laborables

**Frontend**:
- `components/hr/calendario-festivos.tsx` - Calendario visual de empresa
- `components/hr/lista-festivos.tsx` - Tabla festivos de empresa
- `components/hr/editar-festivo-modal.tsx` - Modal crear/editar festivo de empresa
- `components/ausencias/festivos-personalizados-modal.tsx` - **Nuevo**: Modal personalizar festivos por empleado
- `components/shared/mi-espacio/ausencias-tab.tsx` - Calendario individual con festivos combinados
- `app/(dashboard)/hr/horario/ausencias/gestionar-ausencias-modal.tsx` - Tab calendario laboral

**Base de Datos**:
- `prisma/schema.prisma`:
  - Modelo `festivos` (festivos de empresa)
  - Modelo `empleado_festivos` (festivos personalizados por empleado)
  - Empresa.config.diasLaborables (JSONB)
- `prisma/migrations/20251204182139_remove_activo_from_empleado_festivos/` - Migración que elimina campo `activo`

---

## 🎯 RESUMEN DE CAMBIOS EN V2.0

### Cambios Principales
1. **Sistema de festivos personalizados por empleado** completamente implementado
2. **Lógica de sustitución**: Los festivos personalizados reemplazan a los de empresa en las mismas fechas
3. **Modal rediseñado**: Nueva UI intuitiva para personalizar festivos
4. **Sin estados innecesarios**: Eliminado campo `activo` de `empleado_festivos` (si existe, está activo)
5. **Botón guardar**: Cambios se aplican al hacer clic en "Guardar configuración"
6. **Dialog de copia**: Opción para copiar configuración a otros empleados tras guardar
7. **Sincronización completa**: Integrado en calendario individual, ausencias y fichajes
8. **Título simplificado**: "Personalizar festivos" (sin nombre del empleado)

### Mejoras de UX
- Vista clara de festivos de empresa vs personalizados
- Festivo de empresa se muestra tachado cuando está personalizado
- Badge "Personalizado" para identificar festivos reemplazados
- Proceso de guardado explícito en lugar de cambios automáticos
- Selección múltiple con checkboxes para copiar a otros empleados
- Información contextual sobre el propósito de los festivos personalizados

### Mejoras Técnicas
- Función `getFestivosActivosParaEmpleado` optimizada para combinar festivos correctamente
- Filtrado eficiente usando `Set` para búsquedas rápidas
- Eliminación de lógica innecesaria de estados activo/inactivo
- Mejor separación de responsabilidades entre API y componentes

---

**Última actualización**: 4 Diciembre 2024  
**Estado**: Sistema completo y operativo  
**Versión**: 2.0
