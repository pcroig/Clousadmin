# Integración OpenAI - Sistema Centralizado de IA

## Resumen

El sistema utiliza OpenAI para múltiples funcionalidades de IA. La arquitectura está diseñada para ser **escalable y modular**, con **instalación y configuración base centralizadas** y **cada funcionalidad en su propio archivo**.

## Arquitectura

### Estructura de Archivos

```
lib/
├── ia/                           # 🎯 Directorio centralizado de IA
│   ├── index.ts                 # 📦 PUNTO DE ENTRADA CENTRALIZADO
│   │                             #    Instalación y configuración base común
│   │
│   ├── client.ts                 # 🔧 BASE COMÚN
│   │                             #    Cliente OpenAI (singleton, lazy init)
│   │
│   ├── models.ts                 # ⚙️ BASE COMÚN
│   │                             #    Configuraciones de modelos por funcionalidad
│   │
│   ├── cuadrar-vacaciones.ts    # 🎯 FUNCIONALIDAD ESPECÍFICA
│   │                             #    Optimización de vacaciones
│   │
│   ├── clasificador-fichajes.ts # 🎯 FUNCIONALIDAD ESPECÍFICA
│   │                             #    Clasificación de fichajes (sin IA aún)
│   │
│   └── [nueva-funcionalidad].ts # 🎯 OTRAS FUNCIONALIDADES
│                                 #    Cada una en su propio archivo
│
└── openai.ts                     # ⚠️ Deprecated: Re-exports para compatibilidad
```

### Principios de Diseño

1. **Separación por Funcionalidad**: Cada funcionalidad de IA tiene su propio archivo
2. **Configuración Centralizada**: Modelos y configuraciones en `models.ts`
3. **Cliente Único**: Singleton pattern para el cliente OpenAI (reutilización)
4. **Lazy Initialization**: No se inicializa hasta que se necesita (evita errores en build)
5. **Flexibilidad de Modelos**: Cada funcionalidad puede usar el modelo apropiado (gpt-4o-mini, gpt-4.1, gpt-5, etc.)

## Configuración

### 1. Variable de Entorno

Añadir a `.env.local`:

```bash
OPENAI_API_KEY="sk-proj-..."
```

**Importante**: La API key debe comenzar con `sk-` para ser válida.

### 2. Instalación

El paquete `openai` ya está instalado:

```bash
npm install openai  # v6.7.0 en package.json
```

## Uso por Funcionalidad

### Cuadrar Vacaciones

**Modelo**: `gpt-4o-mini`  
**Temperatura**: 0.3 (determinístico)  
**Formato**: JSON

```typescript
import { cuadrarVacacionesIA } from '@/lib/ia/cuadrar-vacaciones';

const resultado = await cuadrarVacacionesIA({
  empresaId,
  campanaId,
  solapamientoMaximoPct: 50,
  preferencias,
  ausenciasAprobadas,
  fechaInicioObjetivo,
  fechaFinObjetivo,
});
```

**Configuración en `models.ts`**:
```typescript
'cuadrar-vacaciones': {
  model: MODELS.GPT_4O_MINI,
  temperature: 0.3,
  responseFormat: 'json_object',
  systemMessage: 'Eres un asistente experto...',
}
```

### Agregar Nueva Funcionalidad de IA

1. **Crear archivo en `lib/ia/`**:
```typescript
// lib/ia/nueva-funcionalidad.ts
import { getOpenAIClient } from './client';
import { getModelConfig } from './models';

export async function nuevaFuncionalidadIA(input: InputType) {
  const modelConfig = getModelConfig('nueva-funcionalidad');
  const openai = getOpenAIClient();
  
  // Tu lógica aquí
}
```

2. **Añadir configuración en `models.ts`**:
```typescript
export const FUNCTION_CONFIGS: Record<string, ModelConfig> = {
  // ... existentes
  
  'nueva-funcionalidad': {
    model: MODELS.GPT_5, // o el modelo apropiado
    temperature: 0.4,
    responseFormat: 'json_object',
    systemMessage: 'Tu prompt del sistema...',
  },
};
```

## Modelos Disponibles

### Modelos Económicos y Rápidos

- **`gpt-4o-mini`**: Tareas simples, optimización, análisis de datos estructurados
  - Costo: ~$0.15/$0.60 por 1M tokens
  - Uso: Cuadrar vacaciones, clasificación básica

### Modelos Balanceados

- **`gpt-4o`**: Tareas intermedias que requieren mejor comprensión
  - Uso: Análisis de sentimientos, comprensión de contexto

### Modelos Avanzados

- **`gpt-4.1`**: Tareas complejas, razonamiento avanzado
  - Uso: Extracción de documentos complejos, análisis profundo

- **`gpt-5`**: Modelo más reciente (cuando esté disponible)
  - Uso: Funcionalidades que requieren las últimas capacidades

## Cliente OpenAI Base

### Import Recomendado

```typescript
// ✅ RECOMENDADO: Import desde nueva ubicación
import { getOpenAIClient, isOpenAIAvailable } from '@/lib/ia/client';

// ⚠️ DEPRECATED: Funciona pero no recomendado
import { getOpenAIClient } from '@/lib/openai';
```

### Uso del Cliente

```typescript
import { getOpenAIClient } from '@/lib/ia/client';

// Obtener cliente (se inicializa solo ahora, no en import)
const openai = getOpenAIClient();

// Usar directamente
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

### Verificar Disponibilidad

```typescript
import { isOpenAIAvailable } from '@/lib/ia/client';

