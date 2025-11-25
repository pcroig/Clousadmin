# Plan de Testing - Estado y Progreso

> **Nota**: Este documento consolida el estado actual del testing. Para más detalles:
> - [`TESTING_SUMMARY.md`](TESTING_SUMMARY.md) - Resumen ejecutivo de tests implementados
> - [`EVALUACION_PLAN_TESTING.md`](EVALUACION_PLAN_TESTING.md) - Evaluación crítica del plan

## 📊 Resumen General

**Fase Actual:** Fase 2 Completada ✅ | Fase 3 Iniciada 🚧

### Progreso Global
- ✅ **Fase 1:** Setup de Testing (100%)
- ✅ **Fase 2:** Tests Unitarios (100% - 205/207 tests passing)
- 🚧 **Fase 3:** Tests de Integración (Estructura creada)
- ⏳ **Fase 4:** Tests de Componentes React (Pendiente)
- ⏳ **Fase 5:** Tests E2E (Pendiente)
- ⏳ **Fase 6:** CI/CD (Pendiente)

---

## ✅ Fase 1: Setup de Testing Infrastructure (COMPLETADA)

### Implementado

#### Configuración Base
- ✅ `vitest.config.ts` - Configuración completa con coverage
- ✅ `tests/setup.ts` - Setup global para todos los tests
- ✅ `.env.test` - Variables de entorno aisladas

#### Helpers de Testing
- ✅ `tests/helpers/db.ts` - Utilidades para tests con BD
  - `getPrismaTest()` - Cliente Prisma para tests
  - `cleanDatabase()` - Limpieza atómica de tablas
  - `createTestEmpresa()`, `createTestEmpleado()`, etc.
- ✅ `tests/helpers/react.tsx` - Render con providers
  - `renderWithProviders()` - Incluye todos los context providers
  - Re-exports de Testing Library

#### Mocks de Servicios Externos
- ✅ `tests/mocks/openai.ts` - Mock de OpenAI API
- ✅ `tests/mocks/stripe.ts` - Mock completo de Stripe
- ✅ `tests/mocks/resend.ts` - Mock de emails con tracking

#### Smoke Tests
- ✅ `tests/smoke/vitest-setup.test.ts` - 5/5 ✓
- ✅ `tests/smoke/react-setup.test.tsx` - 4/4 ✓
- ⚠️ `tests/smoke/db-setup.test.ts` - 3/5 (2 requieren BD configurada)

---

## ✅ Fase 2: Tests Unitarios (COMPLETADA)

### 📈 Métricas
- **Total:** 207 tests
- **Passing:** 205 (99%)
- **Failed:** 2 (solo configuración de BD)
- **Tiempo:** ~30-50s
- **Coverage:** Funciones críticas al 100%

### Tests Implementados

#### 1. Validaciones (163 tests)

**lib/validaciones/nif.ts** - 65 tests ✅
```typescript
✓ normalizarIdentificacion (8 tests)
✓ validarNIF (25 tests)
✓ validarNIE (20 tests)
✓ validarNIFoNIE (6 tests)
✓ obtenerInfoValidacionNIF (4 tests)
✓ formatearNIF (2 tests)
```

**lib/validaciones/iban.ts** - 50 tests ✅
```typescript
✓ validarIBAN (26 tests)
✓ formatearIBAN (7 tests)
✓ extraerCodigoBanco (8 tests)
✓ Integración completa (9 tests)
```

**lib/validaciones/file-upload.ts** - 48 tests ✅
```typescript
✓ normalizeAcceptedTypes (5 tests)
✓ validateFileType (9 tests)
✓ validateFileSize (7 tests)
✓ validateFileCount (7 tests)
✓ validateMagicNumber (8 tests)
✓ validateFile - integración (12 tests)
```

#### 2. Cálculos (15 tests)

