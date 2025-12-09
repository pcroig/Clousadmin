# Arquitectura IA - Clousadmin

## Resumen Ejecutivo

Nueva arquitectura unificada de IA con soporte multi-proveedor, fallback automático y patrones reutilizables.

### Características Principales

- ✅ **Multi-proveedor**: OpenAI, Anthropic, Google AI
- ✅ **Fallback automático**: Si un proveedor falla, intenta el siguiente
- ✅ **Patrones reutilizables**: Extraction, Classification, Vision, Generation
- ✅ **Type-safe**: TypeScript estricto con Zod
- ✅ **Configuración centralizada**: Un solo lugar para configurar modelos
- ✅ **Legacy compatible**: Re-exports para código existente

## Estructura del Proyecto

```
lib/ia/
├── core/                           # Núcleo del sistema
│   ├── types.ts                    # Tipos unificados (AIMessage, AIResponse, etc.)
│   ├── client.ts                   # Cliente con fallback automático
│   ├── config.ts                   # Configuración de modelos y FEATURE_CONFIGS
│   ├── features.ts                 # Helper declarativo (callFeatureAI)
│   └── providers/                  # Proveedores específicos
│       ├── openai.ts              # Wrapper de OpenAI SDK (Responses API + fallback)
│       ├── anthropic.ts           # Wrapper de Anthropic SDK
│       └── google.ts              # Wrapper de Google AI SDK
│
├── patterns/                       # Patrones reutilizables
│   ├── extraction.ts              # Extraer datos estructurados
│   ├── classification.ts          # Clasificar/matching
│   ├── vision.ts                  # Análisis de documentos/imágenes
│   └── generation.ts              # Generación de texto
│
├── clasificador-nominas.ts         # Matching de nóminas (usa Classification Pattern)
├── procesar-excel-empleados.ts    # Mapeo de Excel a empleados
├── cuadrar-vacaciones.ts          # Optimización de vacaciones
├── clasificador-solicitudes.ts    # Clasificación de solicitudes
│
└── index.ts                        # Punto de entrada centralizado
```

## Core - Sistema Base

### Tipos Unificados (`core/types.ts`)

Tipos comunes para todos los proveedores:

```typescript
// Mensaje unificado
interface AIMessage {
  role: MessageRole;
  content: MessageContent;  // string | TextContent | ImageContent | array
}

// Respuesta unificada
interface AIResponse {
  id: string;
  provider: AIProvider;
  model: string;
  choices: AIChoice[];
  usage?: TokenUsage;
}

// Configuración de modelo
interface ModelConfig {
  provider: AIProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
  systemMessage?: string;
}
```

### Cliente Unificado (`core/client.ts`)

Cliente con fallback automático entre proveedores:

```typescript
import { callAI, isAnyProviderAvailable } from '@/lib/ia';

// Llamada simple
const response = await callAI(
  messages,
  config,
  { responseFormat: 'json_object' }
);

// Con retry automático
const response = await callAIWithRetry(messages, config);

// Con parsing JSON automático
const data = await callAIForJSON<MyType>(messages, config);
```

**Fallback automático:**
1. Intenta OpenAI (si está configurado)
2. Si falla, intenta Anthropic
3. Si falla, intenta Google AI
4. Si todos fallan, lanza error

### Configuración de Modelos (`core/config.ts`)

Configuración centralizada por caso de uso:

```typescript
import { createConfigForUseCase, AIUseCase, AIProvider } from '@/lib/ia';

// Obtener config para un caso de uso
const config = createConfigForUseCase(
  AIUseCase.VISION,
  AIProvider.OPENAI
);

// Obtener config para una feature específica
const config = getFeatureConfig('extraer-documentos', provider);
```

**Casos de uso predefinidos:**
- `EXTRACTION`: Extraer datos estructurados
- `CLASSIFICATION`: Clasificar/matching
- `VISION`: Análisis de documentos con visión
- `GENERATION`: Generación de texto
- `REASONING`: Razonamiento complejo
- `SIMPLE`: Tareas rápidas

## Patterns - Patrones Reutilizables

### Extraction Pattern

Extraer datos estructurados desde texto:

```typescript
import { extractStructuredData } from '@/lib/ia';
import { z } from 'zod';

const schema = z.object({
  nombre: z.string(),
  email: z.string().email(),
  edad: z.number().optional(),
});

const result = await extractStructuredData(
  'Mi nombre es Juan, email juan@example.com, tengo 30 años',
  schema,
  {
    nombre: 'Nombre completo',
    email: 'Email',
    edad: 'Edad (opcional)',
  }
);

if (result.success) {
  console.log(result.data); // { nombre: 'Juan', email: 'juan@example.com', edad: 30 }
}
```

### Classification Pattern

Clasificar/matching inteligente:

