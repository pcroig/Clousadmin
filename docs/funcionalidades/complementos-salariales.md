# Complementos Salariales

## Descripción General

La funcionalidad de complementos salariales permite gestionar retribuciones adicionales al salario base de los empleados. Estos complementos pueden ser de naturaleza fija o variable, y requieren validación antes de ser aplicados a las nóminas.

## Conceptos Clave

### Tipos de Complemento

Los complementos se organizan en un **catálogo de tipos** que define la empresa. Cada tipo de complemento tiene las siguientes características:

- **Nombre**: Identificación del complemento (ej: "Plus transporte", "Plus idiomas")
- **Descripción**: Información adicional opcional
- **Estado**: Activo/Inactivo

> **Nota importante (Actualización Dic 2025)**: Los tipos de complemento ya NO almacenan la modalidad (fijo/variable) ni el importe. Estos campos se definen individualmente para cada empleado al asignar el complemento.

### Asignación de Complementos

Cuando se asigna un complemento a un empleado, se crea una **asignación** con:

- **Empleado**: A quién se le asigna
- **Tipo de complemento**: Referencia al catálogo (solo nombre/descripción)
- **Modalidad (Fijo/Variable)**: 
  - **Fijo** (`esImporteFijo: true`): El importe se mantiene constante mes a mes
  - **Variable** (`esImporteFijo: false`): El importe puede cambiar y requiere validación cada período
- **Importe**: Campo obligatorio, define la cuantía mensual del complemento
- **Contrato**: Opcionalmente vinculado a un contrato específico
- **Estado de validación**:
  - `validado`: Aprobado por HR/Manager
  - `rechazado`: Rechazado con motivo
  - `pendiente`: Esperando validación (complementos variables con importe 0)

## Modelo de Datos

### Tabla `tipos_complemento`

```prisma
model tipos_complemento {
  id                    String                  @id @default(cuid())
  empresaId             String
  nombre                String                  @db.VarChar(200)
  descripcion           String?
  activo                Boolean                 @default(true)
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  empleado_complementos empleado_complementos[]
  empresa               empresas                @relation(...)
  
  @@index([empresaId, activo])
}
```

**Cambios importantes**:
- ❌ Eliminado: `esImporteFijo` y `importeFijo`
- ✅ Solo almacena: nombre, descripción, y estado activo/inactivo
- 📌 La modalidad y el importe se definen por empleado, no por tipo

### Tabla `empleado_complementos`

```prisma
model empleado_complementos {
  id                       String                     @id @default(cuid())
  empleadoId               String
  tipoComplementoId        String
  contratoId               String?
  esImporteFijo            Boolean                    @default(true)
  importePersonalizado     Decimal                    @db.Decimal(10, 2)
  activo                   Boolean                    @default(true)
  validado                 Boolean                    @default(false)
  validadoPor              String?
  fechaValidacion          DateTime?
  rechazado                Boolean                    @default(false)
  motivoRechazo            String?
  createdAt                DateTime                   @default(now())
  updatedAt                DateTime                   @updatedAt
  asignaciones_complemento asignaciones_complemento[]
  contrato                 contratos?                 @relation(...)
  empleado                 empleados                  @relation(...)
  tipos_complemento        tipos_complemento          @relation(...)
  
  @@index([contratoId])
  @@index([empleadoId, activo])
  @@index([tipoComplementoId])
}
```

**Cambios importantes**:
- ✅ Nuevo: `esImporteFijo` (Boolean, default true) - Define si el complemento es fijo o variable
- ✅ Modificado: `importePersonalizado` ahora es NOT NULL - Todo complemento debe tener un importe definido
- 📌 Un complemento variable con importe 0 indica que está pendiente de asignación

## APIs

### Gestión del Catálogo de Tipos

#### GET `/api/tipos-complemento`

Lista todos los tipos de complemento de la empresa.

**Autenticación**: HR Admin / Platform Admin

**Query params**:
- `incluirInactivos`: (opcional) `true` para incluir tipos inactivos

**Respuesta**:
```json
{
  "tipos": [
    {
      "id": "clx...",
      "nombre": "Plus transporte",
      "descripcion": "Compensación por desplazamiento",
      "activo": true,
      "_count": {
        "empleado_complementos": 25
      }
    }
  ]
}
```

