# Smoke Tests - Estrategia de Testing Mínima

## Filosofía

Esta suite de tests implementa una **estrategia de testing mínima pero efectiva** que cubre los aspectos críticos del sistema sin sobre-ingenierizar:

1. **Tests unitarios** para lógica de negocio crítica (cifrado, autenticación, cálculos)
2. **Smoke tests estructurales** para APIs (verificación de existencia y configuración correcta)
3. **Tests E2E manuales** documentados para flujos críticos (ver `E2E.md`)

## Ejecutar Tests

```bash
npm run test
```

Esto ejecuta todos los tests definidos en `tests/index.ts`.

## Tests Implementados

### 1. Auth Tests (`auth.test.ts`)
- **Propósito**: Verificar lógica de autenticación básica
- **Cobertura**:
  - Validación de emails
  - Roles de usuario (enum)
  - Permisos básicos por rol

### 2. Encryption Tests (`empleado-crypto.test.ts`)
- **Propósito**: Garantizar que el cifrado de datos sensibles funciona correctamente
- **Cobertura**:
  - Cifrado/descifrado de IBAN, NIF, NSS
  - Detección de campos cifrados
  - Manejo de campos vacíos/null

### 3. API Smoke Tests (`api-smoke.test.ts`)
- **Propósito**: Verificar que las APIs críticas están correctamente configuradas
- **Cobertura**:
  - Existencia de endpoints críticos
  - Exportación de funciones HTTP (GET, POST, PATCH, DELETE)
  - Uso de `getSession` en endpoints protegidos
  - Validación con Zod
  - Cifrado en endpoints de empleados
  - Manejo de errores con try-catch

### 4. Rate Limit Tests (`rate-limit.test.ts`)
- **Propósito**: Verificar que el rate limiting funciona correctamente
- **Cobertura**: Límites de requests por IP

### 5. Calculation Tests (`antiguedad.test.ts`)
- **Propósito**: Verificar cálculos de antigüedad
- **Cobertura**: Cálculo correcto de años de antigüedad

### 6. Excel Validation Tests (`procesar-excel-validaciones.test.ts`)
- **Propósito**: Verificar validación de datos de Excel
- **Cobertura**: Validación de estructura de datos importados

## Estrategia de Testing por Entorno

### Desarrollo Local
1. Ejecutar `npm run test` antes de cada commit
2. Verificar que todos los tests pasan
3. Si hay fallos, corregir antes de continuar

### CI/CD (GitHub Actions)
1. Los tests se ejecutan automáticamente en cada PR
2. El build falla si algún test no pasa
3. Esto garantiza que el código que llega a `main` está validado

### Staging
1. Ejecutar `npm run test` después del despliegue
2. Realizar tests E2E manuales críticos (ver `E2E.md`)
3. Verificar logs de errores en Hetzner

### Producción
1. Tests E2E manuales post-despliegue
2. Monitoreo de logs en tiempo real
3. Healthcheck automático cada 5 minutos

## Tests NO Implementados (Intencionalmente)

### ❌ Tests E2E Automatizados (Playwright/Cypress)
**Por qué**: Requieren infraestructura compleja y mantenimiento constante. Para un MVP, tests E2E manuales documentados son suficientes.

### ❌ Tests de Integración con Base de Datos Real
**Por qué**: Requieren setup complejo de DB de test. Los smoke tests estructurales + tests E2E manuales cubren esto.

### ❌ Tests de Carga/Performance
**Por qué**: Prematuro para MVP. Se implementarán cuando haya datos de uso real.

### ❌ Mutation Testing
**Por qué**: Overkill para este proyecto. Los tests actuales cubren lo crítico.

## Extender los Tests

### Añadir un nuevo test unitario

1. Crear archivo en `tests/<nombre>.test.ts`
2. Importar `strict as assert` de `node:assert`
3. Escribir funciones de test que usen `assert`
4. Añadir import en `tests/index.ts`

Ejemplo:

```typescript
import { strict as assert } from 'node:assert';

function testMiFuncionalidad() {
  const resultado = miFuncion(input);
  assert.equal(resultado, esperado, 'Descripción del error');
  console.log('  ✓ Mi funcionalidad');
}

testMiFuncionalidad();
```

### Añadir un nuevo smoke test de API

1. Editar `tests/api-smoke.test.ts`
2. Añadir nueva función de test
3. Llamar la función al final del archivo

## Métricas de Cobertura

**No usamos métricas de cobertura formales** porque:
- Añaden complejidad sin valor real en este proyecto
- Los tests cubren las áreas críticas identificadas
- El foco está en **calidad > cantidad**

## Mantenimiento

- **Revisar tests mensualmente** para asegurar que siguen siendo relevantes
- **Actualizar tests** cuando se añadan nuevas funcionalidades críticas
- **Eliminar tests** si dejan de ser útiles

---

**Última actualización**: 2025-11-17
**Responsable**: Equipo de desarrollo









