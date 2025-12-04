# Complementos Salariales

## Descripción General

La funcionalidad de complementos salariales permite gestionar retribuciones adicionales al salario base de los empleados. Estos complementos pueden ser de naturaleza fija o variable, y requieren validación antes de ser aplicados a las nóminas.

## Conceptos Clave

### Tipos de Complemento

Los complementos se organizan en un **catálogo de tipos** que define la empresa. Cada tipo de complemento tiene las siguientes características:

- **Nombre**: Identificación del complemento (ej: "Plus transporte", "Plus idiomas")
- **Descripción**: Información adicional opcional
- **Tipo (Fijo/Variable)**:
  - **Fijo**: El complemento tiene una cuantía predefinida. Solo requiere validación de si aplica o no al empleado
  - **Variable**: La cuantía se determina cada vez que se asigna al empleado
- **Importe fijo**: Cantidad predefinida (solo para complementos fijos)
- **Estado**: Activo/Inactivo

### Asignación de Complementos

Cuando se asigna un complemento a un empleado, se crea una **asignación** con:

- **Empleado**: A quién se le asigna
- **Tipo de complemento**: Referencia al catálogo
- **Contrato**: Opcionalmente vinculado a un contrato específico
- **Importe personalizado**: 
  - Para complementos variables: campo obligatorio
  - Para complementos fijos: opcional, permite sobrescribir el importe por defecto
- **Estado de validación**:
  - `validado`: Aprobado por HR/Manager
  - `rechazado`: Rechazado con motivo
  - `pendiente`: Esperando validación

## Modelo de Datos

### Tabla `tipos_complemento`

```prisma
model tipos_complemento {
  id                    String                  @id @default(cuid())
  empresaId             String
  nombre                String                  @db.VarChar(200)
  descripcion           String?
  esImporteFijo         Boolean                 @default(true)
  importeFijo           Decimal?                @db.Decimal(10, 2)
  activo                Boolean                 @default(true)
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  empleado_complementos empleado_complementos[]
  empresa               empresas                @relation(...)
  
  @@index([empresaId, activo])
}
```

### Tabla `empleado_complementos`

```prisma
model empleado_complementos {
  id                       String                     @id @default(cuid())
  empleadoId               String
  tipoComplementoId        String
  contratoId               String?
  importePersonalizado     Decimal?                   @db.Decimal(10, 2)
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
      "esImporteFijo": true,
      "importeFijo": 150.00,
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
  "descripcion": "Complemento por trabajo nocturno",
  "esImporteFijo": true,
  "importeFijo": 200.00
}
```

**Validaciones**:
- Si `esImporteFijo` es `true`, debe incluir `importeFijo`
- `importeFijo` debe ser > 0

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
      "importePersonalizado": 180.00,
      "activo": true,
      "validado": true,
      "validadoPor": "clx...",
      "fechaValidacion": "2025-01-15T10:30:00Z",
      "rechazado": false,
      "tipos_complemento": {
        "id": "clx...",
        "nombre": "Plus transporte",
        "esImporteFijo": true,
        "importeFijo": 150.00
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
  "contratoId": "clx...",  // Opcional
  "importePersonalizado": 180.00  // Obligatorio para variables, opcional para fijos
}
```

**Validaciones**:
- El tipo de complemento debe existir y estar activo
- El contrato debe pertenecer al empleado (si se especifica)
- No puede existir ya el mismo complemento activo
- Si es variable, debe especificar `importePersonalizado`
- El importe debe ser > 0

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
  "importePersonalizado": 200.00,  // Opcional
  "contratoId": "clx...",          // Opcional
  "activo": false                   // Opcional
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
  "esImporteFijo": true,
  "importeFijo": 150.00
}

// 2. HR lo asigna a un empleado
POST /api/empleados/emp123/complementos
{
  "tipoComplementoId": "tipo123"
  // No necesita importePersonalizado, usa el fijo
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
// 1. HR crea el tipo variable
POST /api/tipos-complemento
{
  "nombre": "Plus idiomas",
  "descripcion": "Según número de idiomas",
  "esImporteFijo": false
}

// 2. HR lo asigna con importe específico
POST /api/empleados/emp456/complementos
{
  "tipoComplementoId": "tipo456",
  "importePersonalizado": 200.00  // 2 idiomas x 100€
}

// 3. Validación igual que caso anterior
```

### Caso 3: Sobrescribir Importe Fijo

```typescript
// El tipo tiene importeFijo: 150€
// Pero queremos darle 180€ a un empleado específico

POST /api/empleados/emp789/complementos
{
  "tipoComplementoId": "tipo123",
  "importePersonalizado": 180.00  // Sobrescribe el 150€ fijo
}
```

## Buenas Prácticas

### Para HR Admins

1. **Catálogo limpio**: Mantener tipos activos solo los que se usan
2. **Nombres claros**: Usar nomenclatura consistente (Plus X, Complemento Y)
3. **Validación temprana**: Validar complementos antes del cierre de nómina
4. **Revisión mensual**: Auditar complementos activos vs contratos vigentes

### Para Desarrolladores

1. **Validación de tipos**: Siempre verificar `esImporteFijo` antes de requerir importe
2. **Índices**: Usar los índices de BD para queries eficientes:
   - `[empleadoId, activo]` para complementos de un empleado
   - `[empresaId, activo]` para tipos de la empresa
3. **Transacciones**: Usar transacciones al crear/actualizar múltiples complementos
4. **Soft delete**: Los complementos con asignaciones se desactivan, no se eliminan
5. **Cache**: Considerar cachear el catálogo de tipos (cambia poco)

### Validaciones Obligatorias

```typescript
// ✅ CORRECTO
const tipo = await getTipoComplemento(tipoId);
if (!tipo.esImporteFijo && !importePersonalizado) {
  throw new Error('Importe requerido para complementos variables');
}

// ✅ CORRECTO
if (importePersonalizado && importePersonalizado <= 0) {
  throw new Error('El importe debe ser mayor a 0');
}

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

1. **No hay histórico de cambios**: Los cambios de importe no se registran históricamenteActualmente no existe, pero sería útil para auditoría
3. **Validación individual**: No existe endpoint para validar un solo complemento, solo masivo
4. **Sin periodicidad**: Los complementos no tienen campo de periodicidad (mensual, trimestral, etc.)

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

**Causa común**: Intentar guardar un complemento variable sin especificar `importePersonalizado`

**Solución**: Para complementos con `esImporteFijo: false`, siempre incluir el importe

---

**Última actualización**: 4 de diciembre de 2025  
**Versión**: 1.0  
**Autor**: Sistema Clousadmin


