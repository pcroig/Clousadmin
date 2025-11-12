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

> ℹ️ Desde noviembre 2025 los estados de `EventoNomina` y `Nomina` se sincronizan automáticamente (ver sección **Sincronización automática de estados**).

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

#### 4.1 Generar Pre-nóminas Manualmente
`POST /api/nominas/eventos/[id]/generar-prenominas`

Permite recalcular las pre-nóminas del evento desde la tarjeta del dashboard.

**Cuándo usarlo:**
- Tras crear el evento (si no se generaron automáticamente).
- Para recalcular tras altas/bajas antes de exportar.

**Resultado:**
- Crea pre-nóminas en estado `pre_nomina`.
- Actualiza métricas del evento (empleados, complementos).

#### 4.2 Exportar a Excel
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

#### 4.3 Importar PDFs (CON IA) ⭐
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

#### 4.4 Publicar y Notificar
`POST /api/nominas/eventos/[id]/publicar`

Publica nóminas para que los empleados puedan verlas.

**Proceso:**
1. Valida que todas las nóminas tengan PDF
2. Actualiza estados de nóminas a `publicada` usando utilidades centralizadas
3. Sincroniza el estado del `EventoNomina` con las nóminas publicadas
4. Recalcula estadísticas del evento (empleados con complementos, etc.)
5. Crea notificaciones para todos los empleados

### 5. Asignación de Complementos a Nóminas

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
- Indicador de workflow actual con description tooltip y barra de progreso visual
- Acciones disponibles según estado
- Alertas agregadas por evento (críticas, advertencias, info)
- Botonera fija por evento:
  - Generar pre-nóminas (habilitada en estados iniciales)
  - Marcar complementos listos (actualiza workflow a `lista_exportar`)
  - Exportar Excel / Importar PDFs / Publicar (con tooltips y habilitación contextual)

### 2. Vista de Eventos `/hr/payroll/eventos`
- Lista de eventos mensuales
- Información de cada evento:
  - Mes/Año
  - Nóminas generadas
  - Complementos pendientes
  - Estado actual
- Contador de alertas por severidad
- Acciones por evento:
  - Generar/Recalcular pre-nóminas
  - Marcar complementos como revisados
  - Exportar a Excel
  - Importar PDFs
  - Publicar y notificar
- Tooltip contextual en cada acción y estado de disponibilidad

### 3. Empty State
- Muestra CTA doble: **Generar Evento** o **Subir Nóminas**
- Permanece visible cuando no existen eventos generados

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

### Sincronización Automática de Estados

Desde la refactorización de noviembre 2025 todos los cambios de estado utilizan las utilidades definidas en `lib/calculos/sync-estados-nominas.ts`:

- `sincronizarEstadoEvento(eventoNominaId)` — recalcula el estado del evento a partir de sus nóminas.
- `actualizarEstadoNomina(nominaId, nuevoEstado, extras?)` — actualiza una nómina individual y sincroniza el evento relacionado.
- `actualizarEstadosNominasLote(eventoNominaId, nuevoEstado, extras?)` — actualiza en bloque dentro de transacción.
- `recalcularEstadisticasEvento(eventoNominaId)` — actualiza métricas de complementos y empleados por evento.
- `esTransicionValida(actual, nuevo)` — tabla de transición para proteger workflow.

**Regla:** cualquier endpoint que cambie estados debe usar estas funciones (evita desincronizaciones `EventoNomina` ↔ `Nomina`).

### Alertas de Nómina

- Las alertas (`AlertaNomina`) ahora se consumen directamente en los listados y detalles:
  - API `/api/nominas/eventos` devuelve contadores por severidad.
  - `NominaDetailsClient` muestra lista detallada con CTA de resolución.
- Solo se exponen alertas **no resueltas** para mantener el foco.

### Reportes y Analítica de Nóminas

- Endpoint: `GET /api/nominas/analytics?anio=YYYY`
- Métricas incluidas:
  - Resumen general (bruto, neto, complementos, empleados).
  - Distribución por departamento con min/max/mediana y complementos promedio.
  - Tendencia mensual (bruto, neto, complementos, nº nóminas).
  - Distribución salarial detallada (percentiles y rangos de 10k).
  - Análisis por puesto (total, promedio, min, max, mediana).
  - Top 10 complementos más utilizados (veces, importe total/promedio).
- Todos los cálculos se realizan en memoria evitando N+1 gracias a `include` selectivo.

## Referencias

- Arquitectura IA: `docs/ia/ARQUITECTURA_IA.md`
- Classification Pattern: `lib/ia/patterns/classification.ts`
- Clasificador Nóminas: `lib/ia/clasificador-nominas.ts`
