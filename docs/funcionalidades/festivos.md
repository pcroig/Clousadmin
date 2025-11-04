# 📅 DOCUMENTACIÓN: SISTEMA DE FESTIVOS Y CALENDARIO LABORAL

**Versión**: 1.0  
**Fecha**: 2 Noviembre 2025  
**Estado**: Sistema completo y operativo

---

## 📋 RESUMEN

El sistema de festivos y calendario laboral permite a las empresas configurar qué días son laborables y gestionar festivos nacionales y personalizados. Esta configuración se integra automáticamente en todos los cálculos de ausencias.

---

## 🎯 CARACTERÍSTICAS PRINCIPALES

### 1. Días Laborables Configurables
- Configuración por empresa de qué días de la semana son laborables
- Por defecto: Lunes a Viernes
- Personalizable: puedes activar sábados o domingos si tu empresa trabaja esos días
- Almacenado en `Empresa.config.diasLaborables` (JSONB)

### 2. Festivos
- **Festivos Nacionales**: Importación automática de 10 festivos nacionales de España
- **Festivos Personalizados**: Crea festivos específicos de tu empresa
- Gestión completa: crear, editar, eliminar, activar/desactivar
- Vista calendario visual y lista

### 3. Integración Automática
- Los cálculos de días de ausencia usan automáticamente:
  - Configuración de días laborables
  - Festivos activos
- No hace falta recalcular manualmente

---

## 🏗️ ARQUITECTURA

### Base de Datos

#### Modelo Festivo
```prisma
model Festivo {
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
  
  empresa Empresa @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  
  @@unique([empresaId, fecha])
  @@index([empresaId])
  @@index([fecha])
  @@map("festivos")
}
```

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

---

## 🔌 API ENDPOINTS

### Festivos

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

#### POST /api/festivos
Crear festivo personalizado.

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

#### GET /api/festivos/[id]
Obtener festivo específico.

#### PATCH /api/festivos/[id]
Editar festivo.

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
Eliminar festivo personalizado.

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

Vista de calendario mensual para gestionar festivos.

**Características**:
- Navegación entre meses
- Festivos marcados con colores (rojo para nacionales)
- Click en día para crear festivo
- Click en festivo para editar
- Botón "Nuevo Festivo"

### ListaFestivos
**Ubicación**: `components/hr/lista-festivos.tsx`

Tabla de festivos con acciones.

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

### EditarFestivoModal
**Ubicación**: `components/hr/editar-festivo-modal.tsx`

Modal para crear/editar festivo.

**Campos**:
- Fecha (date picker)
- Nombre (input text, máx 100 caracteres)
- Activo (checkbox)

**Modos**:
- Crear: todos los campos editables
- Editar nacional: solo activo editable
- Editar empresa: todos los campos editables

### Modal Gestionar Ausencias > Calendario Laboral
**Ubicación**: `app/(dashboard)/hr/horario/ausencias/gestionar-ausencias-modal.tsx`

Tab completo para configurar calendario laboral.

**Secciones**:
1. **Días Laborables**: Checkboxes para L-D
2. **Botón Importar**: Importa festivos nacionales
3. **Festivos**: Toggle entre calendario visual y lista
4. **Guardar**: Guarda días laborables

---

## 🔄 FLUJOS DE USO

### Setup Inicial (Automático)

Cuando se crea una empresa nueva:
1. Sistema crea configuración L-V por defecto
2. Sistema importa festivos nacionales (año actual + próximo)

**TODO**: Implementar en hook de creación de empresa.

### Configuración por HR

1. HR accede a **Horario > Ausencias**
2. Click en **Gestionar Ausencias**
3. Tab **Calendario Laboral**
4. Ajusta días laborables (checkboxes)
5. Click **Importar Calendario Nacional** (si no se hizo automáticamente)
6. Cambia a vista calendario o lista
7. Crea festivos personalizados (click en día o botón)
8. Activa/desactiva festivos según necesidad
9. Click **Guardar Configuración**

### Uso en Cálculos (Automático)

Cuando un empleado solicita ausencia:
1. Sistema obtiene días laborables de empresa
2. Sistema obtiene festivos activos
3. Sistema calcula:
   - Días naturales (todos los días)
   - Días laborables (según config, incluyendo festivos)
   - Días solicitados (laborables - festivos)
4. Muestra resultado al empleado
5. Guarda en BD

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

### Ejemplo 2: Crear Festivo Personalizado

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

### Ejemplo 3: Actualizar Días Laborables

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

### Ejemplo 4: Verificar si un Día es Laborable

```typescript
import { esDiaLaborable } from '@/lib/calculos/dias-laborables';

const fecha = new Date('2025-12-25'); // Navidad
const esLaborable = await esDiaLaborable(fecha, empresaId);
console.log(esLaborable); // false (festivo)
```

---

## 🔍 VALIDACIONES

### Festivos
- ✅ Fecha requerida y válida
- ✅ Nombre requerido (1-100 caracteres)
- ✅ No duplicados (misma empresa + fecha)
- ✅ Solo eliminar tipo 'empresa'
- ✅ Solo HR Admin puede gestionar

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
1. **Hook automático**: Importar festivos al crear empresa
2. **Migración**: Script para empresas existentes sin festivos
3. **Festivos autonómicos**: Expandir a festivos por comunidad autónoma
4. **Festivos locales**: Permitir festivos por ubicación específica

### Mejoras Futuras
1. **Cache**: Cachear días laborables para mejorar performance
2. **Bulk operations**: Importar múltiples festivos personalizados (CSV/Excel)
3. **Plantillas**: Plantillas de festivos por sector (ej: educación, sanidad)
4. **Notificaciones**: Avisar cuando se aproxima un festivo
5. **API externa**: Integrar con API oficial de festivos de España

---

## 📚 REFERENCIAS TÉCNICAS

### Archivos Clave

**Backend**:
- `lib/festivos/importar-nacionales.ts` - Importación de festivos
- `lib/calculos/dias-laborables.ts` - Lógica días laborables
- `lib/validaciones/schemas.ts` - Schemas Zod (festivoCreateSchema, calendarioLaboralUpdateSchema)
- `app/api/festivos/route.ts` - GET, POST festivos
- `app/api/festivos/[id]/route.ts` - GET, PATCH, DELETE
- `app/api/festivos/importar-nacionales/route.ts` - POST importación
- `app/api/empresa/calendario-laboral/route.ts` - GET, PATCH días laborables

**Frontend**:
- `components/hr/calendario-festivos.tsx` - Calendario visual
- `components/hr/lista-festivos.tsx` - Tabla festivos
- `components/hr/editar-festivo-modal.tsx` - Modal crear/editar
- `app/(dashboard)/hr/horario/ausencias/gestionar-ausencias-modal.tsx` - Tab calendario

**Base de Datos**:
- `prisma/schema.prisma` - Modelo Festivo (líneas 310-340)
- Empresa.config.diasLaborables (JSONB)

---

**Última actualización**: 2 Noviembre 2025  
**Estado**: Sistema completo y operativo  
**Versión**: 1.0