```typescript
import { classify } from '@/lib/ia';

const result = await classify(
  'nomina_juan_garcia_2024.pdf',
  [
    { id: '1', label: 'Juan García López' },
    { id: '2', label: 'Juan García Martínez' },
  ],
  'archivo de nómina con empleado',
  {
    confidenceThreshold: 75,
    topK: 3,
  }
);

if (result.match) {
  console.log(`Match: ${result.match.label} (${result.match.confidence}%)`);
}
```

### Vision Pattern

Analizar documentos e imágenes:

```typescript
import { analyzeDocument } from '@/lib/ia';
import { z } from 'zod';

const schema = z.object({
  nombre: z.string(),
  nif: z.string(),
  fechaNacimiento: z.string().optional(),
});

const result = await analyzeDocument(
  'https://fsn1.your-objectstorage.com/bucket/dni.jpg',
  schema,
  {
    nombre: 'Nombre completo',
    nif: 'NIF/DNI/NIE',
    fechaNacimiento: 'Fecha de nacimiento',
  },
  {
    imageDetail: 'high',
    temperature: 0.1,
  }
);
```

### Generation Pattern

Generar texto:

```typescript
import { generateText, summarizeText } from '@/lib/ia';

// Generación simple
const result = await generateText(
  'Escribe un resumen de las ausencias del mes',
  {
    context: 'Empleado: Juan García. Ausencias: 3 días de vacaciones.',
    tone: 'profesional',
  }
);

// Resumen
const summary = await summarizeText(
  'Texto largo...',
  200 // máx 200 palabras
);
```

## Uso en Features

### Ejemplo: Extracción de Documentos

**Antes:**

```typescript
const openai = getOpenAIClient();
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: [...] }],
  // ... configuración manual
});
// ... parsing manual
```

**Ahora:**

```typescript
const result = await analyzeDocument(
  documentUrl,
  schema,
  fields,
  { temperature: 0.1, imageDetail: 'high' }
);
```

### Ejemplo: Clasificación de Nóminas

**Antes:**

```typescript
const openai = getOpenAIClient();
// ... código de 150+ líneas para matching
```

**Ahora:**

```typescript
const result = await classify(
  filename,
  candidates,
  'archivo de nómina',
  { confidenceThreshold: 75 }
);
```

## Proveedores Soportados

### OpenAI (Recomendado)

- **Modelos**: GPT-5.1, GPT-5.1-mini, GPT-4o, GPT-4o-mini
- **Fortalezas**: Mejor calidad, visión excelente, Responses API con logging mejorado
- **Costo**: Medio-alto ($0.15-15 por 1M tokens)
- **API**: Usa Responses API por defecto (con fallback a Chat Completions)

```typescript
// No requiere configuración especial, es el proveedor por defecto
const config = createConfigForUseCase(AIUseCase.VISION, AIProvider.OPENAI);
```

#### OpenAI Responses API

El sistema usa **OpenAI Responses API** por defecto para todas las llamadas, con fallback automático a Chat Completions si es necesario.

**Ventajas de Responses API:**
- ✅ **Logging mejorado**: Todas las llamadas aparecen en el dashboard de Responses
- ✅ **Trazabilidad**: Cada respuesta tiene un ID único (`resp_xxx`)
- ✅ **Structured Outputs nativos**: JSON garantizado sin ajustes en prompts
- ✅ **Compatibilidad total**: Fallback automático garantiza continuidad

**Flujo de integración:**
```
Usuario ejecuta funcionalidad IA
         ↓
callFeatureAI('feature-name', messages)  [core/features.ts]
         ↓
callAI(messages, config, options)  [core/client.ts]
         ↓
callOpenAI(messages, config, options)  [core/providers/openai.ts]
         ↓
   ¿SDK expone responses.create()?
         ↓
    SÍ → client.responses.create()  ✅ LOGS EN DASHBOARD
         ↓
    NO → client.chat.completions.create()  (fallback)
```

**Verificación:**
- Buscar en logs: `[OpenAI Provider] Intentando Responses API (modelo gpt-5.1)`
- Dashboard: https://platform.openai.com/logs?api=responses

**Configuración de modelos:**
Todas las funcionalidades están configuradas con modelos que soportan Responses API:
- `procesar-excel-empleados`: `gpt-5.1` ✅
- `cuadrar-vacaciones`: `gpt-5.1` ✅
- `clasificador-nominas`: `gpt-5.1` ✅
- `extraer-documentos`: `gpt-5.1` ✅
- `analisis-sentimientos`: `gpt-5.1` ✅

### Anthropic (Claude)

- **Modelos**: Claude 3.5 Sonnet, Claude 3.5 Haiku
- **Fortalezas**: Excelente razonamiento, rápido
- **Costo**: Medio ($0.25-15 por 1M tokens)

```typescript
const config = createConfigForUseCase(AIUseCase.EXTRACTION, AIProvider.ANTHROPIC);
```

### Google AI (Gemini)

