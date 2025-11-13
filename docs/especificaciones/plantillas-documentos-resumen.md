# 📊 Plantillas de Documentos - Resumen Ejecutivo

**Proyecto**: Clousadmin  
**Fecha**: 12 de Noviembre 2025  
**Objetivo**: Sistema de plantillas con variables para automatizar generación de documentos

---

## 🎯 Resumen Rápido

### 🔧 Estado actual (enero 2026)
- **Producción**: motor de plantillas **DOCX con variables** (docxtemplater). Es el flujo oficial hoy.
- **En pausa documentada**: motor **PDF rellenable**. El código base (`lib/plantillas/pdf-rellenable.ts`, API `/api/plantillas/[id]/escanear-campos`) está implementado parcialmente pero **deshabilitado hasta nueva fase**. Falta UI de mapeo persistente y QA, por lo que no se expone todavía.
- **Escenarios descartados**: generación “híbrida” (DOCX→PDF con Vision) queda fuera del alcance.

### ¿Qué es?
Un sistema que permite:
1. **Crear plantillas de documentos** con variables (ej: `{{empleado_nombre}}`)
2. **Generar documentos automáticamente** sustituyendo variables por datos reales
3. **Distribuir masivamente** documentos a empleados
4. **Tracking completo** de generación y entrega

### ¿Para qué sirve?
- ✅ **Ahorro de tiempo**: Generar 50 contratos en 1 click en lugar de rellenar manualmente
- ✅ **Menos errores**: Datos extraídos automáticamente de la BD
- ✅ **Compliance**: Plantillas oficiales (Modelo 145, 190) siempre actualizadas
- ✅ **Automatización**: Integrado con contratos, nóminas, ausencias

---

## 📊 Comparativa: Clousadmin vs Competidor (Factorial)

| Funcionalidad | Factorial | Clousadmin MVP | Notas |
|---------------|-----------|----------------|-------|
| **Plantillas oficiales predefinidas** | ✅ | ✅ | Modelo 145, contratos, etc. |
| **Plantillas personalizadas (empresa)** | ✅ | ✅ | Subir DOCX con variables |
| **Variables automáticas (datos empleado)** | ✅ (60+) | ✅ (50+) | Datos personales, contrato, empresa |
| **Generación masiva** | ✅ | ✅ | Múltiples empleados a la vez |
| **Previsualización con datos** | ✅ | ✅ Fase 2 | Ver documento antes de generar |
| **Formato DOCX con variables** | ✅ | ✅ | Plantillas en Word |
| **PDFs rellenables** | ✅ | ⚠️ Fase 3 | Campos de formulario en PDF |
| **Plantillas híbridas (variables + formulario)** | ✅ | ⚠️ Fase 3 | DOCX → PDF con formulario |
| **Firma digital** | ✅ | ⚠️ Fase 4 | Lo defines por separado |
| **Campos personalizados como variables** | ✅ | ❌ MVP | Solo campos estándar de BD |
| **Sistema de permisos por variable** | ✅ | ⚠️ Fase 2 | Indicadores verde/naranja/rojo |
| **Editor visual de plantillas** | ❌ | ❌ | Ambos usan Word externo |
| **Integración con módulos** | ⚠️ | ✅ | Contratos, ausencias, nóminas |
| **Tracking de generación** | ⚠️ | ✅ | Auditoría completa GDPR |

**Leyenda**:
- ✅ Incluido
- ⚠️ Parcial o Fase posterior
- ❌ No incluido

---

## 🚀 Lo Que Vamos a Hacer (MVP)

### Fase 1: Básico Funcional (Prioridad ALTA)
**Duración**: 1.5 semanas

**Incluye**:
1. ✅ **4 Plantillas oficiales predefinidas**:
   - Contrato Indefinido
   - Modelo 145 (IRPF)
   - Justificante de Vacaciones
   - Carta de Bienvenida

2. ✅ **50+ Variables del sistema**:
   - Empleado: nombre, NIF, dirección, IBAN, etc.
   - Empresa: nombre, CIF, dirección, etc.
   - Contrato: salario, puesto, fecha inicio, etc.
   - Sistema: fecha actual, año actual, etc.

3. ✅ **Generación masiva**:
   - Seleccionar empleados (todos, por equipo, manual)
   - Configurar nombre documento
   - Seleccionar carpeta destino
   - Generar múltiples documentos en 1 acción

