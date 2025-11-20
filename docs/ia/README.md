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
// ✅ Punto de entrada centralizado - Base común (NUEVO)
import {
  getAIClient,         // Cliente con fallback automático
  isAIAvailable,       // Verificar disponibilidad (OpenAI o Replicate)
  getActiveProvider,   // Saber qué proveedor está activo
  MODELS,              // Modelos disponibles
  getModelConfig,      // Obtener configuración por funcionalidad
} from '@/lib/ia';

// ⚠️ Legacy (deprecated pero funcionan por compatibilidad)
import {
  getOpenAIClient,     // Solo OpenAI, sin fallback
  isOpenAIAvailable,   // Solo verifica OpenAI
} from '@/lib/ia';
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
├── index.ts                     # 📦 PUNTO DE ENTRADA CENTRALIZADO
│                                #    Instalación y configuración base común
│
├── client.ts                    # 🔧 BASE COMÚN
│                                #    Cliente de IA con fallback automático
│                                #    (OpenAI → Replicate)
│
├── fallback-client.ts           # 🔄 FALLBACK
│                                #    Cliente Replicate (Llama 3.1 70B)
│                                #    Interfaz compatible con OpenAI
│
├── models.ts                    # ⚙️ BASE COMÚN
│                                #    Configuraciones de modelos (GPT-4.1)
│                                #    por funcionalidad
│
├── cuadrar-vacaciones.ts        # 🎯 FUNCIONALIDAD ESPECÍFICA
│                                #    Optimización de vacaciones con IA
│
├── clasificador-fichajes.ts     # 🎯 FUNCIONALIDAD ESPECÍFICA
│                                #    Clasificación de fichajes
│
├── clasificador-nominas.ts      # 🎯 FUNCIONALIDAD ESPECÍFICA
│                                #    Matching de nóminas con empleados
│
├── procesar-excel-empleados.ts  # 🎯 FUNCIONALIDAD ESPECÍFICA
│                                #    Mapeo de Excel a empleados
│
└── [nueva-funcionalidad].ts     # 🎯 NUEVAS FUNCIONALIDADES
                                 #    Cada una en su propio archivo
```

### Separación Clara

- **BASE COMÚN** (`index.ts`, `client.ts`, `fallback-client.ts`, `models.ts`):
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
import { getAIClient, getModelConfig, getActiveProvider } from '@/lib/ia';

// El cliente detecta automáticamente qué proveedor usar
const client = getAIClient();  // OpenAI o Replicate
const config = getModelConfig('cuadrar-vacaciones');
const provider = getActiveProvider();  // 'openai' | 'replicate'

console.log(`Usando: ${provider}`);

const completion = await client.chat.completions.create({
  model: config.model,
  messages: [...],
  temperature: config.temperature,
});
```

### 3. Verificar Disponibilidad

```typescript
import { isAIAvailable, getActiveProvider } from '@/lib/ia';

if (isAIAvailable()) {
  const provider = getActiveProvider();
  console.log(`IA disponible: ${provider}`);
  // Mostrar opciones de IA
} else {
  // Mostrar alternativa sin IA o mensaje de configuración
  console.log('Configura OPENAI_API_KEY o REPLICATE_API_TOKEN');
}
```

---

## ➕ Agregar Nueva Funcionalidad de IA

### Paso 1: Crear Archivo de Funcionalidad

```typescript
// lib/ia/nueva-funcionalidad.ts

// ✅ Importar base común desde punto centralizado
import { getOpenAIClient, getModelConfig } from './index';

export interface NuevaFuncionalidadInput {
  // Tipos específicos de esta funcionalidad
}

export interface NuevaFuncionalidadResult {
  // Tipos de resultado específicos
}

export async function nuevaFuncionalidadIA(
  input: NuevaFuncionalidadInput
): Promise<NuevaFuncionalidadResult> {
  // 1. Obtener configuración del modelo para esta funcionalidad
  const modelConfig = getModelConfig('nueva-funcionalidad');
  if (!modelConfig) {
    throw new Error('Configuración no encontrada para nueva-funcionalidad');
  }

  // 2. Obtener cliente base (común a todas las funcionalidades)
  const openai = getOpenAIClient();

  // 3. Lógica específica de esta funcionalidad
  const completion = await openai.chat.completions.create({
    model: modelConfig.model,
    messages: [
      ...(modelConfig.systemMessage
        ? [{ role: 'system', content: modelConfig.systemMessage }]
        : []),
      { role: 'user', content: 'Tu prompt aquí' },
    ],
    temperature: modelConfig.temperature,
    response_format: modelConfig.responseFormat === 'json_object'
      ? { type: 'json_object' }
      : undefined,
  });

  // 4. Procesar resultado y retornar
  return {
    // Resultado procesado
  };
}
```

### Paso 2: Añadir Configuración en `models.ts`

```typescript
// lib/ia/models.ts

export const FUNCTION_CONFIGS: Record<string, ModelConfig> = {
  // ... configuraciones existentes

  /**
   * Nueva Funcionalidad
   * - Descripción de qué hace
   * - Modelo apropiado: gpt-5, gpt-4.1, etc.
   * - Temperatura según necesidad
   */
  'nueva-funcionalidad': {
    model: MODELS.GPT_5, // o MODELS.GPT_4_1, etc.
    temperature: 0.4,
    responseFormat: 'json_object',
    systemMessage: 'Eres un asistente experto en...',
    maxTokens: 2000, // opcional
  },
};
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

✅ **Instalación y configuración base**:
- `getOpenAIClient()` - Cliente OpenAI único
- `isOpenAIAvailable()` - Verificar disponibilidad
- `MODELS` - Modelos disponibles
- `getModelConfig()` - Configuraciones por funcionalidad

### En `lib/ia/client.ts`

✅ **Cliente base común**:
- Singleton pattern (una sola instancia)
- Lazy initialization (no falla en build)
- Validación de API key

### En `lib/ia/models.ts`

✅ **Configuraciones centralizadas**:
- Definición de modelos disponibles
- Configuraciones por funcionalidad
- Helpers para usar configuraciones

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





