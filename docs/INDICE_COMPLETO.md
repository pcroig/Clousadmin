# 📚 Índice Completo de Documentación - Clousadmin

**Última actualización**: 27 de enero de 2025  
**Total de documentos**: 136 archivos markdown

---

## 🎯 Documentación Principal

### Configuración Inicial
- **[SETUP.md](SETUP.md)** - ⭐ Guía completa de instalación y configuración
- **[INVITAR_USUARIOS.md](INVITAR_USUARIOS.md)** - Flujo de invitaciones y alta de usuarios
- **[SETUP_GOOGLE_OAUTH.md](SETUP_GOOGLE_OAUTH.md)** - Configuración de Google OAuth y Calendar
- **[SETUP_PLANTILLAS.md](SETUP_PLANTILLAS.md)** - Sistema de plantillas de documentos

### Arquitectura y Estructura
- **[ARQUITECTURA.md](ARQUITECTURA.md)** - Decisiones arquitectónicas y estructura técnica
- **[ESTRUCTURA.md](ESTRUCTURA.md)** - Estructura actual del proyecto
- **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** - Sistema de diseño UI/UX y patrones de componentes
- **[PATRONES_CODIGO.md](PATRONES_CODIGO.md)** - Convenciones de código TypeScript/Next.js
- **[API_REFACTORING.md](API_REFACTORING.md)** - Patrones de API centralizados
- **[HOOKS_REUTILIZABLES.md](HOOKS_REUTILIZABLES.md)** - Hooks compartidos useApi/useMutation

### Despliegue y Producción
- **[DEPLOY_HETZNER.md](DEPLOY_HETZNER.md)** - Guía completa de despliegue en Hetzner
- **[PRODUCCION_CHECKLIST.md](PRODUCCION_CHECKLIST.md)** - Checklist de producción
- **[NGINX_SETUP.md](NGINX_SETUP.md)** - Configuración de Nginx
- **[DISASTER_RECOVERY.md](DISASTER_RECOVERY.md)** - Recuperación ante desastres
- **[RUNBOOK.md](RUNBOOK.md)** - Runbook operacional
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Resolución de problemas recurrentes
- **[TROUBLESHOOTING_PROD.md](TROUBLESHOOTING_PROD.md)** - Troubleshooting en producción
- **[HETZNER_TROUBLESHOOTING.md](HETZNER_TROUBLESHOOTING.md)** - Troubleshooting específico de Hetzner

### Configuración
- **[CONFIGURACION_SEGURIDAD.md](CONFIGURACION_SEGURIDAD.md)** - Checklist y configuración de seguridad
- **[CONFIGURACION_RESEND.md](CONFIGURACION_RESEND.md)** - Configuración de emails con Resend
- **[CONFIGURACION_CRON_GITHUB.md](CONFIGURACION_CRON_GITHUB.md)** - Configuración de cron jobs
- **[SEGURIDAD_SECRETS.md](SEGURIDAD_SECRETS.md)** - Gestión de secretos y variables de entorno

### Migraciones
- **[MIGRACION_HETZNER.md](MIGRACION_HETZNER.md)** - Guía de migración a Hetzner
- **[CHECKLIST_MIGRACION_HETZNER.md](CHECKLIST_MIGRACION_HETZNER.md)** - Checklist de migración
- **[MIGRACION_DOCUMENTOS_S3.md](MIGRACION_DOCUMENTOS_S3.md)** - Migración de documentos a S3

### Optimización y Performance
- **[OPTIMIZACION.md](OPTIMIZACION.md)** - ⭐ Estado general de optimizaciones
- **[OPTIMIZACION_RENDIMIENTO.md](OPTIMIZACION_RENDIMIENTO.md)** - Detalles técnicos de optimización
- **[AUDITORIA_OPTIMIZACION.md](AUDITORIA_OPTIMIZACION.md)** - Auditoría de código y aprobación
- **[AUDITORIA_SEGURIDAD.md](AUDITORIA_SEGURIDAD.md)** - Auditorías de seguridad vigentes
- **[RESUMEN_SEGURIDAD_IMPLEMENTADA.md](RESUMEN_SEGURIDAD_IMPLEMENTADA.md)** - Estado de medidas de seguridad