4. ✅ **Tracking completo**:
   - Quién generó el documento
   - Cuándo se generó
   - Qué variables se usaron
   - Estado: enviado, visto

5. ✅ **Integración básica**:
   - Generar contrato al crear empleado (opcional)
   - Generar justificante al aprobar ausencia (opcional)

**No incluye (en MVP)**:
- ❌ Plantillas personalizadas (Fase 2)
- ❌ PDFs rellenables (Fase 3)
- ❌ Previsualización avanzada (Fase 2)
- ❌ Firma digital (se define aparte)
- ❌ Editor visual
- ❌ Campos personalizados como variables

---

## 💡 Casos de Uso Reales

### Caso 1: Onboarding de Nuevo Empleado

**Antes (Manual)**:
1. HR crea empleado en BD
2. HR abre Word, busca plantilla de contrato
3. HR rellena manualmente: nombre, NIF, salario, fecha, etc. (20+ campos)
4. HR guarda como PDF
5. HR sube a carpeta del empleado
6. **Tiempo**: 15-20 minutos por empleado

**Después (Automatizado)**:
1. HR crea empleado en BD (con datos completos)
2. Sistema genera automáticamente:
   - Contrato de trabajo
   - Carta de bienvenida
   - Modelo 145 pre-rellenado
3. Documentos se guardan automáticamente en carpetas del empleado
4. Empleado recibe notificación
5. **Tiempo**: 2 minutos (solo completar formulario empleado)

**Ahorro**: ~85% de tiempo

---

### Caso 2: Campaña de Recogida de Modelo 145

**Antes (Manual)**:
1. HR descarga PDF del Modelo 145 vacío de la AEAT
2. HR envía email a 50 empleados con PDF vacío
3. Cada empleado rellena manualmente (confuso, muchos errores)
4. HR recibe 50 emails con PDFs
5. HR descarga y organiza manualmente
6. **Tiempo**: 5 horas totales (HR + empleados)

**Después (Automatizado)**:
1. HR selecciona plantilla "Modelo 145"
2. HR selecciona "Todos los empleados"
3. Sistema genera 50 documentos pre-rellenados en 30 segundos
4. Empleados reciben notificación con Modelo 145 ya rellenado
5. Empleados revisan, confirman o ajustan mínimo
6. **Tiempo**: 30 minutos totales

**Ahorro**: ~90% de tiempo

---

### Caso 3: Justificantes de Vacaciones

**Antes (Manual)**:
1. Empleado solicita vacaciones
2. HR aprueba ausencia
3. Empleado pide justificante por email
4. HR abre Word, rellena datos manualmente
5. HR envía justificante por email
6. **Tiempo**: 5 minutos por empleado

**Después (Automatizado)**:
1. Empleado solicita vacaciones
2. HR aprueba ausencia
3. **Sistema genera automáticamente justificante**
4. Empleado lo descarga desde su espacio (o recibe notificación)
5. **Tiempo**: 0 minutos (automático)

**Ahorro**: 100% de tiempo

---

## 🛠️ Stack Tecnológico

### Librerías Clave

**docxtemplater** (Variables en DOCX):
```bash
npm install docxtemplater pizzip
```
- **Qué hace**: Sustituye variables en documentos Word
- **Ventajas**: Robusto, bien mantenido, compatible con Node.js
- **Uso**: Plantillas con `{{variable}}`

**pdf-lib** (Fase 2 - PDFs):
```bash
npm install pdf-lib
```
- **Qué hace**: Manipula PDFs, rellena formularios
- **Estado**: Código base listo pero **no activo**. Requiere completar mapeo UI + validaciones antes de exponerlo.

### Arquitectura

```
Frontend (Next.js)
    ↓
API Routes (/api/plantillas/*)
    ↓
Business Logic (lib/plantillas/*)
    ├─ resolver-variables.ts  → Lee BD, desencripta, formatea
    ├─ generar-documento.ts   → Usa docxtemplater
    └─ extraer-variables.ts   → Detecta {{variables}}
    ↓
Database (PostgreSQL + Prisma)
    ├─ PlantillaDocumento
    ├─ DocumentoGenerado
    └─ Documento (existente)
    ↓
Storage (AWS S3)
    ├─ Plantillas originales
    └─ Documentos generados
```

---

## 📅 Roadmap

