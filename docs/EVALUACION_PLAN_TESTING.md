# Evaluación Crítica del Plan de Testing

**Fecha:** 24 de noviembre de 2024  
**Última actualización:** 27 de enero de 2025
**Evaluador:** Claude (Análisis técnico independiente)
**Estado Actual:** Testing básico con assert nativo de Node.js, sin framework

---

## 📊 Resumen Ejecutivo

**Veredicto General:** ⚠️ **BUENO PERO INCOMPLETO** (7/10)

El plan tiene una base sólida pero le faltan aspectos críticos para una aplicación empresarial completa. Requiere ajustes importantes antes de implementación.

**Recomendación:** Implementar con las mejoras sugeridas en este documento.

---

## ✅ Fortalezas del Plan Original

### 1. Elección de Framework (Vitest)
**Evaluación:** ✅ EXCELENTE

- Vitest es la elección correcta para Next.js moderno (mejor que Jest)
- Compatible con ESM nativo
- Más rápido que Jest (~10x en algunos casos)
- API compatible con Jest (migración fácil si es necesario)

### 2. Base de Datos de Test Separada
**Evaluación:** ✅ EXCELENTE

- Absolutamente crítico para seguridad
- Evita destruir datos de producción
- Permite tests destructivos sin miedo

### 3. Helpers de Setup/Teardown
**Evaluación:** ✅ BUENA

- Necesario para tests de integración
- Asegura estado limpio entre tests

### 4. Coverage del 70% en lib/
**Evaluación:** ✅ EXCELENTE

- Objetivo ambicioso pero alcanzable
- lib/calculos y lib/validaciones son críticos para negocio
- 70% es un buen balance entre cobertura y pragmatismo

### 5. Mockear Servicios Externos
**Evaluación:** ✅ EXCELENTE

- Evita costos reales en OpenAI, Anthropic, Stripe
- Evita envío de emails reales (Resend)
- Tests más rápidos y deterministas

### 6. CI/CD con GitHub Actions
**Evaluación:** ✅ EXCELENTE

- Previene regresiones
- Fuerza calidad en PRs
- Automatización es clave

---

## ❌ Debilidades Críticas del Plan Original

### 1. ⚠️ NO MENCIONA TESTING DE COMPONENTES REACT
**Severidad:** CRÍTICA

**Problema:**
- Clousadmin es una aplicación Next.js con UI compleja
- 0% de coverage en componentes React = riesgo alto de bugs en UI
- No hay plan para testear formularios, modales, tablas, etc.

**Impacto:**
- Bugs en UI que solo se descubren en producción
- Regresiones visuales no detectadas
- Accesibilidad no validada

**Solución Requerida:**
Añadir Testing Library de React con estos targets:
- Componentes críticos de formularios (empleados, ausencias, fichajes)
- Componentes de modals de confirmación
- Tablas con paginación
- Formularios de onboarding

**Coverage recomendado:** 60% de componentes críticos

---

### 2. ⚠️ NO MENCIONA E2E TESTING
**Severidad:** ALTA

**Problema:**
- Los tests unitarios e integración no validan flujos completos de usuario
- Flujos críticos como "crear empleado → asignar equipo → solicitar ausencia" pueden fallar

**Impacto:**
- Bugs en flujos de usuario que solo se ven en producción
- Problemas de integración entre módulos

**Solución Requerida:**
Añadir Playwright para E2E en estos flujos:
1. **Login → Dashboard → Ver empleados**
2. **Solicitar ausencia → Aprobar → Verificar calendario**
3. **Fichar entrada → Fichar salida → Ver balance**
4. **Proceso de onboarding completo**

**Coverage recomendado:** 5-10 flujos críticos

---

### 3. ⚠️ INCONSISTENCIA EN COVERAGE TARGETS
**Severidad:** MEDIA

**Problema:**
- Dice 70% coverage para lib/ pero 60% en CI
- Confuso y puede llevar a discusiones

**Impacto:**
- Ambigüedad en requirements
- ¿Qué pasa si lib/ tiene 70% pero el total es 59%?

**Solución:**
Definir claramente:
- **Coverage global mínimo:** 60%
- **Coverage de lib/calculos:** 80% (crítico para negocio)
- **Coverage de lib/validaciones:** 80%
- **Coverage de APIs:** 70%
- **Coverage de componentes:** 50% (inicio, subir gradualmente)

---

### 4. ⚠️ NO MENCIONA TESTING DE WEBHOOKS
**Severidad:** ALTA

