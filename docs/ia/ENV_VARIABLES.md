# Variables de Entorno para IA

## Resumen

La plataforma Clousadmin soporta múltiples proveedores de IA con fallback automático:

- **OpenAI** (Recomendado) - Mejor calidad
- **Anthropic** (Claude) - Alta calidad, alternativa
- **Google AI** (Gemini) - Económico, fallback

**Al menos uno debe estar configurado** para habilitar funcionalidades de IA.

## Variables Requeridas

### OpenAI

```bash
OPENAI_API_KEY="sk-your-openai-api-key-here"
```

- Obtén tu API key en: https://platform.openai.com/api-keys
- La key debe empezar con `sk-`
- Modelos usados: GPT-4o, GPT-4o-mini

### Anthropic (Opcional)

```bash
ANTHROPIC_API_KEY="sk-ant-your-anthropic-api-key-here"
```

- Obtén tu API key en: https://console.anthropic.com/
- Modelos usados: Claude 3.5 Sonnet, Claude 3.5 Haiku

### Google AI (Opcional)

```bash
GOOGLE_AI_API_KEY="your-google-ai-api-key-here"
```

- Obtén tu API key en: https://makersuite.google.com/app/apikey
- Modelos usados: Gemini 1.5 Pro, Gemini 1.5 Flash

## Prioridad de Fallback

El sistema intenta los proveedores en este orden:

1. **OpenAI** (si está configurado)
2. **Anthropic** (si OpenAI falla o no está configurado)
3. **Google AI** (último fallback)

## Funcionalidades de IA Habilitadas

Con al menos un proveedor configurado:

- ✅ **Extracción de documentos**: Datos de contratos, DNI, documentos
- ✅ **Clasificación de nóminas**: Matching automático con empleados
- ✅ **Clasificación de fichajes**: Detección de anomalías
- ✅ **Optimización de vacaciones**: Algoritmo inteligente
- ✅ **Procesamiento de Excel**: Mapeo automático de columnas
- ✅ **Análisis de texto**: Generación, resúmenes, traducciones

## Costos Aproximados

### Por 1 millón de tokens

| Proveedor | Input | Output | Total (promedio) |
|-----------|-------|--------|------------------|
| **OpenAI GPT-4o** | $5 | $15 | $10 |
| **OpenAI GPT-4o-mini** | $0.15 | $0.6 | $0.375 |
| **Anthropic Claude 3.5** | $3 | $15 | $9 |
| **Anthropic Haiku** | $0.25 | $1.25 | $0.75 |
| **Google Gemini 1.5 Pro** | $1.25 | $5 | $3.125 |
| **Google Gemini Flash** | $0.075 | $0.3 | $0.1875 |

### Por funcionalidad (estimado por 1000 llamadas)

- **Extracción de documentos**: $10-50
- **Clasificación**: $1-5
- **Análisis de texto**: $0.50-2

## Configuración de Desarrollo

### Opción 1: OpenAI solamente (recomendado)

```bash
OPENAI_API_KEY="sk-your-key"
```

### Opción 2: Multi-proveedor (máxima disponibilidad)

```bash
OPENAI_API_KEY="sk-your-openai-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"
GOOGLE_AI_API_KEY="your-google-key"
```

### Opción 3: Económico (solo Google AI)

```bash
GOOGLE_AI_API_KEY="your-google-key"
```

## Validación

Al iniciar la aplicación, verás en los logs:

```bash
✅ [AI Client] Usando OpenAI (GPT-4o)
# o
✅ [AI Client] Usando Anthropic (Claude 3.5 Sonnet)
# o
⚠️  [ENV] No hay proveedores de IA configurados
```

## Solución de Problemas

### Error: "No hay proveedores de IA configurados"

**Causa**: Ninguna API key está configurada o son inválidas.

**Solución**:
1. Verifica que al menos una variable esté en `.env.local`
2. Verifica el formato de la key (OpenAI debe empezar con `sk-`)
3. Reinicia el servidor de desarrollo

### Error: "OpenAI error: Invalid API key"

**Causa**: La API key de OpenAI es inválida o ha expirado.

**Solución**:
1. Genera una nueva key en https://platform.openai.com/api-keys
2. Actualiza `OPENAI_API_KEY` en `.env.local`
3. Reinicia el servidor

### Funcionalidades de IA no funcionan

**Causa**: La función intenta usar un proveedor no configurado.

**Solución**:
1. Verifica los logs del servidor
2. Configura al menos un proveedor
3. El sistema debería hacer fallback automático

## Seguridad

⚠️ **IMPORTANTE**:

- NUNCA commitees archivos `.env` con API keys reales
- Usa `.env.local` para desarrollo
- Usa variables de entorno del sistema en producción
- Rota las API keys periódicamente
- Monitorea el uso de tokens en los dashboards de cada proveedor

## Archivo .env.local Ejemplo

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/clousadmin"

# AI Providers (al menos uno)
OPENAI_API_KEY="sk-your-openai-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"  # Opcional
GOOGLE_AI_API_KEY="your-google-key"  # Opcional

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
NEXTAUTH_SECRET="your-jwt-secret-min-32-chars"

# Hetzner Object Storage (S3-compatible)
# Ver docs/MIGRACION_HETZNER.md para configuración completa
STORAGE_ENDPOINT="https://fsn1.your-objectstorage.com"
STORAGE_REGION="eu-central-1"
STORAGE_ACCESS_KEY="your-access-key"
STORAGE_SECRET_KEY="your-secret-key"
STORAGE_BUCKET="clousadmin-docs"
ENABLE_CLOUD_STORAGE="true"
```

## Más Información

- [Arquitectura IA](./ARQUITECTURA_IA.md)
- [OpenAI Platform](https://platform.openai.com/)
- [Anthropic Console](https://console.anthropic.com/)
- [Google AI Studio](https://makersuite.google.com/)



