#### POST `/api/tipos-complemento`

Crea un nuevo tipo de complemento.

**Autenticación**: HR Admin / Platform Admin

**Body**:
```json
{
  "nombre": "Plus nocturnidad",
  "descripcion": "Complemento por trabajo nocturno"
}
```

**Validaciones**:
- `nombre` es obligatorio (max 200 caracteres)
- `descripcion` es opcional

### Gestión de Complementos del Empleado

#### GET `/api/empleados/[id]/complementos`

Lista todos los complementos asignados a un empleado.

**Autenticación**: HR Admin / Platform Admin

**Query params**:
- `incluirInactivos`: (opcional) `true` para incluir complementos inactivos

**Respuesta**:
```json
{
  "complementos": [
    {
      "id": "clx...",
      "empleadoId": "clx...",
      "tipoComplementoId": "clx...",
      "esImporteFijo": true,
      "importePersonalizado": 180.00,
      "activo": true,
      "validado": true,
      "validadoPor": "clx...",
      "fechaValidacion": "2025-01-15T10:30:00Z",
      "rechazado": false,
      "tipos_complemento": {
        "id": "clx...",
        "nombre": "Plus transporte",
        "descripcion": "Compensación por desplazamiento"
      },
      "contrato": {
        "id": "clx...",
        "fechaInicio": "2024-01-01",
        "fechaFin": null
      },
      "_count": {
        "asignaciones_complemento": 12
      }
    }
  ]
}
```

#### POST `/api/empleados/[id]/complementos`

Asigna un complemento a un empleado.

**Autenticación**: HR Admin / Platform Admin

**Body**:
```json
{
  "tipoComplementoId": "clx...",
  "contratoId": "clx...",      // Opcional
  "esImporteFijo": true,        // Obligatorio: define si es fijo o variable
  "importe": 180.00             // Obligatorio: cuantía mensual del complemento
}
```

**Validaciones**:
- El tipo de complemento debe existir y estar activo
- El contrato debe pertenecer al empleado (si se especifica)
- No puede existir ya el mismo complemento activo
- `esImporteFijo` es obligatorio (true = fijo, false = variable)
- `importe` es obligatorio y debe ser > 0

**Respuesta**:
```json
{
  "complemento": { /* objeto del complemento creado */ }
}
```

#### PATCH `/api/empleados/[id]/complementos/[complementoId]`

Actualiza un complemento existente.

**Autenticación**: HR Admin / Platform Admin

**Body**:
```json
{
  "importePersonalizado": 200.00,  // Opcional: actualizar el importe
  "esImporteFijo": false,           // Opcional: cambiar modalidad fijo/variable
  "contratoId": "clx...",           // Opcional: vincular a otro contrato
  "activo": false                   // Opcional: activar/desactivar
}
```

#### DELETE `/api/empleados/[id]/complementos/[complementoId]`

Elimina o desactiva un complemento.

**Autenticación**: HR Admin / Platform Admin

**Comportamiento**:
- Si el complemento tiene asignaciones en nóminas: **se desactiva**
- Si no tiene asignaciones: **se elimina físicamente**

**Respuesta**:
```json
{
  "message": "Complemento desactivado (tiene asignaciones en nóminas)",
  "desactivado": true
}
```

### Validación de Complementos en Nóminas

#### POST `/api/nominas/eventos/[id]/validar-complementos`

Valida o rechaza complementos de forma masiva para un evento de nómina.

**Autenticación**: HR Admin / Platform Admin / Manager (solo de su equipo)

**Body**:
```json
{
  "complementoIds": ["clx...", "clx..."],
  "accion": "validar",  // "validar" | "rechazar"
  "motivoRechazo": "Complemento no procedente"  // Obligatorio si accion="rechazar"
}
```

**Validaciones**:
- Los managers solo pueden validar complementos de empleados de su equipo
- Si se rechaza, debe incluir motivo

**Respuesta**:
```json
{
  "success": true,
  "complementosActualizados": 2,
  "accion": "validar"
}
```

#### GET `/api/nominas/eventos/[id]/complementos-pendientes`