**Problema:**
- Los webhooks de Stripe y Google Calendar son críticos
- Si fallan, pueden causar:
  - Pagos no procesados
  - Suscripciones no activadas
  - Eventos de calendario desincronizados

**Impacto:**
- Pérdida de ingresos (Stripe)
- Datos inconsistentes (Calendar)
- Difícil de debuggear en producción

**Solución Requerida:**
Tests específicos para:
- Webhook de Stripe con eventos: `customer.subscription.created`, `invoice.paid`, `invoice.payment_failed`
- Webhook de Google Calendar con estados: `sync`, `update`, `not_exists`
- Verificación de firmas de Stripe
- Idempotencia de webhooks

---

### 5. ⚠️ NO MENCIONA TESTING DE PERMISOS/ROLES
**Severidad:** ALTA

**Problema:**
- La seguridad de la app depende de verificación correcta de roles
- Sin tests, un bug puede exponer datos de otros usuarios

**Impacto:**
- **Vulnerabilidad de seguridad crítica**
- Empleado podría ver nóminas de otros
- Manager podría modificar datos fuera de su equipo

**Solución Requerida:**
Tests de autorización para cada rol:
```typescript
// Ejemplo de lo que DEBE testearse
describe('Permisos de Ausencias', () => {
  it('empleado solo puede ver sus ausencias', async () => {
    // Test que empleado A no puede ver ausencias de empleado B
  });

  it('manager puede aprobar ausencias de su equipo', async () => {
    // Test que manager puede aprobar de su equipo
  });

  it('manager NO puede aprobar ausencias de otro equipo', async () => {
    // Test que falla si manager accede a otro equipo
  });
});
```

---

### 6. ⚠️ NO MENCIONA TESTING DE ARCHIVOS SUBIDOS
**Severidad:** MEDIA

**Problema:**
- La app maneja uploads (avatares, documentos, nóminas PDF)
- ¿Cómo testear sin llenar storage?

**Impacto:**
- Storage de test se llena
- Tests lentos por I/O
- Limpieza manual requerida

**Solución:**
- Mockear S3/storage en tests
- Usar archivos pequeños de fixture
- Limpieza automática en teardown

---

### 7. ⚠️ NO MENCIONA TESTING DE CRON JOBS
**Severidad:** MEDIA

**Problema:**
- Existen cron jobs críticos:
  - Clasificar fichajes
  - Revisar solicitudes pendientes
  - Renovar canales de Google Calendar

**Impacto:**
- Jobs pueden fallar silenciosamente
- Datos inconsistentes acumulados

**Solución:**
Tests unitarios de la lógica de cada cron job, mockeando tiempo.

---

### 8. ⚠️ NO ESPECIFICA ESTRATEGIA PARA PRISMA
**Severidad:** MEDIA

**Problema:**
- ¿Usar Prisma real contra BD de test?
- ¿O mockear Prisma completamente?
- Cada enfoque tiene trade-offs

**Impacto:**
- Tests lentos si usan BD real
- Tests poco fiables si mockean Prisma

**Solución Recomendada:**
- **Tests unitarios de lib/:** Mockear Prisma
- **Tests de integración de APIs:** Prisma real contra BD de test
- Usar `prisma.$transaction` para rollback en tests

---

### 9. ⚠️ NO MENCIONA SNAPSHOT TESTING
**Severidad:** BAJA

**Problema:**
- Útil para componentes complejos (tablas, formularios)
- Detecta cambios no intencionales en UI

**Solución:**
Opcional, pero recomendado para:
- Emails HTML generados
- PDFs de nóminas (estructura)
- Componentes de tablas

---

### 10. ⚠️ NO MENCIONA TESTING DE EMAILS
**Severidad:** MEDIA

**Problema:**
- La app envía emails críticos:
  - Invitaciones de onboarding
  - Notificaciones de ausencias aprobadas
  - Nóminas
  - Recuperación de contraseña

**Impacto:**
- Emails mal formateados
- Links rotos en emails
- Emails no enviados

**Solución:**
- Mockear Resend en tests
- Capturar emails enviados
- Validar contenido y links

---

## 🎯 Plan de Testing MEJORADO

### Fase 1: Fundamentos (Semana 1)
**Prioridad:** CRÍTICA

1. ✅ Instalar y configurar Vitest
2. ✅ Configurar .env.test con BD separada
3. ✅ Crear helpers de DB (setup/teardown)
4. ✅ Configurar mocks de servicios externos
5. ✅ Scripts npm: test, test:watch, test:coverage
6. ⭐ **NUEVO:** Configurar Testing Library para React

