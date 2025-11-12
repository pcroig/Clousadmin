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
- `GET /api/nominas/eventos/[id]` - Detalle del evento con nóminas, alertas y estadísticas
- `PATCH /api/nominas/eventos/[id]` - Actualizar evento

**GET /api/nominas/eventos/[id] - Respuesta mejorada:**
```json
{
  "evento": {
    "id": "uuid",
    "mes": 1,
    "anio": 2025,
    "estado": "complementos_pendientes",
    "nominas": [
      {
        "id": "uuid",
        "empleado": {
          "id": "uuid",
          "nombre": "Juan",
          "apellidos": "García",
          "email": "juan@example.com",
          "fotoUrl": "https://..."
        },
        "estado": "pre_nomina",
        "salarioBase": 2500.00,
        "totalComplementos": 150.00,
        "complementosPendientes": true,
        "complementosAsignados": [...],
        "alertas": [
          {
            "id": "uuid",
            "tipo": "critico",
            "mensaje": "Sin IBAN configurado",
            "codigo": "NO_IBAN"
          }
        ]
      }
    ]
  },
  "stats": {
    "totalNominas": 50,
    "nominasConAlertas": 5,
    "nominasConComplementosPendientes": 10,
    "alertasCriticas": 3,
    "alertasAdvertencias": 8,
    "alertasInformativas": 2
  }
}
```

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

#### 4.3 Subida Directa de PDFs (Sin Evento) ⭐ NUEVO
`POST /api/nominas/upload`

Permite subir PDFs directamente sin generar evento previo. Útil para empresas que no usan gestoría externa.

**Request (FormData):**
```typescript
nominas: File[]      // PDFs de nóminas
mes: number          // 1-12
anio: number         // 2020-2100
```

**Proceso:**
1. Valida que sean PDFs
2. Procesa cada archivo con IA para matching automático
3. Devuelve `sessionId` y resultados de matching
4. Usuario revisa asignaciones en UI
5. Confirmación con `POST /api/nominas/confirmar-upload` crea nóminas en estado `definitiva`

**Respuesta:**
```json
{
  "sessionId": "uuid",
  "stats": {
    "total": 10,
    "autoAssigned": 8,
    "needsReview": 2
  },
  "results": [
    {
      "filename": "nomina_juan_garcia.pdf",
      "empleado": {
        "id": "uuid",
        "nombre": "Juan",
        "apellidos": "García"
      },
      "confidence": 87,
      "autoAssigned": true
    }
  ]
}
```

### 4.4 Importar PDFs (CON IA) ⭐
`POST /api/nominas/eventos/[id]/importar`

Importa PDFs de nóminas definitivas desde la gestoría (flujo con evento previo).

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

#### 4.5 Confirmar Upload Directo
`POST /api/nominas/confirmar-upload`

Confirma y crea nóminas desde la sesión de upload directo.

**Request:**
```typescript
{
  sessionId: string,
  confirmaciones: Array<{
    filename: string,
    empleadoId: string | null
  }>
}
```

**Proceso:**
1. Valida sesión activa
2. Crea nóminas en estado `definitiva` para cada confirmación
3. Sube PDFs a S3 y crea documentos
4. Vincula documentos a nóminas
5. Retorna resumen de nóminas creadas

#### 4.6 Publicar y Notificar
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

**Header:**
- Título "Nóminas" con descripción
- Botones de acción:
  - **Subir Nóminas**: Subida directa de PDFs sin generar evento (flujo alternativo)
  - **Generar Evento Mensual**: Crea evento y genera pre-nóminas automáticamente

**Lista de Eventos (Cards Clickeables):**

Cada card es **completamente clickeable** y muestra un preview básico:

**Información visible en la card (`className="p-5"`):**
- **Período**: Mes y año (ej: "Enero 2025")
- **Estado**: Badge con color según estado del workflow
- **Número de nóminas**: Contador de nóminas generadas
- **Preview de alertas**: Badges compactos con conteo:
  - 🔴 Críticas (rojo)
  - 🟠 Advertencias (naranja)
  - 🔵 Informativas (azul)

**Botones de acción dentro de la card:**
- **Generar Pre-nóminas**: Visible si `!fechaGeneracion` (evento sin pre-nóminas)
- **Importar Nóminas**: Visible si `fechaGeneracion && !fechaImportacion` (pre-nóminas generadas pero sin importar)
- **Rellenar Complementos**: Visible si `fechaGeneracion && !fechaImportacion` (mismo estado que importar)
- Todos los botones usan `stopPropagation()` para no activar el click de la card

**Comportamiento:**
- Click en cualquier parte de la card → Abre `EventoDetailsPanel` (panel lateral)
- Click en botones de acción → Ejecuta acción sin abrir panel

**Empty State:**
- Mensaje informativo
- CTAs: **Generar Evento** o **Subir Nóminas**

### 2. EventoDetailsPanel (Panel Lateral) ⭐

Panel lateral que se abre al hacer click en una card de evento.