**lib/calculos/ausencias.ts** - 7 tests ✅
```typescript
✓ determinarEstadoTrasAprobacion (3 tests)
✓ esFinDeSemana (4 tests)
```

**lib/calculos/balance-horas.ts** - 8 tests ✅
```typescript
✓ generarDiasDelPeriodo (8 tests)
```

#### 3. Crypto (15 tests)

**lib/crypto.ts** - 15 tests ✅
```typescript
✓ validateEncryptionSetup (3 tests)
✓ generateEncryptionKey (2 tests)
✓ encrypt & decrypt (6 tests)
✓ hashForSearch (3 tests)
✓ encryptFields & decryptFields (1 test)
```

### Cobertura por Categoría

| Categoría | Tests | Status | Coverage |
|-----------|-------|--------|----------|
| Validación NIF/NIE | 65 | ✅ | 100% |
| Validación IBAN | 50 | ✅ | 100% |
| Validación Files | 48 | ✅ | 100% |
| Cálculos Ausencias | 7 | ✅ | Funciones puras 100% |
| Cálculos Balance | 8 | ✅ | Funciones puras 100% |
| Crypto | 15 | ✅ | 100% |

---

## 🚧 Fase 3: Tests de Integración (EN PROGRESO)

### Estructura Creada

```
tests/integration/
└── ausencias-service.test.ts (template con describe.skip)
```

### Requisitos para Completar

#### 1. Configuración de BD de Test

**Paso 1:** Crear base de datos PostgreSQL de prueba
```bash
# En PostgreSQL
CREATE DATABASE clousadmin_test;
```

**Paso 2:** Configurar credenciales en `.env.test`
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/clousadmin_test"
```

**Paso 3:** Ejecutar migraciones
```bash
npm run db:test:setup
```

#### 2. Tests de Integración a Implementar

##### Servicios de Ausencias
- `tests/integration/ausencias-service.test.ts`
  - ✅ Template creado (describe.skip)
  - ⏳ Calcular saldo de empleado
  - ⏳ Validar saldo insuficiente
  - ⏳ Crear ausencia y actualizar saldo
  - ⏳ Aprobar/rechazar ausencias
  - ⏳ Validar políticas de equipo

##### Servicios de Empleados
- `tests/integration/empleados-service.test.ts` (pendiente)
  - ⏳ Crear empleado con encriptación
  - ⏳ Buscar por NIF hasheado
  - ⏳ Actualizar datos sensibles
  - ⏳ Anonimización (derecho al olvido)

##### Servicios de Fichajes
- `tests/integration/fichajes-service.test.ts` (pendiente)
  - ⏳ Calcular horas trabajadas
  - ⏳ Balance mensual
  - ⏳ Correcciones de fichaje

### Cómo Ejecutar Tests de Integración

1. Descomentar `describe.skip` → `describe`
2. Ejecutar:
```bash
npm test -- ausencias-service.test.ts
```

---

## ⏳ Fase 4: Tests de Componentes React (PENDIENTE)

### Componentes Críticos a Testear

#### Formularios
- `components/forms/EmpleadoForm.tsx`
  - Validación de NIF/NIE
  - Validación de IBAN
  - Envío de formulario
  - Manejo de errores

#### Tablas de Datos
- `components/empleados/EmpleadosTable.tsx`
  - Renderizado de datos
  - Paginación
  - Filtros y búsqueda
  - Acciones (editar, eliminar)

#### Gestión de Ausencias
- `components/ausencias/SolicitudAusenciaForm.tsx`
  - Selección de fechas
  - Cálculo de días laborables
  - Validación de saldo
  - Calendario de disponibilidad

### Herramientas Disponibles

✅ Ya configurado:
- React Testing Library
- User Event
- Custom render con providers
- Jest-DOM matchers

### Template de Test de Componente

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/helpers/react';
import { EmpleadoForm } from '@/components/forms/EmpleadoForm';

describe('EmpleadoForm', () => {
  it('should validate NIF format', async () => {
    const { user } = render(<EmpleadoForm />);

    const nifInput = screen.getByLabelText(/nif/i);
    await user.type(nifInput, '12345678A'); // Letra incorrecta

    const submitButton = screen.getByRole('button', { name: /guardar/i });
    await user.click(submitButton);

    expect(screen.getByText(/letra.*incorrecta/i)).toBeInTheDocument();
  });
});
```