### Mobile
- **[MOBILE_OPTIMIZACION.md](MOBILE_OPTIMIZACION.md)** - ⭐ Guía principal de adaptación mobile
- **[MOBILE_ADAPTATION_SUMMARY.md](MOBILE_ADAPTATION_SUMMARY.md)** - Resumen ejecutivo mobile
- **[MOBILE_COMPONENTS_GUIDE.md](MOBILE_COMPONENTS_GUIDE.md)** - Guía de componentes responsive
- **[MOBILE_FORM_COMPONENTS.md](MOBILE_FORM_COMPONENTS.md)** - Formularios optimizados para touch
- **[MOBILE_PERFORMANCE_OPTIMIZATIONS.md](MOBILE_PERFORMANCE_OPTIMIZATIONS.md)** - Optimizaciones de rendimiento mobile
- **[MOBILE_TESTING_PLAN.md](MOBILE_TESTING_PLAN.md)** - Plan de testing mobile
- **[MOBILE_UX_PATTERNS.md](MOBILE_UX_PATTERNS.md)** - Patrones UX mobile
- **[MODAL_MIGRATION_GUIDE.md](MODAL_MIGRATION_GUIDE.md)** - Guía de migración de modales

### Testing
- **[TESTING_PLAN_STATUS.md](TESTING_PLAN_STATUS.md)** - ⭐ Estado actual del plan de testing
- **[TESTING_SUMMARY.md](TESTING_SUMMARY.md)** - Resumen ejecutivo de tests implementados
- **[EVALUACION_PLAN_TESTING.md](EVALUACION_PLAN_TESTING.md)** - Evaluación crítica del plan

### CI/CD
- **[CI_CD.md](CI_CD.md)** - Configuración de CI/CD

### Rate Limiting
- **[RATE_LIMITING.md](RATE_LIMITING.md)** - Sistema de rate limiting

---

## 📁 Documentación por Categoría

### Funcionalidades (`funcionalidades/`)
- **[analytics.md](funcionalidades/analytics.md)** - Analytics HR y reporting
- **[ausencias.md](funcionalidades/ausencias.md)** - Gestión de ausencias
- **[autenticacion.md](funcionalidades/autenticacion.md)** - ⭐ Autenticación y onboarding
- **[bandeja-entrada.md](funcionalidades/bandeja-entrada.md)** - Bandeja de entrada
- **[billing.md](funcionalidades/billing.md)** - Pasarela de pago con Stripe
- **[calendario.md](funcionalidades/calendario.md)** - Calendario laboral
- **[canal-denuncias.md](funcionalidades/canal-denuncias.md)** - Sistema de denuncias internas
- **[documentos.md](funcionalidades/documentos.md)** - Gestión documental
- **[documentos-procesos-onboarding-offboarding.md](funcionalidades/documentos-procesos-onboarding-offboarding.md)** - Documentos en procesos
- **[festivos.md](funcionalidades/festivos.md)** - Gestión de festivos
- **[fichajes.md](funcionalidades/fichajes.md)** - Fichajes y control horario
- **[fichajes-estados-flujo.md](funcionalidades/fichajes-estados-flujo.md)** - Estados y flujo de fichajes
- **[gestion-nominas.md](funcionalidades/gestion-nominas.md)** - Motor de nóminas
- **[importacion-empleados-excel.md](funcionalidades/importacion-empleados-excel.md)** - Importación masiva de empleados
- **[importacion-puestos-zip.md](funcionalidades/importacion-puestos-zip.md)** - Importación de puestos
- **[jornadas.md](funcionalidades/jornadas.md)** - Jornadas laborales
- **[offboarding.md](funcionalidades/offboarding.md)** - Proceso de offboarding
- **[onboarding-documentos.md](funcionalidades/onboarding-documentos.md)** - Documentos en onboarding

### API (`api/`)
- **[README.md](api/README.md)** - ⭐ Documentación general de la API
- **[API_CHANGELOG.md](api/API_CHANGELOG.md)** - Changelog de la API
- **[authentication.md](api/authentication.md)** - Autenticación en API
- **[errors.md](api/errors.md)** - Manejo de errores
- **[reference/empleados.md](api/reference/empleados.md)** - Referencia de endpoints de empleados
- **[reference/webhooks.md](api/reference/webhooks.md)** - Referencia de webhooks

### IA (`ia/`)
- **[README.md](ia/README.md)** - ⭐ Documentación general del sistema de IA
- **[ARQUITECTURA_IA.md](ia/ARQUITECTURA_IA.md)** - Arquitectura del sistema de IA
- **[ENV_VARIABLES.md](ia/ENV_VARIABLES.md)** - Variables de entorno para IA

