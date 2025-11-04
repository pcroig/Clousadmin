# 📚 DOCUMENTACIÓN - CLOUSADMIN

Esta carpeta contiene toda la documentación del proyecto organizada de forma clara y escalable.

## 📁 Estructura

```
docs/
├── README.md                    # Este archivo
├── ESTRUCTURA.md                # Explicación de la estructura del proyecto
├── ARQUITECTURA.md              # Decisiones arquitectónicas y estructura
├── API_REFACTORING.md           # Documentación de refactorización de APIs (2025-01-27)
├── HOOKS_REUTILIZABLES.md       # Documentación de hooks useApi y useMutation (2025-01-27)
├── EXPLICACION_LIMPIEZA.md      # Explicación educativa de la limpieza del proyecto
├── SETUP.md                     # Guía de configuración inicial
├── SETUP_AUTENTICACION.md       # Guía específica de autenticación
├── DESIGN_SYSTEM.md             # Sistema de diseño y UI (colores, tipografía, tokens)
├── DESIGN_PATTERNS.md           # Patrones de diseño unificados (uso de componentes)
├── PATRONES_CODIGO.md           # Patrones específicos de código
├── AWS_PATTERNS.md              # Patrones de integración AWS
├── AWS_EVENTBRIDGE_SETUP.md     # Configuración de AWS EventBridge
├── TROUBLESHOOTING.md           # Guía de resolución de problemas
│
├── funcionalidades/             # Documentación de cada funcionalidad
│   ├── ausencias.md
│   ├── fichajes.md
│   ├── jornadas.md
│   ├── autenticacion.md
│   ├── bandeja-entrada.md
│   ├── documentos.md
│   ├── festivos.md
│   └── analytics.md
│
│
├── daily/                       # Logs diarios de desarrollo (changelog)
│   ├── 2025-01-27-unificacion-diseno.md
│   └── 2025-01-27-integracion-componentes.md
│
├── troubleshooting/             # Guías específicas de troubleshooting
│   └── fichaje-jornada-iniciada.md
│
└── historial/                   # Documentación histórica (referencia)
    └── README.md                # Índice de documentación histórica
```

## 📖 Guías rápidas

### Para empezar
1. Lee `SETUP.md` para configurar el proyecto
2. Lee `ARQUITECTURA.md` para entender la estructura
3. Lee `DESIGN_SYSTEM.md` para UI/UX guidelines
4. Lee `DESIGN_PATTERNS.md` para patrones de diseño consistentes

### Para desarrollar
1. Las **máximas de desarrollo** están en `.cursorrules`
2. Los **patrones de código** están en `PATRONES_CODIGO.md`
3. Los **patrones de API** están en `API_REFACTORING.md` (refactorización 2025-01-27)
4. Los **patrones AWS** están en `AWS_PATTERNS.md`
5. La **documentación de funcionalidades** está en `funcionalidades/`
6. Los **logs diarios** están en `daily/`
7. Las **optimizaciones pendientes** están en `OPTIMIZACION_PENDIENTE.md`

### Para desplegar
1. Sigue `SETUP.md` sección "Despliegue"
2. Verifica las variables de entorno en `.env.example`

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