Obtiene los complementos pendientes de validación para un evento.

**Autenticación**: HR Admin / Platform Admin / Manager

**Respuesta**:
```json
{
  "complementos": [ /* lista de complementos */ ],
  "stats": {
    "total": 50,
    "validados": 30,
    "pendientes": 15,
    "rechazados": 5,
    "variables": 8
  }
}
```

## Flujo de Trabajo

### 1. Configuración Inicial (HR Admin)

1. Acceder a `/hr/configuracion/complementos` (o crear esta sección)
2. Crear tipos de complemento:
   - Definir si es fijo o variable
   - Establecer importe (si es fijo)
   - Activar/desactivar según necesidad

### 2. Asignación a Empleados (HR Admin)

**Desde el espacio de empleados**:

1. Navegar a `/empleado/mi-espacio/contratos` o `/hr/organizacion/personas/[id]`
2. En la sección "Salario" > "Complementos"
3. Clic en "Añadir"
4. Seleccionar tipo de complemento del catálogo
5. Si es variable o se quiere sobrescribir: especificar importe
6. Guardar

**Estados del complemento**:
- ✅ **Creado**: El complemento se crea con `validado=false`
- ⏳ **Pendiente**: Aparece con badge amarillo "Pendiente validación"
- ✓ **Validado**: Badge verde, listo para nóminas
- ✗ **Rechazado**: Badge rojo, no se aplica

### 3. Validación (HR Admin / Manager)

**Proceso de validación antes de nómina**:

1. Al generar un evento de nómina, el sistema detecta complementos pendientes
2. Se genera una alerta en el dashboard de nóminas
3. HR o Manager accede al diálogo de validación:
   - Ver listado de todos los complementos pendientes
   - Filtrar por estado, empleado, tipo
   - Seleccionar uno o varios
   - Validar en masa o rechazar con motivo
4. Los complementos validados se incluyen automáticamente en nóminas

**Desde el componente ValidarComplementosDialog**:
- Búsqueda por empleado o tipo
- Filtros: todos, pendientes, validados, rechazados, variables
- Selección múltiple con checkboxes
- Acciones: Validar o Rechazar seleccionados
- Estadísticas en tiempo real

### 4. Aplicación en Nóminas

Los complementos validados se aplican automáticamente en:
- **Cálculo de nómina mensual**: Se suman al salario base
- **Asignaciones en eventos**: Se crean `asignaciones_complemento`
- **Reportes y analytics**: Incluidos en análisis de compensación

## Interfaz de Usuario

### Componente ContratosTab

**Ubicación**: `components/shared/mi-espacio/contratos-tab.tsx`

**Funcionalidades**:
- ✅ Listar complementos del empleado con badges de estado
- ✅ Añadir nuevos complementos (HR only)
- ✅ Selector inteligente de tipos (muestra Fijo/Variable)
- ✅ Pre-carga importe para complementos fijos
- ✅ Validación de campos según tipo
- ✅ Eliminar complementos con confirmación
- ✅ Indicador de tipo (Fijo/Variable)
- ✅ Badge de validación (Pendiente/Validado/Rechazado)

**Estados visuales**:
```tsx
// Complemento fijo validado
<Badge>Fijo</Badge>
<Badge className="bg-green-100">Validado</Badge>

// Complemento variable pendiente
<Badge>Variable</Badge>
<Badge className="bg-yellow-100">Pendiente validación</Badge>
```

### Diálogo ValidarComplementosDialog

**Ubicación**: `components/payroll/validar-complementos-dialog.tsx`

**Características**:
- Vista de tabla con todos los complementos
- Estadísticas: Total, Validados, Pendientes, Rechazados, Variables
- Búsqueda por empleado o tipo de complemento
- Filtros rápidos por estado
- Selección múltiple con checkboxes
- Acciones masivas: Validar/Rechazar
- Modal de rechazo para especificar motivo
- Actualización en tiempo real

## Integración con Nóminas

### Alertas de Validación

En el módulo de validación de nóminas (`lib/validaciones/nominas.ts`), se genera una alerta si hay complementos pendientes:

```typescript
const complementosPendientes = await prisma.empleado_complementos.count({
  where: {
    empleadoId,
    activo: true,
    validado: false,
    rechazado: false,
  },
});

if (complementosPendientes > 0) {
  alertas.push({
    tipo: 'advertencia',
    categoria: 'datos_faltantes',
    codigo: 'COMPLEMENTOS_PENDIENTES',
    mensaje: `${complementosPendientes} complemento(s) pendientes de validar`,
    accionUrl: `/hr/organizacion/personas/${empleadoId}?tab=complementos`,
  });
}
```

### Proceso de Generación de Nóminas

1. **Pre-validación**: Se revisan complementos pendientes
2. **Alertas**: Se notifica a HR sobre complementos sin validar
3. **Validación**: HR/Manager valida los complementos
4. **Cálculo**: Solo complementos validados se incluyen en nóminas
5. **Asignaciones**: Se crean `asignaciones_complemento` para el registro

## Notificaciones

El sistema genera notificaciones automáticas:

### Al asignar complemento (crearNotificacionComplementoAsignado)

**Destinatarios**: 
- Empleado
- Manager del empleado

**Mensaje**: "Se te ha asignado el complemento [nombre] por [importe]€"

### Al validar complementos (crearNotificacionNominaValidada)

**Destinatarios**:
- HR Admin de la empresa
- Empleados afectados

**Mensaje**: "[Validador] ha validado [X] complementos para el evento de nómina"

## Casos de Uso Comunes

### Caso 1: Plus de Transporte Fijo

```typescript
// 1. HR crea el tipo
POST /api/tipos-complemento
{
  "nombre": "Plus transporte",
  "descripcion": "Compensación por desplazamiento"
}

// 2. HR lo asigna a un empleado con modalidad fija
POST /api/empleados/emp123/complementos
{
  "tipoComplementoId": "tipo123",
  "esImporteFijo": true,    // Modalidad fija
  "importe": 150.00         // Importe mensual
}

// 3. HR valida el complemento
POST /api/nominas/eventos/evento123/validar-complementos
{
  "complementoIds": ["comp123"],
  "accion": "validar"
}
```

### Caso 2: Plus Variable por Idiomas

```typescript
// 1. HR crea el tipo
POST /api/tipos-complemento
{
  "nombre": "Plus idiomas",
  "descripcion": "Según número de idiomas"
}

// 2. HR lo asigna con modalidad variable e importe inicial 0 (pendiente)
POST /api/empleados/emp456/complementos
{
  "tipoComplementoId": "tipo456",
  "esImporteFijo": false,   // Modalidad variable
  "importe": 0              // Pendiente de asignación
}

// 3. Posteriormente se actualiza el importe
PATCH /api/empleados/emp456/complementos/comp456
{
  "importePersonalizado": 200.00  // 2 idiomas x 100€
}

// 4. HR valida el complemento
POST /api/nominas/eventos/evento123/validar-complementos
{
  "complementoIds": ["comp456"],
  "accion": "validar"
}
```

### Caso 3: Mismo tipo, diferentes importes por empleado

```typescript
// El mismo tipo "Plus transporte" puede tener importes diferentes

// Empleado 1: Plus fijo de 150€
POST /api/empleados/emp789/complementos
{
  "tipoComplementoId": "tipo123",
  "esImporteFijo": true,
  "importe": 150.00
}

// Empleado 2: Plus fijo de 180€ (distancia mayor)
POST /api/empleados/emp790/complementos
{
  "tipoComplementoId": "tipo123",
  "esImporteFijo": true,
  "importe": 180.00
}
```

## Buenas Prácticas

### Para HR Admins

1. **Catálogo limpio**: Mantener tipos activos solo los que se usan
2. **Nombres claros**: Usar nomenclatura consistente (Plus X, Complemento Y)
3. **Validación temprana**: Validar complementos antes del cierre de nómina
4. **Revisión mensual**: Auditar complementos activos vs contratos vigentes

### Para Desarrolladores

1. **Tipos simplificados**: Los tipos de complemento solo almacenan nombre/descripción
2. **Modalidad por empleado**: `esImporteFijo` se define al asignar, no en el tipo
3. **Importe obligatorio**: Todos los complementos deben tener `importePersonalizado` (NOT NULL)
4. **Índices**: Usar los índices de BD para queries eficientes:
   - `[empleadoId, activo]` para complementos de un empleado
   - `[empresaId, activo]` para tipos de la empresa
