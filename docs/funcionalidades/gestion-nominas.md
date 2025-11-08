# Gestión de Nóminas

## Descripción General

Sistema completo de gestión de nóminas que permite a HR gestionar el ciclo completo de generación, complementación, exportación e importación de nóminas mensuales para todos los empleados.

## Flujo de Trabajo (Workflow)

El sistema sigue un workflow de 6 estados:

```
generando → complementos_pendientes → lista_exportar → exportada → definitiva → publicada
```

### Estados del Workflow

1. **generando**: Pre-nóminas generándose automáticamente
2. **complementos_pendientes**: Esperando asignación de complementos salariales
3. **lista_exportar**: Lista para exportar a Excel
4. **exportada**: Excel generado y descargado
5. **definitiva**: PDFs definitivos importados desde gestoría
6. **publicada**: Nóminas visibles para empleados

### Sincronización Automática de Estados (Novedad 2025-11-08)

- ✅ Se ha introducido `sincronizarEstadoEvento()` en `lib/calculos/sync-estados-nominas.ts`, responsable de mantener alineados los estados de `EventoNomina` y de cada `Nomina`.
- ✅ Todas las mutaciones relevantes (`exportar`, `importar`, `publicar`) invocan ahora funciones centralizadas (`actualizarEstadoNomina`, `actualizarEstadosNominasLote`).
- ✅ Las transiciones inválidas quedan bloqueadas mediante `esTransicionValida()`.
- ✅ El evento sólo avanza a `definitiva` cuando **todas** las nóminas están definitivas, evitando desincronizaciones históricas entre evento y nóminas individuales.

> 🔎 Referencia técnica: `lib/calculos/sync-estados-nominas.ts`

## Componentes Principales

### 1. Tipos de Complemento

Catálogo de complementos salariales que pueden asignarse a empleados.

**Endpoints:**
- `GET /api/tipos-complemento` - Listar tipos
- `POST /api/tipos-complemento` - Crear tipo
- `PATCH /api/tipos-complemento/[id]` - Actualizar
- `DELETE /api/tipos-complemento/[id]` - Desactivar

**Campos:**
- `nombre`: Nombre del complemento
- `descripcion`: Descripción opcional
- `importeFijo`: Importe fijo (null si es variable)
- `periodicidad`: 'mensual' | 'anual'
- `tributableIRPF`: Boolean
- `tributableSS`: Boolean

### 2. Complementos de Empleado

Asignación de complementos a empleados específicos.

**Endpoints:**
- `GET /api/empleados/[id]/complementos` - Listar complementos del empleado
- `POST /api/empleados/[id]/complementos` - Asignar complemento
- `PATCH /api/empleados/[id]/complementos/[complementoId]` - Actualizar
- `DELETE /api/empleados/[id]/complementos/[complementoId]` - Desactivar/eliminar

### 3. Eventos de Nómina

Agrupa todas las nóminas de un mes específico.

**Endpoints:**
- `GET /api/nominas/eventos` - Listar eventos
- `POST /api/nominas/eventos` - Crear evento mensual (genera pre-nóminas)
- `GET /api/nominas/eventos/[id]` - Detalle del evento
- `PATCH /api/nominas/eventos/[id]` - Actualizar evento

### 4. Workflow Actions

#### 4.1 Exportar a Excel
`GET /api/nominas/eventos/[id]/exportar`

Genera archivo Excel con todas las pre-nóminas para enviar a gestoría.

**Columnas del Excel:**
- Datos del empleado (nombre, apellidos, NIF, NSS)
- Datos del contrato (tipo, fecha inicio/fin)
- Salario base
- Complementos (cada uno en columna separada)
- Totales (bruto, deducciones, neto)

**Respuesta:**
- Archivo Excel descargable
- Estado del evento actualizado a `exportada`

#### 4.2 Importar PDFs (CON IA) ⭐
`POST /api/nominas/eventos/[id]/importar`

Importa PDFs de nóminas definitivas desde la gestoría.

**Características:**
- **Clasificación inteligente con IA**: Usa el Classification Pattern para matching automático de archivo → empleado
- **Fallback automático**: Si no hay IA disponible, usa matching básico por strings
- **2 modos de operación**:
  - **Auto**: Clasifica automáticamente por nombre del archivo (IA)
  - **Explicit**: Usuario especifica empleadoId para cada archivo

