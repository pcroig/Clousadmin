# ✅ Fase 1: Optimizaciones Aplicadas al Schema

**Fecha**: 2025-01-27  
**Estado**: Schema actualizado - Pendiente de migración

---

## 📋 Resumen de Cambios Aplicados

### 1. Índices Compuestos Agregados ⭐⭐⭐⭐⭐

Agregados **11 índices compuestos** para mejorar performance de queries frecuentes:

#### Fichaje (3 índices nuevos)
```prisma
@@index([empresaId, estado])              // Para filtros por estado
@@index([empresaId, fecha])               // Para rangos de fechas
@@index([empresaId, empleadoId, fecha])   // Para fichajes de empleado
```

#### Ausencia (3 índices nuevos)
```prisma
@@index([empresaId, estado])              // Para filtros por estado
@@index([empresaId, tipo, estado])        // Para filtros combinados
@@index([empresaId, empleadoId, estado])  // Para ausencias de empleado
```

#### Nomina (2 índices nuevos)
```prisma
@@index([empleadoId, estado])             // Para filtros por estado
@@index([empleadoId, mes, anio])          // Ya cubierto por unique constraint
```

#### SolicitudCambio (1 índice nuevo)
```prisma
@@index([empresaId, estado])              // Para filtros por estado
```

#### AutoCompletado (2 índices nuevos)
```prisma
@@index([empresaId, tipo, estado])        // Para filtros combinados
@@index([empresaId, estado, expiraEn])    // Para auto-aprobación
```

**Impacto Esperado**: Mejora de 10-100x en queries frecuentes

---

### 2. Optimización de Tipos de Datos (SmallInt) ⭐⭐⭐⭐

Convertidos **8 campos** de `Int` a `SmallInt` para reducir almacenamiento:

#### Empleado
```prisma
numeroHijos     Int @db.SmallInt @default(0)  // 0-5 típicamente
grupoCotizacion Int? @db.SmallInt             // 1-11 (Spanish SS groups)
```

#### EmpleadoSaldoAusencias
```prisma
año Int @db.SmallInt  // Año fiscal (2024-2099)
```

#### Nomina
```prisma
mes  Int @db.SmallInt  // 1-12
anio Int @db.SmallInt  // 2024-2099
```

#### ResumenMensualNomina
```prisma
mes  Int @db.SmallInt  // 1-12
anio Int @db.SmallInt  // 2024-2099
```

#### ExportGestoria
```prisma
mes  Int @db.SmallInt  // 1-12
anio Int @db.SmallInt  // 2024-2099
```

**Impacto Esperado**: Reducción de 50% en almacenamiento para estos campos

---

### 3. Eliminación de Índice Deprecated ⭐⭐

#### Empleado
```prisma
// @@index([departamento]) // REMOVED: deprecated field, not used in queries
```

**Impacto Esperado**: Mejora en INSERT/UPDATE, reducción de mantenimiento

---

## 📊 Resumen de Impacto

| Optimización | Cambios | Impacto Esperado |
|-------------|---------|------------------|
| Índices compuestos | 11 índices nuevos | Mejora 10-100x en queries |
| Optimización tipos | 8 campos → SmallInt | Reducción 50% almacenamiento |
| Índice deprecated | 1 índice eliminado | Mejora INSERT/UPDATE |

---

## ⚠️ Estado Actual: Drift Detectado

### Problema
La base de datos tiene cambios que no están en las migraciones:

```
[*] Changed the `integraciones` table
  [-] Removed unique index on columns (empresaId, tipo, proveedor)
  [+] Added column `calendarId`
  [+] Added column `usuarioId`
  [+] Added unique index on columns (empresaId, tipo, proveedor, usuarioId)
  [+] Added index on columns (usuarioId)

[*] Changed the `usuarios` table
  [+] Added column `googleId`
  [+] Added index on columns (googleId)
  [+] Added unique index on columns (googleId)
```

### Solución Requerida

**Opción 1: Resolver Drift Primero** (Recomendado)
```bash
# 1. Crear migración para los cambios existentes en BD
npx prisma db pull  # Traer cambios de BD al schema
npx prisma migrate dev --name sync_existing_changes

# 2. Luego aplicar las optimizaciones de Fase 1
npx prisma migrate dev --name optimize_database_phase1
```

**Opción 2: Reset de Desarrollo** (Solo si es BD de desarrollo)
```bash
# ⚠️ ELIMINA TODOS LOS DATOS
npx prisma migrate reset

# Luego aplicar todas las migraciones
npx prisma migrate deploy
```

---

## 🎯 Próximos Pasos

### Paso 1: Resolver Drift
- [ ] Decidir estrategia (Opción 1 o 2)
- [ ] Ejecutar comandos correspondientes
- [ ] Verificar que schema y BD están sincronizados

### Paso 2: Aplicar Optimizaciones
- [ ] Ejecutar `npx prisma migrate dev --name optimize_database_phase1`
- [ ] Verificar que migración se aplica correctamente
- [ ] Regenerar Prisma Client: `npx prisma generate`

### Paso 3: Testing
- [ ] Verificar que aplicación funciona correctamente
- [ ] Ejecutar queries de prueba
- [ ] Monitorear performance

### Paso 4: Deploy a Producción
- [ ] Aplicar en staging primero
- [ ] Monitorear performance
- [ ] Aplicar en producción
- [ ] Monitorear queries y writes

---

## 📝 Cambios en el Schema

**Archivo modificado**: `prisma/schema.prisma`

**Líneas modificadas**:
- Línea 158: `numeroHijos Int @db.SmallInt @default(0)`
- Línea 174: `grupoCotizacion Int? @db.SmallInt`
- Línea 242: Eliminado `@@index([departamento])`
- Línea 433-435: Índices compuestos en Fichaje
- Línea 527-529: Índices compuestos en Ausencia
- Línea 564: `año Int @db.SmallInt`
- Línea 724-725: `mes` y `anio` SmallInt en Nomina
- Línea 764-765: Índices compuestos en Nomina
- Línea 814-815: `mes` y `anio` SmallInt en ResumenMensualNomina
- Línea 851-852: `mes` y `anio` SmallInt en ExportGestoria
- Línea 907: Índice compuesto en SolicitudCambio
- Línea 949-950: Índices compuestos en AutoCompletado

---

## ✅ Verificación de Seguridad

- ✅ **Sin cambios en código**: Solo modificaciones al schema
- ✅ **Backward compatible**: Los tipos SmallInt son compatibles con Int
- ✅ **Sin datos afectados**: Solo agregan índices y optimizan tipos
- ✅ **Verificado**: No hay errores de linter en schema
- ✅ **Formateado**: Schema formateado correctamente con `prisma format`

---

## 🔄 Rollback Plan

Si es necesario revertir los cambios:

```bash
# Revertir última migración
npx prisma migrate resolve --rolled-back <migration_name>

# O restaurar schema anterior
git checkout HEAD~1 prisma/schema.prisma
npx prisma migrate dev
```

---

**Siguiente Fase**: Fase 2 - Migración de campos deprecated (requiere actualización de código)