5. **Transacciones**: Usar transacciones al crear/actualizar múltiples complementos
6. **Soft delete**: Los complementos con asignaciones se desactivan, no se eliminan
7. **Cache**: Considerar cachear el catálogo de tipos (cambia poco)

### Validaciones Obligatorias

```typescript
// ✅ CORRECTO - Validar importe obligatorio
const AsignarComplementoSchema = z.object({
  tipoComplementoId: z.string().cuid(),
  contratoId: z.string().cuid().optional(),
  esImporteFijo: z.boolean(),
  importe: z.number().positive(),
});

// ✅ CORRECTO - Detectar complementos variables pendientes
const complementosPendientes = empleado.complementos.some(
  (comp) => !comp.esImporteFijo && Number(comp.importePersonalizado) === 0
);

// ✅ CORRECTO - No duplicar complementos activos
const existente = await prisma.empleado_complementos.findFirst({
  where: {
    empleadoId,
    tipoComplementoId,
    activo: true,
  },
});
if (existente) {
  throw new Error('Este complemento ya está asignado');
}
```

## Seguridad y Permisos

| Acción | HR Admin | Platform Admin | Manager | Empleado |
|--------|----------|----------------|---------|----------|
| Ver catálogo tipos | ✅ | ✅ | ❌ | ❌ |
| Crear tipo complemento | ✅ | ✅ | ❌ | ❌ |
| Asignar complemento | ✅ | ✅ | ❌ | ❌ |
| Ver complementos empleado | ✅ | ✅ | ✅ (su equipo) | ✅ (propios) |
| Validar complementos | ✅ | ✅ | ✅ (su equipo) | ❌ |
| Eliminar complemento | ✅ | ✅ | ❌ | ❌ |

## Limitaciones Conocidas

1. **No hay histórico de cambios**: Los cambios de importe no se registran históricamente
2. **Sin auditoría de cambios**: Actualmente no existe, pero sería útil para auditoría
3. **Validación individual**: No existe endpoint para validar un solo complemento, solo masivo
4. **Sin periodicidad**: Los complementos no tienen campo de periodicidad (mensual, trimestral, etc.)
5. **Un solo complemento activo por tipo**: No se puede asignar el mismo tipo dos veces a un empleado (aunque con importes diferentes)

## Roadmap Futuro

- [ ] Histórico de cambios de complementos
- [ ] Validación automática basada en reglas
- [ ] Complementos con vigencia temporal
- [ ] Complementos condicionados (ej: solo si horas trabajadas > X)
- [ ] Exportación de complementos a Excel
- [ ] Dashboard de analytics de complementos
- [ ] Aprobar complementos desde notificaciones

## Troubleshooting

### El complemento no aparece en mi nómina

**Solución**: Verificar que:
1. El complemento esté `activo: true`
2. El complemento esté `validado: true`
3. El contrato esté vigente en el período de la nómina

### No puedo eliminar un complemento

**Causa**: El complemento tiene asignaciones en nóminas generadas

**Solución**: El sistema lo desactiva automáticamente. No se puede eliminar físicamente para mantener integridad de datos históricos.

### El selector no muestra tipos de complemento

**Causas posibles**:
1. No hay tipos creados para la empresa
2. Los tipos están inactivos
3. Error de permisos (no HR)

**Solución**: Verificar en `/api/tipos-complemento` que existan tipos activos

### Error "Datos inválidos" al guardar

**Causa común**: No especificar `esImporteFijo` o `importe` al crear un complemento

**Solución**: Ambos campos son obligatorios al asignar un complemento a un empleado

### El complemento muestra "Pendiente" aunque esté asignado

**Causa**: Es un complemento variable (`esImporteFijo: false`) con `importePersonalizado: 0`

**Solución**: Actualizar el importe del complemento mediante PATCH antes de validarlo

---

**Última actualización**: 7 de diciembre de 2025  
**Versión**: 2.0 (Actualización: Desacoplamiento de modalidad e importe del tipo)  
**Autor**: Sistema Clousadmin