### Especificaciones (`especificaciones/`)
- **[README.md](especificaciones/README.md)** - Índice de especificaciones
- **[firma-digital.md](especificaciones/firma-digital.md)** - Firma digital
- **[firma-digital-README.md](especificaciones/firma-digital-README.md)** - README de firma digital
- **[firma-digital-resumen.md](especificaciones/firma-digital-resumen.md)** - Resumen de firma digital
- **[plantillas-documentos.md](especificaciones/plantillas-documentos.md)** - Plantillas de documentos
- **[plantillas-documentos-checklist.md](especificaciones/plantillas-documentos-checklist.md)** - Checklist de plantillas
- **[plantillas-documentos-implementacion.md](especificaciones/plantillas-documentos-implementacion.md)** - Implementación de plantillas
- **[plantillas-documentos-resumen.md](especificaciones/plantillas-documentos-resumen.md)** - Resumen de plantillas

### Notificaciones (`notificaciones/`)
- **[README.md](notificaciones/README.md)** - Sistema de notificaciones
- **[sugerencias-futuras.md](notificaciones/sugerencias-futuras.md)** - Sugerencias futuras

### Cron Jobs (`cron/`)
- **[INVENTARIO.md](cron/INVENTARIO.md)** - Inventario de cron jobs
- **[VER_LOGS.md](cron/VER_LOGS.md)** - Cómo ver logs de cron jobs

### Tests (`tests/`)
- **[E2E.md](tests/E2E.md)** - Tests end-to-end
- **[SMOKE_TESTS.md](tests/SMOKE_TESTS.md)** - Smoke tests

### Daily Logs (`daily/`)
- **[2025-01-27-integracion-componentes.md](daily/2025-01-27-integracion-componentes.md)**
- **[2025-01-27-unificacion-diseno.md](daily/2025-01-27-unificacion-diseno.md)**
- **[2025-10-consolidado.md](daily/2025-10-consolidado.md)**
- **[2025-11-05-fix-email-duplicado.md](daily/2025-11-05-fix-email-duplicado.md)**
- **[2025-11-11-refactor-gestion-nominas.md](daily/2025-11-11-refactor-gestion-nominas.md)**
- **[2025-11-23-prod-parity.md](daily/2025-11-23-prod-parity.md)**

### Historial (`historial/`)
- **[README.md](historial/README.md)** - ⭐ Índice de documentación histórica
- Ver [historial/README.md](historial/README.md) para lista completa

### Auditorías (`auditorias/`)
- **[AUDITORIA_DATA_PLATFORM_2025-11-16.md](auditorias/AUDITORIA_DATA_PLATFORM_2025-11-16.md)** - Auditoría de data platform

### Revisiones (`revisiones/`)
- **[revision-fichajes-2025-01-18.md](revisiones/revision-fichajes-2025-01-18.md)** - Revisión de fichajes

### Análisis (`analisis/`)
- **[firma-digital-y-plantillas-estado.md](analisis/firma-digital-y-plantillas-estado.md)** - Estado de firma digital y plantillas

### Migraciones (`migraciones/`)
- **[2025-11-16-encriptar-empleados.md](migraciones/2025-11-16-encriptar-empleados.md)** - Migración de encriptación

---

## 🔍 Búsqueda Rápida

### Por Tema
- **Autenticación**: `funcionalidades/autenticacion.md`, `SETUP_GOOGLE_OAUTH.md`, `INVITAR_USUARIOS.md`
- **Mobile**: `MOBILE_OPTIMIZACION.md` (principal) + 7 archivos relacionados
- **Optimización**: `OPTIMIZACION.md` (principal) + 2 archivos relacionados
- **Seguridad**: `CONFIGURACION_SEGURIDAD.md`, `AUDITORIA_SEGURIDAD.md`, `RESUMEN_SEGURIDAD_IMPLEMENTADA.md`
- **Testing**: `TESTING_PLAN_STATUS.md` (principal) + 2 archivos relacionados
- **API**: `api/README.md` + archivos en `api/`
- **Despliegue**: `DEPLOY_HETZNER.md`, `PRODUCCION_CHECKLIST.md`

### Por Tipo de Documento
- **Guías de configuración**: `SETUP*.md`, `CONFIGURACION_*.md`
- **Arquitectura**: `ARQUITECTURA.md`, `ESTRUCTURA.md`, `DESIGN_SYSTEM.md`
- **Funcionalidades**: `funcionalidades/*.md`
- **Referencia técnica**: `api/`, `PATRONES_CODIGO.md`, `HOOKS_REUTILIZABLES.md`
- **Operaciones**: `DEPLOY_*.md`, `TROUBLESHOOTING*.md`, `RUNBOOK.md`
- **Histórico**: `historial/`, `daily/`

---

## 📊 Estadísticas

- **Total de documentos**: 136 archivos markdown
- **Documentación activa**: ~100 archivos
- **Documentación histórica**: ~36 archivos (en `historial/`)
- **Última actualización general**: 27 de enero de 2025

---

**Nota**: Este índice se actualiza periódicamente. Para la versión más reciente, consultar [README.md](README.md).

