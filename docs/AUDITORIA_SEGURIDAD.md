# Auditoría de Seguridad - Clousadmin

**Fecha**: 2025-01-27  
**Última actualización**: 27 de enero de 2025  
**Estado**: ✅ Completada

> **Nota**: Este documento contiene la auditoría completa. Para configuración práctica:
> - [`CONFIGURACION_SEGURIDAD.md`](CONFIGURACION_SEGURIDAD.md) - Guía de configuración
> - [`RESUMEN_SEGURIDAD_IMPLEMENTADA.md`](RESUMEN_SEGURIDAD_IMPLEMENTADA.md) - Resumen ejecutivo

---

## Hallazgos Críticos

### 1. Vulnerabilidades de Login

**Estado**: ✅ Resuelto (nov 2025)  
**Archivo**: `app/(auth)/login/actions.ts`

#### Problemas Identificados (enero 2025):
- ~~No hay rate limiting~~ → `rateLimitLogin` con ventana corta + horaria (L14-L29)
- ~~Timing attack posible~~ → Retardo mínimo constante de 200 ms (L32-L52)
- ~~No hay logging de intentos fallidos~~ → Logging controlado sin datos sensibles (L148-L151)
- ~~Error revela existencia de email~~ → Respuestas genéricas (`Credenciales incorrectas`)

#### Impacto residual:
- Bajo: mantener monitoreo de logs y alertas de rate limiting

---

### 2. Gestión de Sesiones

**Estado**: ✅ Resuelto (nov 2025)  
**Archivo**: `lib/auth.ts`

#### Problemas Identificados (enero 2025):
- ~~No hay invalidación al cambiar contraseña~~ → `loginAction` elimina sesiones previas
- ~~Sesiones de 7 días sin renovación~~ → `sesionActiva` controla expiración y `ultimoUso`
- ~~No hay registro de sesiones activas~~ → `getUserActiveSessions` disponible
- ~~Sesión no se invalida si usuario se desactiva~~ → `getSession()` consulta BD y elimina sesión

#### Impacto residual:
- Evaluar reducir duración de sesión a 72 h en producción

---

### 3. Middleware de Seguridad

**Estado**: ✅ Resuelto (nov 2025)  
**Archivo**: `middleware.ts`

#### Problemas Identificados (enero 2025):
- ~~Solo verifica usuario activo del token~~ → `getSession()` revalida contra BD
- ~~No actualiza "último uso"~~ → Actualización en `sesionActiva.update`
- ~~No verifica que sesión existe en BD~~ → Hash del token buscado en `sesionActiva`

#### Impacto residual:
- Añadir métricas de expiración vs. uso real para detectar sesiones huérfanas

---

### 4. Exposición de Datos Sensibles

**Archivos**:
- `app/(dashboard)/hr/organizacion/personas/[id]/page.tsx`
- `app/(dashboard)/hr/organizacion/personas/page.tsx`
- `app/api/empleados/route.ts`

**Estado**: 🚧 Pendiente  
#### Problemas vigentes:
- **Datos sin encriptar en BD**: IBAN, NIF, NSS siguen almacenados sin cifrar en altas/updates
- **Datos sensibles en respuestas API**: Endpoints HR devuelven todos los campos → crear proyecciones `select`
- **Potencial exposición en logs**: Revisar `handleApiError` para sanitizar stacktraces

#### Impacto:
- Crítico: Breach de BD expone datos sensibles directamente
- Alto: Logs pueden contener datos sensibles si no se sanitiza

---

### 5. Autorización y Control de Acceso

**Estado**: ⚠️ En seguimiento  
**Archivo**: `lib/api-handler.ts`

#### Problemas Identificados:
- **No hay auditoría de accesos**: Pendiente definir almacenamiento + dashboards
- **Verificación `empresaId` puede olvidarse**: Helpers existen (`verifyEmpresaAccess`) pero falta revisión 100 %

#### Impacto:
- Alto: Sin auditoría, difícil detectar accesos no autorizados
- Medio: Riesgo de olvidar filtro `empresaId` en nuevas queries

---

## Recomendaciones por Prioridad

### Críticas (Implementar YA)
1. ✅ **Rate Limiting** (completado nov 2025)
2. ✅ **Sesiones Mejoradas** (completado nov 2025)
3. 🚧 **Encriptación de Datos** (IBAN/NIF/NSS en altas todavía sin cifrar)
4. ✅ **Verificación Usuario Activo** (middleware consulta BD)

### Altas (Esta semana)
5. 🚧 **Auditoría de Accesos**: Diseñar tabla + reporting
6. ✅ **Estandarizar tiempos de respuesta** (login)
7. ⚠️ **Headers de Seguridad**: Documentar CSP/HSTS mínimos

### Medias (Este mes)
8. ⏳ **Logging estructurado**: Evitar datos sensibles en logs
9. ⏳ **Sanitización de errores**: No revelar información interna
10. ⏳ **Tests de seguridad**: Casos edge de autenticación

---

## Estado de Implementación

- [x] Fase 1: Auditoría completada
- [x] Fase 2: Rate limiting
- [x] Fase 3: Sesiones mejoradas  
- [ ] Fase 4: Encriptación
- [ ] Fase 5: Auditoría GDPR
- [ ] Fase 6: Funcionalidades GDPR
- [ ] Fase 7: Headers seguridad
- [ ] Fase 8: Testing
- [ ] Fase 9: Migración datos

---

**Próximos pasos**:
- Priorizar Fase 4 (cifrado y proyección de datos sensibles)
- Planificar implementación de auditoría de accesos (Fase 5) y cabeceras CSP/HSTS

---

**Última actualización**: 7 de noviembre 2025








