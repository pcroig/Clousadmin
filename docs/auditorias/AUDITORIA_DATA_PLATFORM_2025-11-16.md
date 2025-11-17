# 📋 Auditoría Data Platform – 16 nov 2025

## Alcance
- Revisar wiring real (código) de cifrado, auditoría, filtros multi-tenant, rate limiting y métricas, contrastándolo con la documentación vigente.
- Identificar desviaciones que impacten seguridad, gobernanza o coherencia de datos antes de producción.

## Hallazgos críticos

1. **Documentación de cifrado desactualizada**
   - `docs/CONFIGURACION_SEGURIDAD.md` indica que los endpoints aún no aplican cifrado (`L44-L52:docs/CONFIGURACION_SEGURIDAD.md`).
   - El código sí cifra en altas, updates e importaciones (`L200-L216:app/api/empleados/route.ts`, `L252-L316:app/api/empleados/importar-excel/confirmar/route.ts`, `L600-L650:lib/onboarding.ts`).
   - Riesgo: equipos confían en documentación errónea → dificulta auditorías y puede provocar integraciones duplicadas/inconsistentes.

2. **GET `/api/empleados` entrega campos encriptados**
   - Endpoint retorna directamente los registros Prisma sin `decryptEmpleadoData` (`L21-L74:app/api/empleados/route.ts`).
   - Pages server-side sí desencriptan (`L40-L98:app/(dashboard)/hr/organizacion/personas/page.tsx`), pero cualquier consumidor de la API recibe IBAN/NIF cifrados, inutilizando el endpoint y fomentando workarounds.

3. **Descarga/eliminación de documentos sin filtro `empresaId`**
   - `prisma.documento.findUnique({ where: { id } })` en `/api/documentos/[id]` no valida multi-tenant (`L24-L75:app/api/documentos/[id]/route.ts`).
   - `puedeAccederACarpeta` tampoco compara `empresaId` (`L160-L210:lib/documentos.ts`) y concede acceso a cualquier HR Admin. Un HR de otra empresa puede descargar/eliminar un documento sabiendo el UUID.

4. **Rate limiting solo existe para login**
   - Helpers `requireRateLimit*` están definidos pero no se usan en rutas (`L262-L296:lib/api-handler.ts`). Única protección real es `rateLimitLogin` en `/login`.
   - Riesgo: cualquier API (uploads, IA, analytics) puede ser saturada con pocas IPs, afectando SLA y cost.

5. **Auditoría de accesos no cableada**
   - `registrarAcceso` y utilidades relacionadas existen (`L1-L188:lib/auditoria.ts`) pero ningún endpoint las invoca (búsqueda global no devuelve usos).
   - No hay API/UI interna para consultar `auditoriaAcceso`, incumpliendo plan GDPR Fase 5.

6. **CSP demasiado restrictivo para `connect-src`**
   - `next.config.ts` fija `connect-src 'self'` (`L70-L89:next.config.ts`), pero la app consume Hetzner S3, OpenAI, Anthropic, Resend, etc.
   - En entornos estrictos bloqueará fetch/subidas; hoy funciona porque la cabecera no está activada en dev y los navegadores ignoran? pero en prod HSTS/CSP quedará roto.

7. **Logs y errores aún exponen datos sensibles**
   - `handleApiError` registra toda la excepción (`L171-L207:lib/api-handler.ts`) y helpers como `sanitizeEmpleadoForLogs` nunca se usan.
   - Múltiples rutas imprimen payloads (ej. `console.log` en importaciones) sin redactar IBAN/NIF → riesgo de fuga vía logs.

## Hallazgos adicionales

- `requireRateLimit` nunca identifica el tipo de operación (lectura/escritura por ruta); al adoptarlo habrá que definir identificadores más granulados (empresaId+IP) para evitar falsos positivos.
- `app/api/documentos` (upload/listado) usa `getSession` directo, pero no centraliza rate limit ni registra accesos.
- No hay inventario único de cron jobs: scripts `scripts/hetzner/setup-cron.sh`, GitHub Action `cron-revisar-solicitudes`, y endpoints `/api/cron/*` divergen.

## Próximos pasos sugeridos

1. Actualizar documentación de seguridad reflejando cifrado real y diferenciar qué campos siguen pendientes (salarios).
2. Desencriptar en GET `/api/empleados` y revisar contratos públicos para evitar respuestas cifradas.
3. Añadir filtros `empresaId` y verificación de carpeta en `/api/documentos/[id]` + endurecer `puedeAccederACarpeta`.
4. Integrar `requireRateLimit*` en endpoints sensibles (upload, documentos, analytics, IA) y definir identificadores específicos.
5. Cablear `registrarAcceso` en operaciones sobre empleados/documentos/nóminas y exponer tabla interna básica para HR Admin.
6. Revisar CSP para incluir dominios necesarios (`STORAGE_ENDPOINT`, `api.openai.com`, `api.resend.com`, etc.) y habilitar HSTS solo en prod.
7. Adoptar `sanitizeEmpleadoForLogs` en handlers y filtrar datos antes de cualquier `console.log`.