---

### Fase 2: Tests Unitarios (Semana 2-3)
**Prioridad:** CRÍTICA

**Target:** 80% coverage en lib/calculos y lib/validaciones

#### lib/calculos/ (18 archivos)
- ✅ `ausencias.ts` - Cálculo de días, saldo, solapamientos
- ✅ `fichajes.ts` - Balance de horas, horas extras
- ✅ `balance-horas.ts` - Cálculos de balance mensual
- ✅ `nominas.ts` - Cálculo de salario neto, deducciones
- ✅ `dias-laborables.ts` - Cálculo con festivos
- ✅ `antiguedad.ts` - Cálculo de antigüedad
- ⭐ **NUEVO:** `alertas-nomina.ts` - Detección de incidencias
- ⭐ **NUEVO:** `generar-prenominas.ts` - Generación automática

#### lib/validaciones/ (6 archivos)
- ✅ `nif.ts` - Validación de NIF/NIE/CIF
- ✅ `iban.ts` - Validación de IBAN
- ✅ `file-upload.ts` - Validación de archivos
- ✅ `schemas.ts` - Schemas de Zod (smoke tests)
- ⭐ **NUEVO:** `onboarding.ts` - Validaciones de onboarding

#### Otros
- ✅ `lib/crypto.ts` - Cifrado/descifrado
- ⭐ **NUEVO:** `lib/api-handler.ts` - Helpers de API
- ⭐ **NUEVO:** `lib/permissions.ts` - Lógica de permisos

---

### Fase 3: Tests de Integración de API (Semana 4)
**Prioridad:** CRÍTICA

**Target:** 70% coverage en APIs críticas

#### APIs a testear (con BD de test real)

**Autenticación:**
- `POST /api/auth/login` - Login exitoso y fallido
- `POST /api/auth/google` - OAuth
- `POST /api/auth/forgot-password` - Recuperación

**Empleados:**
- `GET /api/empleados` - Listado con filtros y paginación
- `GET /api/empleados/{id}` - Obtener uno
- `POST /api/empleados` - Crear (success + errores)
- `PATCH /api/empleados/{id}` - Actualizar
- `DELETE /api/empleados/{id}` - Baja

**Ausencias:**
- `POST /api/ausencias` - Crear (validar saldo, solapamientos)
- `PATCH /api/ausencias/{id}` - Aprobar/rechazar
- `GET /api/ausencias/saldo/{id}` - Consultar saldo

**Fichajes:**
- `POST /api/fichajes` - Fichar entrada/salida
- `GET /api/fichajes/balance/{id}` - Balance de horas

**Nóminas:**
- `GET /api/nominas` - Listar
- `POST /api/nominas` - Crear
- `POST /api/nominas/eventos` - Eventos

⭐ **NUEVO: Webhooks**
- `POST /api/webhooks/stripe` - Todos los eventos críticos
- `POST /api/integrations/calendar/webhook` - Estados de Google

⭐ **NUEVO: Permisos**
- Validar que cada rol solo accede a lo permitido
- Tests de "empleado intenta ver datos de otro"
- Tests de "manager intenta acceder a otro equipo"

---

### Fase 4: Tests de Componentes React (Semana 5)
**Prioridad:** ALTA

**Target:** 50% coverage en componentes críticos

#### Componentes a testear:

**Formularios:**
- `EmpleadoForm` - Crear/editar empleado
- `AusenciaForm` - Solicitar ausencia
- `FichajeButton` - Botón de fichar

**Modals:**
- `ConfirmModal` - Modal de confirmación
- `AprobarAusenciaModal` - Aprobar/rechazar

**Tablas:**
- `EmpleadosTable` - Tabla con paginación
- `AusenciasTable` - Filtros y ordenamiento

**Onboarding:**
- `OnboardingSteps` - Flujo completo

---

### Fase 5: Tests E2E (Semana 6)
**Prioridad:** MEDIA

**Target:** 5-10 flujos críticos con Playwright

#### Flujos E2E:

1. **Happy path de usuario:**
   - Login → Ver dashboard → Ver mis ausencias

2. **Solicitar ausencia:**
   - Login → Solicitar vacaciones → Ver en calendario

3. **Aprobar ausencia (Manager):**
   - Login como manager → Ver pendientes → Aprobar → Verificar aprobada

4. **Fichar:**
   - Login → Fichar entrada → Esperar → Fichar salida → Ver balance