**Header del Panel:**
- Título: "Evento de Nóminas - [Mes] [Año]"
- Botón cerrar (X)

**Contenido:**

**1. Información del Evento:**
- Estado actual
- Total de nóminas
- Fecha de generación (si existe)
- Fecha de importación (si existe)
- Fecha de publicación (si existe)

**2. Alertas del Evento:**
- Agrupadas por tipo (Críticas, Advertencias, Informativas)
- Cada tipo muestra conteo y badge de color

**3. Lista de Nóminas (Sub-eventos):**
- Cada nómina es un botón clickeable
- Muestra:
  - Avatar/icono del empleado
  - Nombre completo y email
  - Badge de estado de nómina (pre_nomina, definitiva, publicada, etc.)
  - Total neto
- Click en nómina → Abre `NominaDetailsPanel` (doble nivel de panel)

**4. Estado vacío:**
- Si no hay nóminas generadas, muestra mensaje informativo

### 3. NominaDetailsPanel (Panel Lateral - Doble Nivel) ⭐

Panel lateral que se abre al hacer click en una nómina dentro del `EventoDetailsPanel`.

**Header del Panel:**
- Título: Nombre completo del empleado
- Botón cerrar (X)

**Contenido:**

**1. Resumen:**
- Salario Base
- Complementos
- Deducciones
- Total Bruto
- **Total Neto** (destacado en verde)
- Días Trabajados
- Días Ausencias

**2. Complementos Asignados:**
- Lista de complementos con:
  - Nombre del tipo de complemento
  - Importe

**3. Alertas:**
- Lista de alertas no resueltas de la nómina
- Cada alerta muestra:
  - Icono de tipo
  - Mensaje
  - Detalles (si existen)

**4. Acción:**
- Botón "Ver perfil completo del empleado" → Navega a `/hr/organizacion/personas/[id]`

### 4. Subida Directa de Nóminas ⭐

Modal completo para subir PDFs sin generar evento previo.

**Flujo:**
1. Click en "Subir Nóminas" (header o empty state)
2. Seleccionar mes y año del período
3. Subir PDFs (drag & drop o selector de archivos)
4. Procesamiento automático con IA:
   - Matching automático por nombre de archivo
   - Asignación a empleados con confianza >= 75%
   - Lista de candidatos si confianza < 75%
5. Revisión de asignaciones antes de confirmar
6. Confirmación crea nóminas en estado `definitiva`
7. Nóminas listas para publicar directamente

**Características:**
- Validación de tipos de archivo (solo PDFs)
- Feedback visual durante procesamiento
- Manejo de errores robusto
- Integración con endpoint `/api/nominas/upload` y `/api/nominas/confirmar-upload`

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