if (isOpenAIAvailable()) {
  // OpenAI configurado, proceder
} else {
  // Mostrar alternativa o error
}
```

## Configuración de Modelos

### Obtener Configuración

```typescript
import { getModelConfig, MODELS } from '@/lib/ia/models';

// Obtener configuración de una funcionalidad
const config = getModelConfig('cuadrar-vacaciones');
// { model: 'gpt-4o-mini', temperature: 0.3, ... }

// Acceder a modelos directamente
const model = MODELS.GPT_5; // 'gpt-5'
```

### Usar Helper para Llamadas Estándar

```typescript
import { callOpenAIWithConfig } from '@/lib/ia/models';

const response = await callOpenAIWithConfig('cuadrar-vacaciones', [
  { role: 'user', content: 'Prompt aquí' },
]);
```

## Ejemplos por Funcionalidad

### Cuadrar Vacaciones

```typescript
import { cuadrarVacacionesIA } from '@/lib/ia/cuadrar-vacaciones';

const resultado = await cuadrarVacacionesIA({
  empresaId: '...',
  campanaId: '...',
  solapamientoMaximoPct: 50,
  preferencias: [...],
  ausenciasAprobadas: [...],
  fechaInicioObjetivo: new Date('2025-07-01'),
  fechaFinObjetivo: new Date('2025-08-31'),
});

// resultado.propuestas[] - Propuesta por empleado
// resultado.resumen - Estadísticas del cuadrado
```

### Respuesta Esperada

```json
{
  "propuestas": [
    {
      "empleadoId": "uuid",
      "empleadoNombre": "Juan García",
      "fechaInicio": "2025-07-15",
      "fechaFin": "2025-07-28",
      "dias": 10,
      "tipo": "ideal",
      "motivo": "Coincide con días ideales",
      "prioridad": 8
    }
  ],
  "resumen": {
    "totalEmpleados": 10,
    "empleadosConIdeal": 7,
    "empleadosAjustados": 3,
    "solapamientoMaximo": 45
  }
}
```

## Manejo de Errores

### Sin API Key Configurada

```typescript
try {
  const openai = getOpenAIClient();
} catch (error) {
  // Error: "OpenAI API key no configurada o inválida..."
  // Mostrar mensaje al usuario o usar alternativa
}
```

### Errores de API

```typescript
try {
  const resultado = await cuadrarVacacionesIA(input);
} catch (error) {
  console.error('[IA] Error:', error);
  // Manejar según el contexto (mostrar error al usuario, retry, etc.)
}
```

## Desarrollo Sin OpenAI

- ✅ **Build funciona** sin API key (lazy initialization)
- ✅ **Runtime falla** si se intenta usar sin API key (comportamiento esperado)
- ✅ **UI puede verificar** con `isOpenAIAvailable()` antes de mostrar opciones

## Testing

### Mock para Tests

```typescript
// Mock el cliente en tests
jest.mock('@/lib/ia/client', () => ({
  getOpenAIClient: () => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"result": "ok"}' } }],
        }),
      },
    },
  }),
  isOpenAIAvailable: () => true,
}));
```

## Costos Estimados

| Modelo | Input (1M tokens) | Output (1M tokens) | Uso Típico |
|--------|-------------------|-------------------|------------|
| gpt-4o-mini | ~$0.15 | ~$0.60 | Cuadrar vacaciones (~2-5K tokens) |
| gpt-4o | ~$2.50 | ~$10.00 | Análisis complejos |
| gpt-4.1 | ~$5.00 | ~$15.00 | Extracción documentos |
| gpt-5 | TBD | TBD | Funcionalidades avanzadas |

**Ejemplo**: Cuadrar vacaciones con 10 empleados ≈ 3,000 tokens ≈ $0.001-0.002 USD

## Migración desde `lib/openai.ts`

Si tienes código que importa desde `@/lib/openai`:

```typescript
// ❌ Antes (deprecated pero funciona)
import { getOpenAIClient } from '@/lib/openai';

// ✅ Ahora (recomendado)
import { getOpenAIClient } from '@/lib/ia/client';
```

El archivo `lib/openai.ts` mantiene re-exports para compatibilidad, pero se recomienda usar la nueva ubicación.

## Separación Clara: Base Común vs Funcionalidades

### 📦 Base Común Centralizada (`lib/ia/index.ts`)

**Instalación y configuración compartida por todas las funcionalidades**:

- ✅ `getOpenAIClient()` - Cliente OpenAI único (singleton)
- ✅ `isOpenAIAvailable()` - Verificar disponibilidad
- ✅ `MODELS` - Modelos disponibles (gpt-4o-mini, gpt-4.1, gpt-5, etc.)
- ✅ `getModelConfig()` - Configuraciones por funcionalidad
- ✅ Helpers comunes para todas las funcionalidades

**Se importa desde**: `@/lib/ia` (punto centralizado)

### 🎯 Funcionalidades Específicas

**Cada funcionalidad en su propio archivo** con:
- ✅ Lógica específica del caso de uso
- ✅ Tipos TypeScript específicos
- ✅ Prompts y procesamiento de respuestas
- ✅ Usa base común importada desde `./index`

**Se importa desde**: `@/lib/ia/[nombre-funcionalidad]`

## Referencias

- [Documentación Completa del Sistema de IA](./ia/README.md)
- [OpenAI SDK Docs](https://github.com/openai/openai-node)
- [Chat Completions API](https://platform.openai.com/docs/api-reference/chat)
- [Modelos Disponibles](https://platform.openai.com/docs/models)
- [Pricing](https://openai.com/pricing)