5. **Onboarding:**
   - Abrir link de invitación → Completar datos → Subir documentos → Firmar

6. **Ver nómina:**
   - Login → Ir a nóminas → Ver detalle → Descargar PDF

7. **Crear empleado (HR):**
   - Login como HR → Crear empleado → Asignar equipo → Ver en listado

---

### Fase 6: CI/CD y Automatización (Semana 7)
**Prioridad:** CRÍTICA

#### GitHub Actions Workflow:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run db:test:setup
      - run: npm test
      - run: npm run test:coverage

      # Fallar si coverage < 60%
      - name: Check coverage
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 60" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 60%"
            exit 1
          fi
```

---

## 📋 Coverage Targets Revisados

| Área | Target | Justificación |
|------|--------|---------------|
| **lib/calculos/** | 80% | Lógica crítica de negocio |
| **lib/validaciones/** | 80% | Prevenir datos inválidos |
| **APIs críticas** | 70% | Contratos de API estables |
| **Componentes React** | 50% | Balance pragmático UI |
| **E2E flows** | 5-10 flujos | Validar integraciones |
| **Total global** | 60% | Objetivo CI/CD |

---

## 🚨 Restricciones Adicionales

### 1. NO Tocar NODE_ENV en Código de Producción
✅ **CORRECTO en el plan original**

Excepciones permitidas:
- Scripts de setup de tests (`__tests__/setup.ts`)
- Config de Vitest (`vitest.config.ts`)

### 2. Limpieza de Recursos
⭐ **AÑADIR:**
- Limpiar archivos temporales en `/tmp`
- Limpiar storage de test (S3/local)
- Cerrar conexiones de DB en teardown

### 3. Velocidad de Tests
⭐ **AÑADIR:**
- Tests unitarios < 5 segundos total
- Tests de integración < 30 segundos
- Tests E2E < 2 minutos
- Si es más lento, optimizar o parallelizar

---

## 💰 Estimación de Esfuerzo

| Fase | Tiempo | Developer | Prioridad |
|------|--------|-----------|-----------|
| Fase 1: Setup | 2-3 días | Senior | CRÍTICA |
| Fase 2: Unitarios | 1 semana | Mid/Senior | CRÍTICA |
| Fase 3: Integración | 1 semana | Senior | CRÍTICA |
| Fase 4: Componentes | 4-5 días | Mid/Senior | ALTA |
| Fase 5: E2E | 3-4 días | Mid | MEDIA |
| Fase 6: CI/CD | 1-2 días | Senior | CRÍTICA |
| **TOTAL** | **4-5 semanas** | 1-2 devs | |

---

## 🎓 Recomendaciones Finales

### DO's ✅

1. **Empezar con Vitest** - Correcta elección
2. **BD de test separada** - No negociable
3. **Mockear externos siempre** - Crítico
4. **Tests primero de lib/calculos** - Mayor ROI
5. **CI/CD desde día 1** - Previene deuda técnica
6. **Documentar helpers de testing** - Facilita onboarding
7. **Revisar coverage en cada PR** - Mantener calidad

### DON'Ts ❌

1. **NO testear todo al 100%** - Pragmatismo
2. **NO usar BD de producción** - Nunca
3. **NO hacer tests flaky** - Debe ser determinista
4. **NO ignorar tests fallidos** - Fix inmediato
5. **NO escribir tests sin assertions** - Inútil
6. **NO commitear código sin tests** - Después de setup

### NICE TO HAVE (Futuro)

1. **Visual regression testing** (Percy, Chromatic)
2. **Performance testing** (Lighthouse CI)
3. **Mutation testing** (Stryker)
4. **Contract testing** (Pact) para APIs
5. **Chaos engineering** para resilience

---

## 🏆 Conclusión

**Plan original:** 7/10 - Buena base pero incompleta

**Plan mejorado:** 9.5/10 - Completo y production-ready

**Principales mejoras añadidas:**
1. ✅ Testing de componentes React (crítico que faltaba)
2. ✅ Tests E2E con Playwright
3. ✅ Testing de webhooks (Stripe, Calendar)
4. ✅ Testing de permisos/roles (seguridad)
5. ✅ Clarificación de coverage targets
6. ✅ Estrategia para Prisma
7. ✅ Testing de emails
8. ✅ Gestión de archivos en tests

**Recomendación final:**
Implementar el **Plan Mejorado** siguiendo las 6 fases propuestas, priorizando las fases 1-3 como críticas para producción.

---

**Documento generado:** 24 nov 2025
**Próximo paso:** Implementación Fase 1