---

## ⏳ Fase 5: Tests E2E con Playwright (PENDIENTE)

### Flujos Críticos a Testear

#### 1. Onboarding de Empleado
```typescript
test('empleado completa onboarding', async ({ page }) => {
  // 1. Recibir invitación
  // 2. Crear contraseña
  // 3. Completar perfil
  // 4. Ver dashboard
});
```

#### 2. Solicitar Ausencia
```typescript
test('empleado solicita vacaciones', async ({ page }) => {
  // 1. Login
  // 2. Ir a ausencias
  // 3. Seleccionar fechas
  // 4. Verificar saldo
  // 5. Enviar solicitud
  // 6. Verificar notificación
});
```

#### 3. Aprobar Ausencia (Manager)
```typescript
test('manager aprueba ausencia', async ({ page }) => {
  // 1. Login como manager
  // 2. Ver solicitudes pendientes
  // 3. Revisar detalles
  // 4. Aprobar
  // 5. Verificar actualización de saldo
});
```

### Setup de Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

**playwright.config.ts:**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
});
```

---

## ⏳ Fase 6: CI/CD con GitHub Actions (PENDIENTE)

### Workflow de CI

**.github/workflows/test.yml:**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## 📝 Checklist de Próximos Pasos

### Inmediato (Fase 3)
- [ ] Configurar PostgreSQL para tests
- [ ] Actualizar .env.test con credenciales
- [ ] Ejecutar `npm run db:test:setup`
- [ ] Descomentar tests de integración
- [ ] Ejecutar y verificar tests de ausencias
- [ ] Crear tests para empleados-service
- [ ] Crear tests para fichajes-service

### Corto Plazo (Fase 4)
- [ ] Identificar 5 componentes más críticos
- [ ] Crear tests para EmpleadoForm
- [ ] Crear tests para AusenciasForm
- [ ] Crear tests para EmpleadosTable
- [ ] Verificar coverage de componentes

### Medio Plazo (Fase 5)
- [ ] Instalar Playwright
- [ ] Crear 3 flujos E2E críticos
- [ ] Configurar CI para E2E
- [ ] Screenshots en fallos

### Largo Plazo (Fase 6)
- [ ] GitHub Actions workflow
- [ ] Coverage reports en PRs
- [ ] Tests en pre-commit hooks
- [ ] Badges de coverage

---

## 🎯 Métricas de Éxito

### Fase 2 (Actual)
- ✅ 99% tests passing (205/207)
- ✅ 100% coverage de funciones críticas
- ✅ Tiempo de ejecución < 1 min

### Objetivos Fase 3
- [ ] 80% coverage en servicios con BD
- [ ] Tests de integración < 5 min
- [ ] 0 fallos en CI

### Objetivos Fase 4
- [ ] 80% coverage en componentes UI
- [ ] Tests de componentes < 2 min

### Objetivos Finales
- [ ] 85% coverage global
- [ ] Suite completa < 10 min
- [ ] 100% tests en CI passing

---

## 📚 Recursos

### Documentación
- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [Playwright](https://playwright.dev/)

### Archivos Clave
- `vitest.config.ts` - Configuración de tests
- `tests/setup.ts` - Setup global
- `tests/helpers/` - Utilidades reutilizables
- `.env.test` - Variables de entorno

---

**Última actualización:** 2025-11-25
**Responsable:** Testing Team
**Estado:** Fase 2 Completa ✅ | Fase 3 En Progreso 🚧