- **Modelos**: Gemini 1.5 Pro, Gemini 1.5 Flash
- **Fortalezas**: Económico, buena velocidad
- **Costo**: Bajo ($0.075-5 por 1M tokens)

```typescript
const config = createConfigForUseCase(AIUseCase.SIMPLE, AIProvider.GOOGLE);
```

## Configuración

### Variables de Entorno

```bash
# Al menos una debe estar configurada
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_API_KEY="..."
```

Ver [ENV_VARIABLES.md](./ENV_VARIABLES.md) para más detalles.

### Prioridad de Proveedores

1. **OpenAI** (si está configurado)
2. **Anthropic** (si OpenAI falla/no disponible)
3. **Google AI** (último fallback)

### Mapeo Automático de Modelos

Si un proveedor no es OpenAI, el sistema mapea automáticamente:

```typescript
// Config original para OpenAI
const config = { model: 'gpt-4o', provider: AIProvider.OPENAI };

// Si usa Anthropic, se mapea a:
// { model: 'claude-3-5-sonnet-20241022', provider: AIProvider.ANTHROPIC }

// Si usa Google AI, se mapea a:
// { model: 'gemini-1.5-pro-latest', provider: AIProvider.GOOGLE }
```

## Migración de Código Existente

### Paso 1: Identificar el patrón

| Funcionalidad Actual | Pattern Recomendado |
|---------------------|---------------------|
| Extraer datos de texto/documento | `extractStructuredData` o `analyzeDocument` |
| Matching/clasificación | `classify` |
| Análisis de imágenes/PDFs | `analyzeDocument` |
| Generación de texto | `generateText` |

### Paso 2: Actualizar imports

**Antes:**

```typescript
import { getOpenAIClient } from '@/lib/ia/client';
```

**Ahora:**

```typescript
import { analyzeDocument } from '@/lib/ia';
// o
import { classify } from '@/lib/ia';
// o
import { generateText } from '@/lib/ia';
```

### Paso 3: Usar el pattern

Ver ejemplos en cada sección de patterns arriba.

## Testing

### Mock de Proveedores

```typescript
// En tests
import { callAI } from '@/lib/ia';

jest.mock('@/lib/ia/core/client', () => ({
  callAI: jest.fn().mockResolvedValue({
    id: 'test',
    provider: 'openai',
    model: 'gpt-4o',
    choices: [{ message: { content: '{"result":"test"}' } }],
  }),
}));
```

### Test de Fallback

```typescript
// Simular fallo de OpenAI
process.env.OPENAI_API_KEY = '';
process.env.ANTHROPIC_API_KEY = 'test-key';

const result = await callAI(messages, config);
// Debería usar Anthropic
expect(result.provider).toBe('anthropic');
```

## Performance

### Latencias Típicas

- **Extracción simple**: 1-3s
- **Análisis de documento**: 3-8s
- **Clasificación**: 1-2s
- **Generación corta**: 1-2s

### Optimizaciones

1. **Usar modelos apropiados**: No usar GPT-4o para tareas simples
2. **Batch operations**: Procesar múltiples items en una llamada
3. **Caching**: Cachear resultados cuando sea posible
4. **Streaming**: Para respuestas largas (futuro)

## Troubleshooting

### Error: "No hay proveedores de IA configurados"

**Causa**: No hay ninguna API key válida.

**Solución**: Configura al menos una en `.env.local`:
```bash
OPENAI_API_KEY="sk-..."
```

### Error: "All AI providers failed"

**Causa**: Todos los proveedores configurados fallaron.

**Solución**:
1. Verifica que las API keys sean válidas
2. Verifica que tengas créditos en los proveedores
3. Revisa los logs para ver el error específico

### Funcionalidad usa proveedor incorrecto

**Causa**: El proveedor principal no está configurado.

**Solución**: El sistema hace fallback automático, pero puedes especificar el proveedor:

```typescript
const result = await extractStructuredData(
  input,
  schema,
  fields,
  { provider: AIProvider.OPENAI } // Forzar OpenAI
);
```

## Roadmap

### ✅ Completado

- Multi-proveedor con fallback
- Patrones reutilizables
- Migración de extracción de documentos
- Migración de clasificador de nóminas
- **OpenAI Responses API integrada** (con fallback automático)
- **Modelos actualizados a GPT-5.1/GPT-5.1-mini**
- **Centralización completa de funcionalidades IA**

### 🚧 Pendiente

- Migración de clasificador de fichajes
- Migración de cuadrar vacaciones
- Migración de procesar Excel
- Streaming support
- Batch processing
- Rate limiting inteligente
- Metrics y monitoring

## Referencias

- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Configuración de variables de entorno
- [OpenAI Platform](https://platform.openai.com/)
- [Anthropic Console](https://console.anthropic.com/)
- [Google AI Studio](https://makersuite.google.com/)























