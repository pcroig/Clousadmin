# 🚀 Roadmap - Funcionalidades Futuras

Este documento describe las funcionalidades planificadas para desarrollo futuro en Clousadmin.

---

## 📋 Estado General

Estas funcionalidades están en fase de planificación y se desarrollarán según las prioridades del negocio y feedback de los usuarios.

---

## 🎯 Funcionalidades Planificadas

### 1. 📚 FUNDAE y Formación

**Descripción**: Sistema integral de gestión de formación y créditos FUNDAE (Fundación Estatal para la Formación en el Empleo).

**Objetivos**:
- Gestionar el catálogo de cursos de formación disponibles
- Realizar seguimiento de formaciones realizadas por empleados
- Calcular y gestionar créditos FUNDAE disponibles por empresa
- Generar documentación necesaria para bonificaciones
- Integrar con plataformas de formación externas

**Casos de uso**:
- RRHH planifica formación anual con crédito FUNDAE disponible
- Empleados solicitan cursos de formación
- Sistema calcula automáticamente el crédito bonificable
- Generación automática de documentación para Fundae
- Dashboard de seguimiento de formaciones por departamento

**Impacto**:
- ✅ Optimización del uso de créditos de formación
- ✅ Compliance con requisitos de Fundae
- ✅ Mejora en el desarrollo profesional de empleados
- ✅ Reducción de gestión manual de bonificaciones

---

### 2. 💰 Análisis de Salarios

**Descripción**: Sistema de análisis y comparativa salarial para facilitar decisiones de compensación basadas en datos.

**Objetivos**:
- Analizar estructura salarial por departamento, puesto y antigüedad
- Comparar salarios con benchmarks del mercado
- Detectar brechas salariales (género, edad, etc.)
- Simular impacto de revisiones salariales
- Generar informes de equidad salarial

**Casos de uso**:
- Revisión salarial anual con análisis de mercado
- Detección proactiva de brechas salariales
- Justificación de propuestas de aumento
- Análisis de competitividad salarial por departamento
- Cumplimiento con normativa de transparencia salarial

**Métricas clave**:
- Salario medio por puesto/departamento/seniority
- Percentiles salariales (P25, P50, P75, P90)
- Índice de equidad salarial
- Comparativa con mercado (si hay integraciones)
- Evolución histórica de salarios

**Impacto**:
- ✅ Decisiones salariales basadas en datos
- ✅ Compliance con normativa de equidad salarial
- ✅ Reducción de rotación por compensación
- ✅ Transparencia en políticas salariales

---

### 3. 💬 Chat para Consultar Documentación

**Descripción**: Asistente inteligente basado en IA para consultar documentación de empresa y políticas internas.

**Objetivos**:
- Responder preguntas sobre políticas de RRHH, convenios, normativas internas
- Buscar información en documentos cargados en la plataforma
- Proporcionar respuestas contextualizadas y precisas
- Aprender de las consultas frecuentes para mejorar respuestas
- Reducir carga de consultas repetitivas a RRHH

**Casos de uso**:
- Empleado pregunta: "¿Cuántos días de vacaciones me corresponden?"
- Empleado pregunta: "¿Cuál es la política de teletrabajo?"
- Búsqueda rápida en manuales de procedimientos
- Consultas sobre convenio colectivo aplicable
- Preguntas frecuentes automatizadas

**Tecnologías consideradas**:
- OpenAI GPT-4 / Anthropic Claude para procesamiento de lenguaje natural
- Vector databases (Pinecone, Qdrant) para búsqueda semántica
- RAG (Retrieval-Augmented Generation) para respuestas precisas
- Fine-tuning en documentación específica de la empresa

**Funcionalidades**:
- Chat contextual con memoria de conversación
- Referencias a documentos fuente en respuestas
- Sugerencias de preguntas relacionadas
- Escalado a RRHH si la respuesta no es clara
- Feedback de utilidad para mejorar el modelo

