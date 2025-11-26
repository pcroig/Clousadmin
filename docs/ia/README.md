# 🤖 Sistema de IA - Documentación Centralizada

## 📋 Índice

1. [Instalación y Configuración Base](#instalación-y-configuración-base)
2. [Sistema de Fallback](#sistema-de-fallback)
3. [Estructura del Sistema](#estructura-del-sistema)
4. [Uso por Funcionalidad](#uso-por-funcionalidad)
5. [Agregar Nueva Funcionalidad](#agregar-nueva-funcionalidad)
6. [Referencias](#referencias)

---

## 🛠️ Instalación y Configuración Base

### Requisitos Previos

El sistema de IA soporta **múltiples proveedores** con fallback automático:

#### Opción 1: OpenAI (Recomendado)

1. **Paquete OpenAI instalado** (ya incluido en `package.json`):
   ```bash
   npm install openai  # v6.7.0+
   ```

2. **Variable de entorno configurada** en `.env.local`:
   ```bash
   OPENAI_API_KEY="sk-proj-..."
   ```
   ⚠️ La API key debe comenzar con `sk-` para ser válida.

**Características:**
- ✅ Usa **OpenAI Responses API** por defecto (con fallback a Chat Completions)
- ✅ Modelos: GPT-5.1, GPT-5.1-mini, GPT-4o, GPT-4o-mini
- ✅ Logging mejorado en dashboard de Responses
- ✅ Structured Outputs nativos

#### Opción 2: Anthropic (Claude)

1. **Variable de entorno configurada** en `.env.local`:
   ```bash
   ANTHROPIC_API_KEY="sk-ant-..."
   ```

#### Opción 3: Google AI (Gemini)

1. **Variable de entorno configurada** en `.env.local`:
   ```bash
   GOOGLE_AI_API_KEY="..."
   ```

### Prioridad de Proveedores

El sistema usa esta prioridad automáticamente:

1. **OpenAI (GPT-5.1)** - Si `OPENAI_API_KEY` está configurado
2. **Anthropic (Claude)** - Si OpenAI falla/no disponible
3. **Google AI (Gemini)** - Último fallback
4. **Error** - Si ninguno está configurado

### Import Centralizado

**Todo lo relacionado con la base común** (instalación, cliente, modelos) se importa desde:

```typescript
// ✅ Punto de entrada centralizado (cliente multi-proveedor + helpers declarativos)
import {
  callFeatureAI,       // Ejecuta una feature declarada en FEATURE_CONFIGS
  callAI,              // Cliente bajo nivel (mensajes IAMessage)
  getAvailableProviders,
  getPrimaryProvider,
  MessageRole,
} from '@/lib/ia';

// ⚠️ Legacy (deprecated pero disponible temporalmente)
import { getOpenAIClient, isOpenAIAvailable } from '@/lib/ia';
```

**Cada funcionalidad específica** se importa desde su archivo:

```typescript
// ✅ Funcionalidad específica
import { cuadrarVacacionesIA } from '@/lib/ia/cuadrar-vacaciones';
```

---

## 🔄 Sistema de Fallback

### ¿Cómo Funciona?

El sistema detecta automáticamente qué proveedor usar:

```typescript
import { getAIClient, getActiveProvider } from '@/lib/ia';

// El cliente se inicializa con fallback automático
const client = getAIClient();  // OpenAI o Replicate según disponibilidad

// Saber qué proveedor está activo
const provider = getActiveProvider();  // 'openai' | 'replicate' | 'none'

console.log(`Usando proveedor: ${provider}`);
```

### Flujo de Decisión

```
¿OPENAI_API_KEY configurado y válido?
├─ SÍ  → Usar OpenAI (GPT-4.1)
└─ NO  → ¿REPLICATE_API_TOKEN configurado?
          ├─ SÍ  → Usar Replicate (Llama 3.1 70B)
          └─ NO  → Lanzar error
```

### Ventajas del Fallback

✅ **Continuidad**: Si OpenAI falla, el sistema sigue funcionando
✅ **Costos**: Replicate puede ser más económico para ciertos casos
✅ **Open Source**: Llama 3.1 70B es completamente open source
✅ **Compatible**: Misma interfaz que OpenAI, sin cambios en el código

---

## 📁 Estructura del Sistema

```
lib/ia/
├── index.ts                  # 📦 Punto de entrada centralizado
├── core/
│   ├── client.ts             # 🔧 Cliente unificado con fallback (OpenAI → Anthropic → Google)
│   ├── config.ts             # ⚙️ Modelos, AIUseCase y FEATURE_CONFIGS declarativos
│   ├── features.ts           # 🚀 Helper callFeatureAI/listAvailableFeatures
│   └── providers/            # 🧱 Integraciones específicas (openai|anthropic|google)
├── patterns/                 # ♻️ Patrones reutilizables (extraction, classification, vision, generation)
├── cuadrar-vacaciones.ts     # 🎯 Funcionalidad específica
├── clasificador-nominas.ts   # 🎯 Funcionalidad específica
├── procesar-excel-empleados.ts
├── plantillas/               # 🎯 Funcionalidades ligadas a plantillas/pdf
└── [nueva-funcionalidad].ts  # 🎯 Nuevos módulos con su propia lógica
```

### Separación Clara

- **BASE COMÚN** (`index.ts`, `core/client.ts`, `core/config.ts`, `core/features.ts`):
  - Instalación y configuración compartida
  - Cliente de IA con fallback automático (OpenAI → Replicate)
  - Definiciones de modelos (GPT-4.1 como estándar)
  - Configuraciones por funcionalidad
  - Sistema de fallback transparente

- **FUNCIONALIDADES ESPECÍFICAS** (archivos individuales):
  - Cada funcionalidad en su propio archivo
  - Todas usan GPT-4.1 (o Llama 3.1 70B como fallback)
  - Lógica específica de cada caso de uso
  - Temperatura ajustada por funcionalidad

---

## 🚀 Uso por Funcionalidad

### 1. Cuadrar Vacaciones

**Modelo**: `GPT-5.1` (fallback: Anthropic/Google AI)
**Archivo**: `lib/ia/cuadrar-vacaciones.ts`

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
// Usa automáticamente GPT-5.1 o fallback según disponibilidad
```

### 2. Usar Cliente Base Directamente

Si necesitas usar el cliente de IA directamente (no recomendado, mejor usar funcionalidades específicas):

```typescript
import { callAI, getFeatureConfig, getPrimaryProvider, MessageRole } from '@/lib/ia';

const provider = getPrimaryProvider();
if (!provider) {
  throw new Error('Configura OPENAI_API_KEY, ANTHROPIC_API_KEY o GOOGLE_AI_API_KEY');
}

const config = getFeatureConfig('cuadrar-vacaciones', provider);

const completion = await callAI(
  [
    {
      role: MessageRole.USER,
      content: 'Prompt aquí',
    },
  ],
  config
);
```

### 3. Verificar Disponibilidad

```typescript
import { getAvailableProviders, isAnyProviderAvailable } from '@/lib/ia';

if (isAnyProviderAvailable()) {
  console.log(`IA disponible: ${getAvailableProviders().join(', ')}`);
} else {
  console.warn('Configura OPENAI_API_KEY, ANTHROPIC_API_KEY o GOOGLE_AI_API_KEY');
}
```

---

## ➕ Agregar Nueva Funcionalidad de IA

### Paso 1: Crear Archivo de Funcionalidad

```typescript
// lib/ia/nueva-funcionalidad.ts

import { callFeatureAI, MessageRole } from '@/lib/ia';

export interface NuevaFuncionalidadInput {
  // Tipos específicos de esta funcionalidad
}

export interface NuevaFuncionalidadResult {
  // Tipos de resultado específicos
}

export async function nuevaFuncionalidadIA(
  input: NuevaFuncionalidadInput
): Promise<NuevaFuncionalidadResult> {
  const completion = await callFeatureAI('nueva-funcionalidad', [
    { role: MessageRole.USER, content: 'Tu prompt aquí' },
  ]);

  return {
    // Resultado procesado con completion.choices[0].message.content
  };
}
```

> 💡 También puedes usar los patrones (`lib/ia/patterns/*`) cuando necesites extracción estructurada, clasificación o visión. Estos patrones ya usan `callAI` internamente.

### Paso 2: Añadir Configuración en `core/config.ts`

```typescript
// lib/ia/core/config.ts

export const FEATURE_CONFIGS = {
  // ...otras features
  'nueva-funcionalidad': {
    useCase: AIUseCase.EXTRACTION, // o el caso de uso que corresponda
    systemMessage: 'Eres un asistente experto en...',
    temperature: 0.4,
    responseFormat: 'json_object',
    maxTokens: 2000,
  },
} as const;
```

### Paso 3: Usar la Nueva Funcionalidad

```typescript
// En cualquier parte del código
import { nuevaFuncionalidadIA } from '@/lib/ia/nueva-funcionalidad';

const resultado = await nuevaFuncionalidadIA({
  // Input específico
});
```

---

## 📦 Lo que está Centralizado

### En `lib/ia/index.ts`

✅ **Exports centralizados**:
- Cliente unificado (`callAI`, `callAISafe`, patrones)
- Helpers declarativos (`callFeatureAI`, `listAvailableFeatures`)
- Tipos (`AIProvider`, `MessageRole`, `FeatureCallOptions`, etc.)

### En `lib/ia/core/client.ts`

✅ **Cliente multi-proveedor**:
- Fallback automático OpenAI → Anthropic → Google
- Reintentos con backoff
- Logging y metadatos homogéneos

### En `lib/ia/core/config.ts`

✅ **Declaración de modelos**:
- `AIUseCase`, `OPENAI_MODELS`, `FEATURE_CONFIGS`
- Helpers para obtener configuraciones (`getFeatureConfig`, `createConfigForUseCase`)

---

## 🎯 Lo que está Separado por Funcionalidad

Cada funcionalidad tiene su propio archivo con:
- ✅ Lógica específica del caso de uso
- ✅ Tipos TypeScript específicos
- ✅ Prompts y procesamiento de respuestas
- ✅ Uso del cliente base común (importado desde `./index`)

---

## 📚 Referencias

- [Arquitectura IA Completa](./ARQUITECTURA_IA.md) - Documentación técnica detallada
- [Variables de Entorno](./ENV_VARIABLES.md) - Configuración de API keys
- [OpenAI SDK](https://github.com/openai/openai-node)
- [OpenAI Responses API](https://platform.openai.com/docs/guides/responses)
- [Modelos Disponibles](https://platform.openai.com/docs/models)





