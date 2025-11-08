# 📊 Plan de Optimización Unificado - Modelos de Datos

**Fecha**: 2025-01-27  
**Objetivo**: Optimizar el schema de Prisma para mejorar eficiencia, escalabilidad y performance

---

## 🎯 Filosofía de Optimización

1. **Conservador y Seguro**: Priorizar cambios de bajo riesgo con alto impacto
2. **Incremental**: Implementar en fases, validando cada una antes de continuar
3. **Holístico**: Considerar dependencias y relaciones en todo el sistema
4. **Medible**: Establecer métricas claras de éxito

---

## 📈 Estado Actual

### Métricas del Schema
- **27 modelos** en total
- **1,355 líneas** de código
- **Multi-tenant**: `empresaId` como filtro principal
- **Arquitectura separada**: Usuario vs Empleado (intencional)

---

## 🚀 Plan de Ejecución en 3 Fases

### ✅ Fase 1: Quick Wins (SIN RIESGO)

**Objetivo**: Optimizaciones inmediatas sin cambios de código

#### Cambios Aplicados
1. ✅ **11 Índices Compuestos**
   - Fichaje: 3 índices para queries frecuentes
   - Ausencia: 3 índices para filtros combinados
   - Nomina: 2 índices para estado y período
   - SolicitudCambio: 1 índice para filtros por empresa
   - AutoCompletado: 2 índices para clasificación y auto-aprobación

2. ✅ **8 Campos → SmallInt**
   - `Empleado.numeroHijos`: 0-5 típicamente
   - `Empleado.grupoCotizacion`: 1-11 valores
   - `EmpleadoSaldoAusencias.año`: 2024-2099
   - `Nomina.mes`, `Nomina.anio`: 1-12, 2024-2099
   - `ResumenMensualNomina.mes`, `ResumenMensualNomina.anio`
   - `ExportGestoria.mes`, `ExportGestoria.anio`

3. ✅ **1 Índice Deprecated Eliminado**
   - `Empleado.@@index([departamento])`: Campo deprecated, no usado

#### Impacto Esperado
- ⚡ **Performance**: Mejora 10-100x en queries frecuentes
- 💾 **Almacenamiento**: Reducción 50% en campos SmallInt
- 🔧 **Mantenimiento**: Menos índices innecesarios

#### Estado
- ✅ Schema actualizado
- ⏳ Pendiente: Resolver drift de BD
- ⏳ Pendiente: Aplicar migración

---

### 🔄 Fase 2: Migración Gradual (MEDIO RIESGO)

**Objetivo**: Eliminar campos deprecated después de migrar código

#### 2.1. Campos Deprecated en Empleado

**Campos a eliminar**:
- `departamento` (String) → Reemplazado por relación `equipos`
- `puesto` (String) → Reemplazado por relación `puestoRelacion`

**Plan de Migración**:

1. **Auditoría de Código** (1-2 horas)
   ```bash
   # Buscar referencias a campos deprecated
   grep -r "\.departamento" --include="*.ts" --include="*.tsx"
   grep -r "\.puesto" --include="*.ts" --include="*.tsx"
   ```

2. **Actualizar Código** (2-4 horas)
   - Reemplazar `empleado.departamento` con lógica de equipos
   - Reemplazar `empleado.puesto` con `empleado.puestoRelacion?.nombre`
   - Agregar fallbacks para datos legacy

3. **Testing** (1-2 horas)
   - Verificar todos los componentes afectados
   - Probar con empleados legacy (sin equipos/puesto nuevo)
   - Verificar formularios de edición

4. **Migración de Datos** (opcional)
   ```sql
   -- Migrar puesto string a puestoId
   UPDATE empleados e
   SET "puestoId" = p.id
   FROM puestos p
   WHERE e.puesto = p.nombre
     AND e."puestoId" IS NULL
     AND p."empresaId" = e."empresaId";
   ```

5. **Deprecar en Schema** (sin eliminar aún)
   ```prisma
   departamento String? @db.VarChar(100) @deprecated("Use equipos relation instead")
   puesto       String? @db.VarChar(100) @deprecated("Use puestoRelacion instead")
   ```

6. **Eliminar después de 2-4 semanas** (cuando todos los datos estén migrados)

**Impacto Esperado**:
- 🧹 **Código limpio**: Eliminación de redundancia
- 📊 **Datos normalizados**: Una sola fuente de verdad
- 🔧 **Mantenibilidad**: Menos campos duplicados

---

### 🔍 Fase 3: Evaluación Profunda (LARGO PLAZO)

**Objetivo**: Analizar optimizaciones complejas caso por caso

#### 3.1. Redundancia de `empresaId`

**Análisis**: Muchos modelos tienen `empresaId` aunque lo podrían obtener por relación

**Evaluación Caso por Caso**:

| Modelo | Tiene empresaId | Justificación | Acción |
|--------|----------------|---------------|--------|
| `Fichaje` | ✅ | Filtros frecuentes, evita JOINs | ✅ **MANTENER** |
| `Ausencia` | ✅ | Filtros frecuentes, evita JOINs | ✅ **MANTENER** |
| `Documento` | ✅ | Filtros frecuentes, evita JOINs | ✅ **MANTENER** |
| `AlertaNomina` | ✅ | Dashboard agregado, evita JOINs | ✅ **MANTENER** |
| `SolicitudCambio` | ✅ | Workflow multi-rol, evita JOINs | ✅ **MANTENER** |
| `AutoCompletado` | ✅ | Dashboard HR, evita JOINs | ✅ **MANTENER** |
| `Carpeta` | ✅ | Compartidas entre empresa | ✅ **MANTENER** |

**Conclusión**: La redundancia de `empresaId` es **intencional y necesaria** para performance en queries frecuentes.

#### 3.2. Campos JSONB

**Análisis**: Optimizar valores por defecto grandes

**Casos identificados**:
- `Empresa.config`: 250+ caracteres de default
- `OnboardingEmpleado.progreso`: 150+ caracteres de default
- `OnboardingConfig.camposRequeridos`: 300+ caracteres de default

**Plan**:
1. Evaluar si valores por defecto son necesarios en schema
2. Alternativa: Establecer defaults en código (middleware Prisma)
3. Implementar solo si hay problemas de performance

**Estado**: ⏸️ PAUSADO - No crítico, evaluar después de Fase 1 y 2

#### 3.3. Particionado de Tablas

**Tablas candidatas**:
- `Fichaje`: Particionado por fecha (anual o mensual)
- `Ausencia`: Particionado por año
- `Nomina`: Particionado por año
- `AuditoriaAcceso`: Particionado por mes

**Cuándo Implementar**:
- Cuando `Fichaje` > 1M registros
- Cuando queries de rango de fechas se vuelvan lentas
- Típicamente: Empresas con 200+ empleados después de 2-3 años

**Estado**: ⏸️ PAUSADO - No necesario aún, evaluar en 6-12 meses

---

## 📊 Métricas de Éxito

### Fase 1
- [ ] Migración aplicada sin errores
- [ ] Queries con `empresaId + estado` ejecutan en < 50ms
- [ ] Queries de rango de fechas ejecutan en < 100ms
- [ ] Almacenamiento reducido en campos SmallInt (verificar con `pg_column_size`)

### Fase 2
- [ ] Cero referencias a `departamento` en código
- [ ] Cero referencias a `puesto` (string) en código
- [ ] 100% de empleados migrados a `puestoId`
- [ ] Tests pasando al 100%

### Fase 3
- [ ] Queries agregadas de HR dashboard < 200ms
- [ ] 95% de queries usando índices (verificar con `EXPLAIN ANALYZE`)
- [ ] Cero queries con sequential scans en tablas grandes

---

## 🛠️ Herramientas de Monitoreo

### Query Analysis
```sql
-- Ver queries lentas
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Ver uso de índices
SELECT 
  schemaname, tablename, indexname, 
  idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND idx_tup_read = 0;
```

### Performance Testing
```typescript
// Medir performance de queries
console.time('fichajes_query');
const fichajes = await prisma.fichaje.findMany({
  where: { empresaId, estado: 'pendiente' },
  include: { empleado: true }
});
console.timeEnd('fichajes_query');
```

---

## ⚠️ Advertencias y Riesgos

### NO Hacer
- ❌ **NO fusionar Usuario y Empleado**: Arquitectura intencional (HR admins pueden no ser empleados)
- ❌ **NO eliminar empresaId redundante**: Necesario para performance, evita JOINs costosos
- ❌ **NO aplicar optimizaciones sin testing**: Siempre probar en staging primero
- ❌ **NO aplicar todas las fases a la vez**: Incremental y validado

### Hacer Siempre
- ✅ **Backup antes de migración**: `pg_dump` antes de cambios en producción
- ✅ **Testing exhaustivo**: Verificar funcionalidad en staging
- ✅ **Monitoring post-deploy**: Observar queries y performance
- ✅ **Rollback plan**: Tener plan B para revertir cambios

---

## 📅 Timeline Estimado

| Fase | Duración | Dependencias |
|------|----------|--------------|
| Fase 1 | **1 día** | Resolver drift BD → Aplicar migración → Testing |
| Fase 2 | **1 semana** | Auditoría código → Migración → Testing → Eliminar deprecated |
| Fase 3 | **Continuo** | Monitoreo y evaluación según crecimiento |

---

## 🎓 Lecciones Aprendidas

1. **Índices compuestos > Múltiples índices simples**: Para queries con múltiples filtros
2. **SmallInt suficiente para mayoría de casos**: Números pequeños no necesitan Int completo
3. **empresaId redundante es OK**: Performance > normalización en multi-tenant
4. **Deprecar antes de eliminar**: Dar tiempo para migrar código antes de romper schema
5. **Drift es peligroso**: Mantener schema y BD sincronizados en todo momento

---

## 📚 Referencias

- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Multi-tenant Architecture Patterns](https://docs.aws.amazon.com/whitepapers/latest/saas-architecture-fundamentals/multi-tenant-data-architecture.html)

---

**Última Actualización**: 2025-01-27  
**Autor**: AI Assistant  
**Revisar**: Cada 3 meses o al llegar a 1M registros en tablas principales