**Request (FormData):**
```typescript
files: File[]           // PDFs de nóminas
mode: 'auto' | 'explicit'  // Modo de clasificación
employeeId_0: string    // Solo en modo explicit
employeeId_1: string    // Solo en modo explicit
// ...
```

**Proceso:**
1. Valida que sean PDFs
2. Para cada archivo:
   - **Modo Auto**: Llama a `clasificarNomina()` con IA
   - **Modo Explicit**: Usa empleadoId proporcionado
3. Sube PDF a S3
4. Crea registro de documento
5. Vincula documento a nómina
6. Actualiza estado a `definitiva`

**Ejemplo de uso del clasificador IA:**
```typescript
const empleadosCandidatos = evento.nominas.map((n) => ({
  id: n.empleadoId,
  nombre: n.empleado.nombre,
  apellidos: n.empleado.apellidos,
}));

const matchResult = await clasificarNomina(filename, empleadosCandidatos);

if (matchResult.empleado && matchResult.autoAssigned) {
  // Match con >= 75% confianza
  console.log(`Match: ${matchResult.empleado.nombre} (${matchResult.confidence}%)`);
} else {
  // Match ambiguo, mostrar candidatos
  const candidatos = matchResult.candidates.slice(0, 3);
}
```

**Respuesta:**
```json
{
  "importadas": 10,
  "errores": 0,
  "resultados": [
    {
      "empleado": "Juan García López",
      "archivo": "nomina_juan_garcia.pdf",
      "documentoId": "uuid",
      "status": "success"
    }
  ],
  "errores": [],
  "eventoCompleto": true
}
```

#### 4.3 Publicar y Notificar
`POST /api/nominas/eventos/[id]/publicar`

Publica nóminas para que los empleados puedan verlas.

**Proceso:**
1. Valida que todas las nóminas tengan PDF
2. Actualiza estado a `publicada`
3. Crea notificaciones para todos los empleados
4. Envía emails con enlace a `/empleado/mis-nominas`

### 5. Detalle de Nómina Individual

- Ubicación: `/hr/payroll/nominas/[id]`
- Se ha añadido un **bloque destacado de alertas** con orden de severidad (Crítico → Advertencia → Info) y CTA opcional `Resolver`.
- Muestra datos completos de empleado, período, compensación, incidencias y estado del documento PDF.
- Cada alerta incluye categoría, código y detalles estructurados cuando están disponibles.

### 6. Asignación de Complementos a Nóminas

Permite asignar complementos específicos a nóminas individuales.

**Endpoints:**
- `GET /api/nominas/[id]/complementos` - Ver complementos de una nómina
- `POST /api/nominas/[id]/complementos` - Asignar complemento(s)
- `PATCH /api/nominas/[id]/complementos/[asignacionId]` - Actualizar importe
- `DELETE /api/nominas/[id]/complementos/[asignacionId]` - Eliminar

**Lógica:**
- Recalcula totales automáticamente
- Actualiza estado si quedan complementos pendientes
- Soporta asignación múltiple en una sola petición

## Interfaz de Usuario

### 1. Vista Principal `/hr/payroll`
- Selector de mes/año
- Botón "Generar Evento Mensual"
- **Chip de estado con tooltip contextual** (muestra descripción de cada fase del workflow)
- **Barra de progreso visual** que marca etapas completadas vs pendientes
- **Badges de alertas activas** (críticas, advertencias, info) por evento
- Acciones disponibles según estado (cada botón incluye tooltip explicativo)

### 2. Vista de Eventos `/hr/payroll/eventos`
- Lista de eventos mensuales
- Información de cada evento:
  - Mes/Año
  - Nóminas generadas
  - Complementos pendientes
  - Estado actual (tooltip descriptivo + progreso visual)
  - **Alertas activas** desglosadas por criticidad (critico/advertencia/info)
- Acciones por evento:
  - Exportar a Excel (tooltip "enviar a gestoría")
  - Importar PDFs (tooltip "subir definitivas")
  - Publicar y notificar (tooltip "avisar empleados")

## Modelo de Datos

### TipoComplemento
```prisma
model TipoComplemento {
  id              String   @id @default(uuid())
  empresaId       String
  nombre          String
  descripcion     String?
  importeFijo     Decimal?
  periodicidad    String   // 'mensual' | 'anual'
  tributableIRPF  Boolean
  tributableSS    Boolean
  activo          Boolean  @default(true)
}
```

