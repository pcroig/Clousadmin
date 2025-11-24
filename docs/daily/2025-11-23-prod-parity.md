<!-- Diagnóstico de compilación Next.js / Prisma - 2025-11-23 -->

# Inventario de errores `tsc --noEmit`

## 1. Parsing JSON / `unknown`
- **Origen**: `@total-typescript/ts-reset` fuerza `Request.json()` y `Response.json()` a devolver `unknown`.
- **Impacto**:
  - Más de 40 rutas en `app/api/**` (`empleados`, `fichajes`, `campanas-vacaciones`, `nominas`, `plantillas`, etc.).
  - Hooks y componentes (`components/hr/*`, `lib/hooks/use-mutation.ts`, `lib/hooks/useNotificaciones.ts`, etc.).
- **Acción**: migrar a utilidades tipadas (`parseJson`, `parseJsonSafe`, `parseJsonString`, `getJsonBody<T>`).

## 2. Prisma JSON / Nullables
- **Errores**: asignaciones directas de `null` o `Record<string, unknown>` a campos `Json` y `NullableJson`.
- **Ubicaciones clave**:
  - `app/api/campanas-vacaciones/**/*`, `lib/empleados/anonymize.ts`, `lib/stripe/webhook-handlers.ts`, `lib/onboarding*.ts`.
- **Acción**: usar `lib/prisma/json.ts` (`JSON_NULL`, `DB_NULL`, `asJsonValue`).

## 3. Selects / tipos Prisma desincronizados
- **Casos**:
  - Enums o campos inexistentes (`TipoFichajeEvento`, `PlantillaWhereInput`, `empleado.jornadaId`, `empleado.saldosAusencias`).
  - `select/include` que no reflejan el schema actual.
- **Acción**: revisar `prisma/schema.prisma`, actualizar selects y tipos derivados.

## 4. Modelos compartidos inconsistentes
- **Ejemplos**:
  - `DocumentList` vs datos reales (`tipoDocumento`, `tamano`, `mimeType`).
  - `ResultadoGeneracion`, `FirmanteInput`, `ActionItem` no alineados con las respuestas API.
- **Acción**: centralizar en `types/` o componentes compartidos.

## 5. Integraciones externas
- **SDKs**: OpenAI/Anthropic/Gemini (nuevos tipos `ChatCompletionMessageParam`), Google Calendar (propiedades renombradas), Stripe (`apiVersion` vetusta).
- **Errores concretos**: `files.del`, `calendar.events.insert` sin campos opcionales, `SafetyRating` sin tipado JSON.
- **Acción**: actualizar adaptadores y tipos auxiliares.

## 6. Falta de librerías de tipos
- `next.config.ts` sin declaraciones para `next-pwa`.
- **Acción**: añadir `@types/next-pwa` o declaración en `types/next-pwa.d.ts`.

## 7. Streams y Node APIs
- `ReadableStream` (Web vs Node) en `app/api/documentos/route.ts`, `app/api/upload/route.ts`, `lib/s3.ts`.
- **Acción**: envolver en `ReadableStream.fromWeb` o usar `node:stream/web`.

## Priorización
1. Parsing JSON (desbloquea la mayoría de errores `unknown`).
2. Prisma JSON helpers.
3. Selects/enums desincronizados.
4. Modelos compartidos + integraciones externas.
5. Tipos faltantes (`next-pwa`) y streams Node/Web.