### 6. Flujo Alternativo: Subida Directa (Sin Gestoría)
```typescript
// 1. Subir PDFs directamente
const formData = new FormData();
formData.append('nominas', file1); // nomina_juan_garcia.pdf
formData.append('nominas', file2); // nomina_maria_lopez.pdf
formData.append('mes', '1');
formData.append('anio', '2025');

POST /api/nominas/upload
// Devuelve sessionId y resultados de matching

// 2. Revisar asignaciones en UI (modal)

// 3. Confirmar y crear nóminas
POST /api/nominas/confirmar-upload
{
  "sessionId": "uuid",
  "confirmaciones": [
    { "filename": "nomina_juan_garcia.pdf", "empleadoId": "uuid" }
  ]
}
// Crea nóminas en estado 'definitiva', listas para publicar

// 4. Publicar directamente (opcional)
POST /api/nominas/publicar
// O desde la página principal si se creó evento
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
- **Queries optimizadas**: Una sola query trae evento + nóminas + empleados + complementos + alertas (evita N+1)
- **Filtrado en DB**: Alertas filtradas por `resuelta: false` en la query
- **Ordenamiento en DB**: Nóminas ordenadas alfabéticamente en Prisma
- **Memoización**: Filtros y cálculos de alertas memoizados en client components
- **Select selectivo**: Solo campos necesarios en includes de Prisma

### Sincronización Automática de Estados

Desde la refactorización de noviembre 2025 todos los cambios de estado utilizan las utilidades definidas en `lib/calculos/sync-estados-nominas.ts`:

- `sincronizarEstadoEvento(eventoNominaId)` — recalcula el estado del evento a partir de sus nóminas.
- `actualizarEstadoNomina(nominaId, nuevoEstado, extras?)` — actualiza una nómina individual y sincroniza el evento relacionado.
- `actualizarEstadosNominasLote(eventoNominaId, nuevoEstado, extras?)` — actualiza en bloque dentro de transacción.
- `recalcularEstadisticasEvento(eventoNominaId)` — actualiza métricas de complementos y empleados por evento.
- `esTransicionValida(actual, nuevo)` — tabla de transición para proteger workflow.

**Regla:** cualquier endpoint que cambie estados debe usar estas funciones (evita desincronizaciones `EventoNomina` ↔ `Nomina`).

### Alertas de Nómina

- Las alertas (`AlertaNomina`) se consumen directamente en los listados y detalles:
  - API `/api/nominas/eventos` devuelve contadores por severidad.
  - API `/api/nominas/eventos/[id]` incluye alertas no resueltas de cada nómina.
  - Vista principal muestra alertas clickeables que navegan a página de detalles.
  - Página de detalles tiene tab dedicado con filtros por tipo.
  - Componentes reutilizables: `AlertaBadge` y `AlertaList`.
- Solo se exponen alertas **no resueltas** para mantener el foco.
- Endpoint de resolución: `POST /api/nominas/alertas/[id]/resolver`

### Reportes y Analítica de Nóminas

- Endpoint: `GET /api/nominas/analytics?anio=YYYY`
- Métricas incluidas:
  - Resumen general (bruto, neto, complementos, empleados).
  - Distribución por equipo con min/max/mediana y complementos promedio.
  - Tendencia mensual (bruto, neto, complementos, nº nóminas).
  - Distribución salarial detallada (percentiles y rangos de 10k).
  - Análisis por puesto (total, promedio, min, max, mediana).
  - Top 10 complementos más utilizados (veces, importe total/promedio).
- Todos los cálculos se realizan en memoria evitando N+1 gracias a `include` selectivo.

## Componentes UI

### Componentes Reutilizables

**`components/payroll/alerta-badge.tsx`**
- Badge visual para mostrar tipo de alerta
- Props: `tipo`, `mensaje`, `showTooltip`
- Colores y iconos por tipo (crítico/advertencia/info)

**`components/payroll/alerta-list.tsx`**
- Lista de alertas con formato consistente
- Props: `alertas`, `onResolve`
- Acciones: Ver empleado, Resolver alerta

**`components/payroll/upload-nominas-modal.tsx`**
- Modal completo para subida directa de PDFs
- 3 estados: Upload → Review → Success
- Drag & drop y selector de archivos
- Integración con IA para matching automático

### Páginas y Componentes

**`app/(dashboard)/hr/payroll/page.tsx`**
- Server component principal
- Pasa `mesActual` y `anioActual` al client component

**`app/(dashboard)/hr/payroll/payroll-client.tsx`**
- Client component principal
- **Cards clickeables** de eventos (preview con info básica)
- **EventoDetailsPanel**: Componente interno que muestra detalles del evento
- **NominaDetailsPanel**: Componente interno que muestra detalles de nómina individual
- Integra modal de upload (`UploadNominasModal`)
- Maneja estados: `selectedEventoId`, `selectedNominaId`
- Lógica de botones dinámicos según `fechaGeneracion` y `fechaImportacion`

**Componentes Internos (dentro de `payroll-client.tsx`):**

**`EventoDetailsPanel`**
- Panel lateral que se abre al hacer click en una card
- Muestra: información del evento, alertas agregadas, lista de nóminas
- Cada nómina es clickeable y abre `NominaDetailsPanel`

**`NominaDetailsPanel`**
- Panel lateral de doble nivel (se abre sobre `EventoDetailsPanel`)
- Muestra: resumen financiero, complementos, alertas individuales
- Botón para navegar al perfil del empleado

## Arquitectura de Archivos

```
app/(dashboard)/hr/payroll/
├── page.tsx                          # Server component principal
└── payroll-client.tsx                  # Client component principal
    ├── PayrollClient                  # Componente principal
    ├── EventoDetailsPanel             # Panel lateral de evento (interno)
    └── NominaDetailsPanel             # Panel lateral de nómina (interno)

components/payroll/
├── alerta-badge.tsx                  # Badge de alertas (reutilizable)
├── alerta-list.tsx                    # Lista de alertas (reutilizable)
└── upload-nominas-modal.tsx          # Modal de upload directo

components/shared/
└── details-panel.tsx                  # Componente base de panel lateral

app/api/nominas/
├── eventos/
│   ├── route.ts                      # GET/POST eventos
│   └── [id]/
│       ├── route.ts                  # GET/PATCH evento individual
│       ├── exportar/route.ts         # Exportar Excel
│       ├── generar-prenominas/route.ts # Generar pre-nóminas
│       ├── importar/route.ts         # Importar PDFs
│       └── publicar/route.ts         # Publicar nóminas
├── [id]/
│   └── route.ts                      # GET detalles de nómina individual
├── upload/route.ts                   # Upload directo (sin evento)
├── confirmar-upload/route.ts        # Confirmar upload directo
└── alertas/
    └── [id]/
        └── resolver/route.ts         # Resolver alerta
```

**Nota:** Ya no existen páginas separadas para detalles de evento o nómina. Todo se maneja mediante `DetailsPanel` lateral desde la vista principal.

## Referencias

- Arquitectura IA: `docs/ia/ARQUITECTURA_IA.md`
- Classification Pattern: `lib/ia/patterns/classification.ts`
- Clasificador Nóminas: `lib/ia/clasificador-nominas.ts`
- Componente DetailsPanel: `components/shared/details-panel.tsx`