**Impacto**:
- ✅ Reducción de tiempo de respuesta a consultas
- ✅ Descarga de trabajo administrativo de RRHH
- ✅ Mejora en accesibilidad de información
- ✅ Consistencia en respuestas a políticas internas

---

### 4. 🔗 Integraciones con Sistemas Externos

**Descripción**: Conectores e integraciones con plataformas y herramientas de terceros para automatizar flujos de trabajo.

**Objetivos**:
- Integrar con sistemas de nómina externos (A3, Sage, SAP)
- Conectar con plataformas de formación
- Sincronizar con herramientas de gestión de tiempo (Jira, ClickUp)
- Integrar con sistemas ERP
- Automatizar exportación de datos contables

**Integraciones prioritarias**:

#### 4.1. Sistemas de Nómina
- **A3 Nómina**: Exportación automática de datos para procesamiento de nóminas
- **Sage**: Sincronización bidireccional de datos de empleados
- **SAP SuccessFactors**: Integración con gestión de talento

#### 4.2. Plataformas de Formación
- **Coursera for Business**: Catálogo de cursos y seguimiento
- **LinkedIn Learning**: Integración de formaciones realizadas
- **Udemy Business**: Gestión de licencias y completados

#### 4.3. Gestión de Tiempo
- **Jira**: Importación de horas registradas en proyectos
- **ClickUp**: Sincronización de tareas y tiempo dedicado
- **Harvest**: Integración de time tracking

#### 4.4. ERP y Contabilidad
- **Holded**: Exportación de datos contables
- **Sage Contabilidad**: Integración de costes de personal
- **Contasimple**: Sincronización de gastos de nómina

#### 4.5. Comunicación
- **Slack**: Notificaciones y aprobaciones desde Slack
- **Microsoft Teams**: Integración de notificaciones
- **WhatsApp Business**: Notificaciones críticas

**Arquitectura técnica**:
- API REST estándar para conectores
- Webhooks para eventos en tiempo real
- OAuth 2.0 para autenticación segura
- Queue system para procesamiento asíncrono
- Logs de sincronización y auditoría

**Casos de uso**:
- Exportación mensual automática a sistema de nómina
- Importación de horas de proyecto desde Jira a fichajes
- Notificaciones de aprobaciones pendientes en Slack
- Sincronización de empleados con ERP
- Exportación de datos contables automática

**Impacto**:
- ✅ Eliminación de entrada manual de datos
- ✅ Reducción de errores de transcripción
- ✅ Automatización de workflows repetitivos
- ✅ Single source of truth para datos de empleados
- ✅ Ahorro de tiempo significativo en tareas administrativas

---

## 📊 Priorización

El orden de desarrollo se determinará según:
1. **Impacto en usuarios**: Beneficio directo para empresas/empleados
2. **Complejidad técnica**: Esfuerzo de desarrollo requerido
3. **Demanda del mercado**: Solicitudes de clientes actuales/potenciales
4. **Dependencias**: Funcionalidades que bloquean otras features
5. **ROI estimado**: Retorno de inversión en desarrollo

---

## 🔄 Proceso de Desarrollo

Cuando una funcionalidad pase a desarrollo activo:

1. Se creará documentación detallada en `docs/funcionalidades/[nombre].md`
2. Se actualizará este documento con el estado: `🚧 En desarrollo`
3. Se generarán especificaciones técnicas en `docs/especificaciones/[nombre].md`
4. Al completarse, se moverá a `docs/funcionalidades/` como documentación oficial

---

## 📝 Notas

- Este roadmap es indicativo y puede cambiar según prioridades del negocio
- Las funcionalidades pueden dividirse en MVPs para entregas incrementales
- Se aceptan sugerencias y feedback de usuarios para ajustar prioridades

---

**Última actualización**: 4 de diciembre 2025  
**Versión**: 1.0