### EmpleadoComplemento
```prisma
model EmpleadoComplemento {
  id                   String   @id @default(uuid())
  empleadoId           String
  tipoComplementoId    String
  contratoId           String?
  importePersonalizado Decimal?
  fechaAsignacion      DateTime @default(now())
  activo               Boolean  @default(true)
}
```

### EventoNomina
```prisma
model EventoNomina {
  id                String   @id @default(uuid())
  empresaId         String
  mes               Int
  anio              Int
  estado            String   // workflow states
  nominasGeneradas  Int      @default(0)
  complementosPendientes Int @default(0)
  creadoPor         String
  fechaCreacion     DateTime @default(now())
}
```

### Nomina
```prisma
model Nomina {
  id                String   @id @default(uuid())
  empleadoId        String
  contratoId        String?
  eventoNominaId    String?
  mes               Int
  anio              Int
  salarioBase       Decimal
  totalComplementos Decimal  @default(0)
  totalDeducciones  Decimal  @default(0)
  totalBruto        Decimal
  totalNeto         Decimal
  estado            String   // workflow states
  documentoId       String?  @unique
  complementosPendientes Boolean @default(false)
  empleadoVisto     Boolean  @default(false)
  fechaVisto        DateTime?
  fechaPublicacion  DateTime?
  subidoPor         String?
}
```

### AsignacionComplemento
```prisma
model AsignacionComplemento {
  id                    String   @id @default(uuid())
  nominaId              String
  empleadoComplementoId String
  importe               Decimal
  asignadoPor           String
  fechaAsignacion       DateTime @default(now())
  notas                 String?

  @@unique([nominaId, empleadoComplementoId])
}
```

## Integración con IA

### Clasificador de Nóminas

Ubicación: `lib/ia/clasificador-nominas.ts`

**Características:**
- Usa Classification Pattern de la arquitectura IA
- Soporta OpenAI y Anthropic
- Fallback automático a matching básico
- Confianza threshold: 75%
- Top-K candidatos: 5

**Flujo:**
1. Recibe filename y lista de empleados
2. Si hay IA disponible:
   - Llama a `classify()` con instrucciones específicas
   - Obtiene match con confianza
3. Si no hay IA:
   - Usa `matchBasic()` con comparación de strings
   - Normaliza acentos y caracteres especiales

**Logs:**
```
[Clasificador Nóminas] nomina_juan_garcia.pdf → Juan García López (87% confianza) usando openai
```

## Ejemplo de Uso Completo

### 1. Crear Evento Mensual
```typescript
POST /api/nominas/eventos
{
  "mes": 1,
  "anio": 2025
}
// Genera pre-nóminas para todos los empleados activos
```

### 2. Asignar Complementos (Opcional)
```typescript
POST /api/nominas/[nominaId]/complementos
{
  "complementos": [
    {
      "empleadoComplementoId": "uuid",
      "importe": 150.00,
      "notas": "Plus transporte enero"
    }
  ]
}
```

### 3. Exportar a Excel
```typescript
GET /api/nominas/eventos/[eventoId]/exportar
// Descarga nominas_enero_2025.xlsx
```

### 4. Importar PDFs con IA
```typescript
const formData = new FormData();
formData.append('files', file1); // nomina_juan_garcia.pdf
formData.append('files', file2); // nomina_maria_lopez.pdf
formData.append('mode', 'auto');

POST /api/nominas/eventos/[eventoId]/importar
// IA clasifica automáticamente cada PDF
```

### 5. Publicar
```typescript
POST /api/nominas/eventos/[eventoId]/publicar
// Notifica a todos los empleados
```

## Permisos

- **hr_admin**: Acceso completo
- **platform_admin**: Acceso completo
- **manager**: Puede ver y asignar complementos
- **empleado**: Solo puede ver sus propias nóminas publicadas

## Notas Técnicas

### Next.js 16 Compatibility
Todos los endpoints usan async params:
```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

### Seguridad
- Validación con Zod en todos los endpoints
- Verificación de pertenencia a empresa
- Estados del workflow protegen contra acciones inválidas
- PDFs almacenados en S3 con keys únicas

### Performance
- Cálculos de totales optimizados con Decimal
- Transacciones para operaciones complejas
- Índices en campos frecuentes (empleadoId, eventoNominaId)

## Referencias

- Arquitectura IA: `docs/ia/ARQUITECTURA_IA.md`
- Classification Pattern: `lib/ia/patterns/classification.ts`
- Clasificador Nóminas: `lib/ia/clasificador-nominas.ts`
