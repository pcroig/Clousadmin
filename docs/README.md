# 📚 DOCUMENTACIÓN - CLOUSADMIN

Esta carpeta contiene toda la documentación del proyecto organizada de forma clara y escalable.

## 📁 Estructura

```
docs/
├── README.md                         # Este archivo
├── ARQUITECTURA.md                   # Decisiones arquitectónicas y estructura
├── API_REFACTORING.md                # Refactorización de patrones API (2025-01-27)
├── AUDITORIA_SEGURIDAD.md            # Auditorías de seguridad vigentes
├── CONFIGURACION_SEGURIDAD.md        # Checklist y configuración de seguridad
├── DESIGN_SYSTEM.md                  # Sistema de diseño UI/UX + patrones de componentes
├── ESTRUCTURA.md                     # Estructura actual del proyecto
├── HOOKS_REUTILIZABLES.md            # Hooks compartidos useApi/useMutation
├── INVITAR_USUARIOS.md              # Flujo de invitaciones y alta de usuarios
├── MIGRACION_ENUMS_Y_DEPARTAMENTO.md # Histórico de migraciones críticas
├── MIGRACION_HETZNER.md              # Guía de migración a Hetzner
├── CHECKLIST_MIGRACION_HETZNER.md    # Checklist de migración
├── PRODUCCION_CHECKLIST.md           # Checklist de producción
├── NGINX_SETUP.md                    # Configuración de Nginx
├── DISASTER_RECOVERY.md              # Recuperación ante desastres
├── RUNBOOK.md                        # Runbook operacional
├── TROUBLESHOOTING_PROD.md           # Troubleshooting en producción
├── MIGRACION_DOCUMENTOS_S3.md        # Migración de documentos a S3
├── RESUMEN_SEGURIDAD_IMPLEMENTADA.md # Estado de medidas de seguridad
├── SETUP.md                          # Guía de configuración inicial (incluye autenticación)
├── SETUP_GOOGLE_OAUTH.md            # Configuración de Google OAuth y Calendar
├── SETUP_PLANTILLAS.md              # Configuración del sistema de plantillas
├── MOBILE_OPTIMIZACION.md           # Sistema de diseño mobile + plan de mejoras + guía rápida
├── TROUBLESHOOTING.md                # Resolución de problemas recurrentes
│
├── daily/                            # Logs diarios y consolidado por mes
│   ├── 2025-01-27-integracion-componentes.md
│   ├── 2025-01-27-unificacion-diseno.md
│   ├── 2025-10-consolidado.md
│   └── 2025-11-05-fix-email-duplicado.md
│
├── funcionalidades/                  # Documentación de cada funcionalidad
│   ├── analytics.md
│   ├── ausencias.md
│   ├── autenticacion.md
│   ├── bandeja-entrada.md
│   ├── canal-denuncias.md            # ✨ NUEVO: Sistema de denuncias internas
│   ├── documentos.md
│   ├── festivos.md
│   ├── fichajes.md
│   ├── gestion-nominas.md
│   ├── importacion-empleados-excel.md # ✨ Importación masiva de empleados desde Excel
│   ├── importacion-puestos-zip.md
│   ├── jornadas.md
│   ├── offboarding.md
│   └── onboarding-documentos.md
│
├── historial/                        # Documentación histórica y migraciones
│   ├── 2025-10-consolidado.md
│   ├── AUTO_COMPLETADO_FICHAJES.md
│   ├── EVALUACION_OPTIMIZACION_MODELOS.md
│   ├── EVALUACION_OPTIMIZACION_MODELOS_V2.md
│   ├── FASE1_OPTIMIZACIONES_APLICADAS.md
│   ├── LIMPIEZA_PLAN.md
│   ├── MIGRACIONES_ESTADOS_COMPLETADAS.md
│   ├── REVISION_RELACIONES_CAMBIOS.md
│   └── README.md
│
├── ia/                               # Arquitectura y configuración IA
│   ├── ARQUITECTURA_IA.md
│   ├── ENV_VARIABLES.md
│   └── README.md
│
└── notificaciones/                   # Diseño de notificaciones internas
    ├── README.md
    └── sugerencias-futuras.md
```

## 📖 Guías rápidas

### Para empezar
1. Lee `SETUP.md` para configurar el proyecto (incluye autenticación)
2. Revisa `ARQUITECTURA.md` para entender la estructura vigente
3. Consulta `DESIGN_SYSTEM.md` para UI/UX y patrones de componentes
4. Revisa `PATRONES_CODIGO.md` para convenciones de TypeScript/Next.js
5. Para Google OAuth: `SETUP_GOOGLE_OAUTH.md`
6. Para plantillas: `SETUP_PLANTILLAS.md`
7. Para optimizaciones mobile: `MOBILE_OPTIMIZACION.md`

### Para desarrollar
1. Las **máximas de desarrollo** están en `.cursorrules`
2. Los **patrones de código** están en `PATRONES_CODIGO.md`
3. Los **patrones de API** están en `API_REFACTORING.md` (refactorización 2025-01-27)
4. La **documentación de funcionalidades** está en `funcionalidades/`
5. Los **logs diarios** y consolidado mensual están en `daily/`
6. El **análisis completo de rendimiento** está en `historial/ANALISIS_RENDIMIENTO_COMPLETO.md` (referencia histórica)

### Para desplegar
1. Sigue `SETUP.md` sección "Despliegue"
2. Verifica las variables de entorno en `.env.example` y `ia/ENV_VARIABLES.md` si aplica
3. Consulta `DEPLOY_HETZNER.md` para despliegue en producción
4. Revisa `PRODUCCION_CHECKLIST.md` antes de desplegar

---

---

## 📚 Documentación Histórica

Los archivos históricos y versiones antiguas se encuentran en `docs/historial/`. Esta carpeta contiene:
- Versiones antiguas de documentación
- Resúmenes de migraciones completadas
- Análisis y evaluaciones históricas
- Especificaciones y tests obsoletos

Ver [docs/historial/README.md](historial/README.md) para el índice completo.

---

**Nota**: La documentación activa y actualizada está en la raíz de `docs/`. Los archivos históricos se conservan únicamente como referencia.