### Sprint 1 (Semanas 1-2): MVP Fase 1
- [x] Modelos de BD (Prisma schema)
- [x] Migración
- [x] Instalación de librerías
- [x] Utilidades core (`resolver-variables`, `generar-documento`)
- [x] APIs básicas (`GET /api/plantillas`, `POST /api/plantillas/[id]/generar`)
- [x] Seeders de plantillas oficiales
- [x] UI básica (`/hr/plantillas`)
- [x] Testing unitario

### Sprint 2 (Semana 3): Fase 2 - Plantillas Personalizadas
- [ ] API upload plantillas (`POST /api/plantillas`)
- [ ] UI para subir plantillas
- [ ] Detección automática de variables
- [ ] Gestión de plantillas (editar, eliminar)

### Sprint 3 (Semana 4): Fase 3 - Previsualización
- [ ] API previsualización (`GET /api/plantillas/[id]/previsualizar`)
- [ ] Modal de previsualización con visor
- [ ] Completar variables faltantes manualmente
- [ ] Mejorar UX de selección de empleados

### Sprint 4-5 (Semanas 5-6): Integración y Pulido
- [ ] Integración con módulo de Contratos (generar automáticamente)
- [ ] Integración con módulo de Ausencias (justificantes automáticos)
- [ ] Integración con módulo de Nóminas (Modelo 190)
- [ ] Notificaciones mejoradas
- [ ] Analytics de uso

### Futuro (Post-MVP):
- [ ] PDFs rellenables (Fase 4)
- [ ] Firma digital (Fase 5 - definición aparte)
- [ ] Editor visual de plantillas
- [ ] Plantillas condicionales (if/else)
- [ ] Versioning de plantillas
- [ ] Campos personalizados como variables

---

## 💰 Estimación de Impacto

### Ahorro de Tiempo (mensual)

**Escenario**: Empresa con 50 empleados

| Tarea | Antes (manual) | Después (auto) | Ahorro |
|-------|----------------|----------------|--------|
| Onboarding 3 nuevos empleados | 1h | 6 min | 90% |
| Generar contratos | 45 min | 3 min | 93% |
| Modelo 145 anual (50 empleados) | 5h | 30 min | 90% |
| Justificantes de vacaciones (10/mes) | 50 min | 0 min | 100% |
| **Total mensual** | **~8 horas** | **~40 min** | **~90%** |

**Valor**: Si el HR Admin cobra 30 €/h, ahorro mensual = **~210 €** (~2,500 €/año)

### Reducción de Errores

- **Antes**: ~15% de documentos con errores (datos incorrectos, desactualizados)
- **Después**: < 1% de errores (solo si datos en BD están mal)

### Mejora en Compliance

- ✅ Plantillas oficiales siempre actualizadas
- ✅ Todos los documentos siguen el mismo formato
- ✅ Auditoría completa (quién generó qué y cuándo)
- ✅ Datos sensibles manejados según GDPR

---

## ⚠️ Consideraciones Importantes

### ¿Qué necesitamos ANTES de empezar?

1. **Datos completos en BD**:
   - Si quieres generar contratos, necesitas que empleados tengan:
     - NIF, dirección, IBAN, salario, puesto, etc.
   - **Acción**: Asegurar que formularios de empleado/contrato capturen todo

2. **Plantillas Word bien diseñadas**:
   - Necesitas crear archivos `.docx` con el formato deseado
   - Usar variables `{{empleado_nombre}}` donde corresponda
   - **Acción**: Diseñar 4 plantillas oficiales iniciales

3. **Almacenamiento S3 configurado**:
   - Ya tienes S3 para documentos
   - Necesitas carpeta `/plantillas/` para plantillas originales
   - **Acción**: Configurar permisos si es necesario

### ¿Qué NO hace el sistema?

- ❌ No crea las plantillas Word por ti (las subes tú desde Word)
- ❌ No valida el contenido legal de los documentos
- ❌ No convierte DOCX → PDF automáticamente (en MVP, solo DOCX)
- ❌ No genera ni rellena PDFs normales. El soporte PDF rellenable se reactivará en una fase posterior cuando completemos mapeo y QA.
- ❌ No firma digitalmente (eso va aparte)
- ❌ No envía documentos por email (solo notificación interna)

---

## 🤔 Decisiones Pendientes

### 1. ¿Empezar con Fase 1 (solo oficiales) o directamente Fase 2 (+ personalizadas)?

