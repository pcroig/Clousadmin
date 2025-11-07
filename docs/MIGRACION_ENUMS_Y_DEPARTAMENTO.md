# Migración: Enums y Eliminación de Departamento

**Fecha**: Noviembre 2024  
**Versión**: 2.0  
**Estado**: ✅ Completada

## Resumen

Refactorización mayor del schema de Prisma para mejorar la integridad de datos y escalabilidad:

1. **Conversión a Enums**: Campos críticos ahora usan enums de Prisma en lugar de strings libres
2. **Eliminación de `departamento`**: Campo deprecated eliminado, reemplazado completamente por la relación `Equipo`

## Cambios en el Schema

### 1. Nuevos Enums Definidos

```prisma
enum UsuarioRol {
  platform_admin
  hr_admin
  manager
  empleado
}

enum EstadoEmpleado {
  activo
  baja
  suspendido
}

enum TipoContrato {
  indefinido
  temporal
  administrador
  fijo_discontinuo
  becario
  practicas
  obra_y_servicio
}

enum TipoEquipo {
  proyecto
  squad
  temporal
}
```

### 2. Campos Convertidos

| Modelo | Campo Antiguo | Tipo Nuevo | Impacto |
|--------|---------------|------------|---------|
| `Usuario` | `rol: String` | `rol: UsuarioRol` | ✅ Validación automática de roles |
| `Empleado` | `estadoEmpleado: String` | `estadoEmpleado: EstadoEmpleado` | ✅ Estados consistentes |
| `Empleado` | `tipoContrato: String` | `tipoContrato: TipoContrato` | ✅ Tipos de contrato validados |
| `Equipo` | `tipo: String` | `tipo: TipoEquipo` | ✅ Tipos de equipo estructurados |
| `Contrato` | `tipoContrato: String` | `tipoContrato: TipoContrato` | ✅ Consistencia con Empleado |

### 3. Campo Eliminado

- ❌ `Empleado.departamento` (deprecated desde v1.5)
- ✅ Reemplazado por relación N:N con `Equipo` vía `EmpleadoEquipo`

## Archivos Modificados

### Backend

1. **`prisma/schema.prisma`**
   - Definidos 4 enums nuevos
   - Eliminado campo `departamento`
   - Actualizado default de `tipo` en `Equipo`

2. **`prisma/seed.ts`**
   - Eliminadas referencias a `departamento`
   - Creación de equipos antes de empleados
   - Asignación automática a equipos vía `EmpleadoEquipo`

3. **`app/api/analytics/export/route.ts`**
   - Consulta ahora incluye `equipos` relation
   - Columna "Departamento" → "Equipos" (muestra múltiples si aplica)
   - Filtrado por equipo actualizado

4. **`app/api/empleados/importar-excel/confirmar/route.ts`**
   - Eliminado campo `departamento` en creación de empleados
   - Mantiene lógica de asignación a equipos

5. **`lib/ia/procesar-excel-empleados.ts`**
   - Eliminado `departamento` de interface `EmpleadoDetectado`
   - Mapeo básico redirige `departamento` → `equipo`
   - Eliminada lógica de fallback `departamento` a `equipo`

### Documentación

6. **`docs/funcionalidades/analytics.md`**
   - Actualizado nota sobre `departamento`
   - Referencias a "equipo" en lugar de "departamento"

## Beneficios

### ✅ Integridad de Datos

- **Antes**: Cualquier string podía insertarse en campos críticos (`rol: 'empledao'`, `estado: 'activa'`)
- **Ahora**: Base de datos rechaza valores inválidos automáticamente

### ✅ Type Safety

- **Antes**: TypeScript generaba `string`, sin autocompletado ni validación
- **Ahora**: TypeScript genera unions literales con autocompletado y validación en compilación

```typescript
// Antes
empleado.estadoEmpleado = 'activa'; // ❌ Typo no detectado

// Ahora
empleado.estadoEmpleado = 'activa'; 
// ❌ Error: Type '"activa"' is not assignable to type 'EstadoEmpleado'
```

### ✅ Queries Más Robustas

```typescript
// Antes
where: { estadoEmpleado: 'activo' } // Podía fallar silenciosamente

// Ahora
where: { estadoEmpleado: EstadoEmpleado.activo } // Compile-time safe
```

### ✅ Escalabilidad

- Un solo modelo `Equipo` con relación N:N permite:
  - Empleados en múltiples equipos
  - Equipos con managers, sedes y políticas
  - Histórico de pertenencia a equipos
  - Analytics por equipo preciso

## Migración de Datos

### Estrategia Aplicada

Dado que había **drift significativo** en la base de desarrollo:

1. **`db push --accept-data-loss`**: Sincronización directa del schema
2. **Pérdida de datos legacy**: Campo `departamento` tenía 6 registros (entorno dev)
3. **Re-seed completo**: `npx prisma db seed` con lógica actualizada