**Recomendación**: Fase 1 primero
- **Pros**: Más rápido, validamos la arquitectura, valor inmediato
- **Contras**: No podrán subir plantillas personalizadas aún

**Tu decisión**: _________________

### 2. ¿Qué plantillas oficiales son prioritarias?

**Propuestas**:
1. ✅ Contrato Indefinido (alta prioridad)
2. ✅ Modelo 145 (alta prioridad)
3. ✅ Justificante Vacaciones (media prioridad)
4. ✅ Carta Bienvenida (baja prioridad)
5. ⚠️ Modelo 190 (¿necesario en MVP?)
6. ⚠️ Finiquito (¿necesario en MVP?)

**Tu decisión**: _________________

### 3. ¿Generación automática o manual?

**Automática** (al crear contrato → genera documento):
- **Pros**: Más automatización, menos pasos
- **Contras**: Puede generar documentos no deseados

**Manual** (HR decide cuándo generar):
- **Pros**: Más control, solo cuando se necesita
- **Contras**: Requiere acción manual

**Recomendación**: Híbrido
- Justificantes de vacaciones → **Automático**
- Contratos → **Opcional** (checkbox "Generar documento")
- Modelo 145 → **Manual** (campaña anual)

**Tu decisión**: _________________

---

## 📚 Documentos Complementarios

Este resumen forma parte de un conjunto de 3 documentos:

1. **Este documento** (`plantillas-documentos-resumen.md`)
   - Resumen ejecutivo
   - Comparativa con competidor
   - Casos de uso
   - Decisiones pendientes

2. **Especificación Funcional y Técnica** (`plantillas-documentos.md`)
   - Análisis completo del competidor
   - Requisitos funcionales detallados
   - Modelos de datos (Prisma schema)
   - APIs y endpoints
   - Flujos de uso
   - Fases de implementación

3. **Guía de Implementación** (`plantillas-documentos-implementacion.md`)
   - Setup inicial (instalación de librerías)
   - Código completo de utilidades
   - Implementación de APIs paso a paso
   - Componentes UI
   - Seeders de plantillas oficiales
   - Ejemplos de uso

### Anexo: Estado del módulo PDF rellenable

- **Código existente**:
  - `lib/plantillas/pdf-rellenable.ts`: extracción de campos nativos, mapeo IA, rellenado con `pdf-lib`.
  - `app/api/plantillas/[id]/escanear-campos/route.ts`: escaneo híbrido (campos nativos + IA Vision) y guardado en `configuracionIA`.
  - `components/hr/plantilla-mapear-campos-modal.tsx`: UI inicial para revisar y mapear campos.
- **Pendiente para activarlo**:
  1. Persistir el mapping campo PDF → variable sin depender de IA en cada generación.
  2. UI definitiva para que HR confirme/edite los campos detectados.
  3. Tests end-to-end y handling para PDFs sin campos.
  4. Documentar proceso de subida de PDFs oficiales rellenables (Modelo 145, etc.).
- **Decisión**: mantener el código como “feature flag” hasta que se priorice la fase PDF. Mientras tanto, el scope oficial es DOCX con variables.

---

## ✅ Próximos Pasos

1. **Revisar documentos** y tomar decisiones pendientes
2. **Crear plantillas Word** iniciales (4 oficiales)
3. **Aprobar especificación** técnica
4. **Iniciar Sprint 1** (Fase 1 MVP)
5. **Testing** con datos reales
6. **Deploy** a producción

---

## 🎯 Conclusión

**Sistema de Plantillas de Documentos** es una funcionalidad **high-value, medium-effort**:

- ✅ **Alto impacto**: Ahorra ~90% de tiempo en generación de documentos
- ✅ **Esfuerzo razonable**: ~2 semanas para MVP funcional
- ✅ **Escalable**: Fácil agregar más plantillas y variables
- ✅ **Integrado**: Se conecta con módulos existentes (contratos, ausencias, nóminas)
- ✅ **Compliance**: Mejora auditoría y cumplimiento legal

**Recomendación**: Implementar **Fase 1 (MVP)** en el próximo sprint para validar valor y arquitectura. Luego iterar con Fase 2 y 3 según feedback.

---

**FIN DEL RESUMEN EJECUTIVO**

**Versión**: 1.0.0  
**Fecha**: 12 de Noviembre 2025  
**Autor**: Sofia Roig (con asistencia de Claude AI)  
**Proyecto**: Clousadmin