### Estrategia Recomendada para Producción

```sql
-- 1. Crear enums
CREATE TYPE "UsuarioRol" AS ENUM ('platform_admin', 'hr_admin', 'manager', 'empleado');
CREATE TYPE "EstadoEmpleado" AS ENUM ('activo', 'baja', 'suspendido');
-- ... otros enums

-- 2. Migrar departamentos a equipos
INSERT INTO equipos (id, "empresaId", nombre, tipo, activo, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(), 
  e."empresaId", 
  e.departamento, 
  'proyecto', 
  true, 
  NOW(), 
  NOW()
FROM empleados e
WHERE e.departamento IS NOT NULL
GROUP BY e."empresaId", e.departamento;

-- 3. Asignar empleados a equipos creados
INSERT INTO empleado_equipos ("empleadoId", "equipoId", "fechaIncorporacion")
SELECT 
  e.id, 
  eq.id, 
  e."createdAt"
FROM empleados e
JOIN equipos eq ON eq.nombre = e.departamento AND eq."empresaId" = e."empresaId"
WHERE e.departamento IS NOT NULL;

-- 4. Convertir columnas a enums (con casting)
ALTER TABLE usuarios ALTER COLUMN rol TYPE "UsuarioRol" USING rol::"UsuarioRol";
ALTER TABLE empleados ALTER COLUMN "estadoEmpleado" TYPE "EstadoEmpleado" USING "estadoEmpleado"::"EstadoEmpleado";
-- ... otros

-- 5. Eliminar columna departamento
ALTER TABLE empleados DROP COLUMN departamento;
```

## Validación Post-Migración

### ✅ Checks Realizados

1. **Schema sync**: `npx prisma generate` sin errores
2. **Seed exitoso**: 6 empleados, 2 equipos, vínculos N:N correctos
3. **Linter clean**: Sin errores TypeScript
4. **Queries funcionales**: Export analytics genera Excel con columna "Equipos"

### 🧪 Tests Manuales Recomendados

- [ ] Login con diferentes roles (hr_admin, manager, empleado)
- [ ] Importación de Excel con columna "departamento" → crea equipos
- [ ] Export de analytics muestra equipos correctamente
- [ ] Creación de empleado sin equipo (opcional)
- [ ] Asignación de empleado a múltiples equipos

## Breaking Changes

### Para Desarrolladores

1. **Imports**: Enums ahora disponibles desde `@prisma/client`
   ```typescript
   import { UsuarioRol, EstadoEmpleado } from '@prisma/client';
   ```

2. **Comparaciones**: Usar enums en lugar de strings
   ```typescript
   // ❌ Antiguo
   if (usuario.rol === 'hr_admin') { ... }
   
   // ✅ Nuevo
   if (usuario.rol === UsuarioRol.hr_admin) { ... }
   // O también válido:
   if (usuario.rol === 'hr_admin') { ... } // TypeScript valida el literal
   ```

3. **Queries con `departamento`**: Ya no existen
   ```typescript
   // ❌ Antiguo
   where: { departamento: 'Tech' }
   
   // ✅ Nuevo
   where: {
     equipos: {
       some: {
         equipo: {
           nombre: 'Tech'
         }
       }
     }
   }
   ```

### Para API Consumers

- ❌ Campo `departamento` eliminado de respuestas
- ✅ Usar `equipos[]` array en su lugar
- ⚠️ Actualizar validaciones/schemas externos

## Rollback

Si fuera necesario revertir (solo dev):

```bash
# 1. Revertir schema
git checkout HEAD~1 prisma/schema.prisma

# 2. Sincronizar
npx prisma db push --accept-data-loss

# 3. Re-seed
npx prisma db seed
```

**⚠️ No aplicable en producción sin backup previo de datos**

## Próximos Pasos

### Mejoras Futuras

1. **Más enums**: Evaluar convertir `categoriaProfesional`, `nivelEducacion`, `genero`
2. **Validaciones Zod**: Actualizar schemas para usar enums de Prisma
3. **Migration script**: Crear utilidad CLI para migración segura en producción
4. **Indexes**: Revisar si enums mejoran performance de índices

### Documentación Pendiente

- [ ] Actualizar `README.md` con mención a enums
- [ ] Guía de importación Excel (mapeo departamento → equipo)
- [ ] API docs con tipos enum

## Referencias

- [Prisma Enums Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/enums)
- [PostgreSQL Enum Types](https://www.postgresql.org/docs/current/datatype-enum.html)
- Commit: `[hash de commit cuando se haga]`
- PR: `[link a PR cuando se abra]`

---

**Autor**: AI Assistant  
**Revisado por**: [Pendiente]  
**Aprobado por**: [Pendiente]

