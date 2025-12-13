# Plan de Limpieza de Código - Enfoque Senior Dev
**Fecha**: 13 de Diciembre 2025
**Ejecutor**: Senior Developer
**Objetivo**: Limpiar archivos temporales SIN tocar código en producción

---

## 🎯 PRINCIPIOS DE EJECUCIÓN

### Regla de Oro: **"If It Ain't Broke, Don't Fix It"**
- ✅ Producción funcionando perfectamente
- ✅ CRONs operativos
- ✅ Workers procesando correctamente
- ❌ **NO tocar código funcional**
- ✅ **SÍ limpiar archivos temporales**

### Enfoque: **Operación Quirúrgica**
1. Solo eliminar archivos que NO afectan ejecución
2. Crear backup antes de cualquier cambio
3. Verificar que producción sigue operativa después
4. Commit atómicos (un cambio a la vez)
5. Rollback inmediato si algo falla

---

## 📋 FASE 1: LIMPIEZA SEGURA (HOY - 2 horas)

### Paso 1: Backup Completo (5 min)
```bash
# Crear backup timestamped
tar -czf backup-pre-limpieza-$(date +%Y%m%d_%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=dist \
  .
```

**Por qué**: Rollback garantizado si algo sale mal.

---

### Paso 2: Eliminar Archivos de Análisis en Raíz (15 min)

**Archivos a mover a `/docs/archive/`** (NO borrar, archivar):
```
ANALISIS_COMPLETO_BUILD_ERROR_NEXTJS16.md
ANALISIS_EXHAUSTIVO_LIMITES.md
ANALISIS_FINAL_JORNADAS_CONTEXTOS.md
ANALISIS_PRODUCCION.md
ANALISIS_RIESGOS_PRAGMATICO.md
CAUSA_RAIZ_JORNADAS_ONBOARDING.md
COMANDOS_PRUEBAS_RAPIDAS.md
DOCS_SISTEMA_FICHAJES_WORKERS.md
FASE5_ENDPOINTS_CUADRAR.md
FASE6_VALIDACIONES_UX.md
FASE7_FRONTEND_CUADRAR.md
FIX_FINAL_JORNADAS.md
GUIA_PRUEBAS_MANUALES.md
INVESTIGACION-CAUSA-RAIZ-TIMEOUT.md
INVESTIGACION_BUILD_ERROR_NEXT16.md
INVESTIGACION_BUILD_ERROR_NEXTJS16.md
INVESTIGACION_BUILD_NEXTJS16.md
PLAN_CORRECCION_COMPLETA.md
PLAN_CORRECCION_SISTEMA_NOMINAS.md
PLAN_FINAL_CORRECCION_NOMINAS_SENIOR.md
PLAN_QA_MANUAL_FICHAJES_RECHAZADOS.md
RESUMEN_CAMBIOS_FICHAJES_PRODUCCION.md
RESUMEN_FASES_1-7.md
REVISION_CRITICA_FASES_5-7.md
REVISION_SENIOR_DEV_JORNADAS.md
REVISION_WORKERS_FASE4.md
SOLUCION_IMPLEMENTADA_JORNADAS_CONTEXTOS.md
SOLUCION_JORNADA_AÑADIR_PERSONA.md
SOLUCION_LIMITES_FICHAJE.md
SOLUCION_PROBLEMA_JORNADAS.md
SOLUCION_WIDGET_PLANTILLA_FECHAALTA.md
VERIFICACION_FINAL_HETZNER_2025-12-11.md
VERIFICAR_CRON_HETZNER.md
... (31 archivos más)
```

**Comando**:
```bash
mkdir -p docs/archive/analisis-historico
mv ANALISIS_*.md PLAN_*.md REVISION_*.md SOLUCION_*.md \
   INVESTIGACION_*.md FIX_*.md VERIFICACION_*.md CAUSA_*.md \
   COMANDOS_*.md DOCS_*.md FASE*.md GUIA_*.md RESUMEN_*.md \
   docs/archive/analisis-historico/ 2>/dev/null
```

**Riesgo**: ✅ CERO - Son archivos de documentación histórica
**Rollback**: `git checkout -- .`

---

### Paso 3: Eliminar Scripts Temporales de Test (15 min)

**Archivos a eliminar** (scripts de debugging ya usados):
```
scripts/audit-jornadas-system.ts
scripts/calcular-eventos-test.ts
scripts/check-jornada-asignaciones.ts
scripts/diagnostico-504-timeout.sh
scripts/diagnostico-balance-fichajes.ts
scripts/diagnostico-eventos-propuestos.ts
scripts/diagnostico-jornadas-completo.ts
scripts/diagnostico-jornadas-tutu.ts
scripts/diagnostico-limites-fichaje.ts
scripts/diagnostico-problema-fichajes.ts
scripts/diagnostico-widget-plantilla.ts
scripts/find-empleados-temp.ts
scripts/limpiar-y-crear-datos-limpios.ts
scripts/migrar-jornadas-limpiar.ts
scripts/qa-fichajes-rechazados.ts
scripts/seed-fichajes-qa.ts
scripts/setup-completo-final.ts
scripts/setup-datos-prueba-actual.ts
scripts/setup-datos-prueba-manual.ts
scripts/setup-test-acme.ts
scripts/setup-test-data.ts
scripts/test-*.ts (34 archivos)
... (total ~50 archivos)
```

**Comando**:
```bash
# Crear lista de archivos a eliminar
find scripts/ -name 'test-*.ts' -o \
              -name 'diagnostico-*.ts' -o \
              -name 'setup-test-*.ts' -o \
              -name 'setup-datos-*.ts' -o \
              -name '*-qa-*.ts' > archivos-eliminar.txt

# Revisar lista antes de borrar
cat archivos-eliminar.txt

# Si todo OK, eliminar
xargs rm < archivos-eliminar.txt
```

**Riesgo**: ✅ CERO - Scripts de debugging one-off
**Excepción**: Mantener scripts productivos:
- `scripts/hetzner/deploy.sh` ✅ (usado en producción)
- `scripts/fix-fechas-festivos.ts` ✅ (puede ser útil)
- Cualquier script en `package.json` ✅

**Rollback**: `git checkout -- scripts/`

---

### Paso 4: Eliminar Archivos Backup y Logs (10 min)

**Archivos a eliminar**:
```
build-16.0.8.log
build-createElement-fix.log
build-errors.log
build-final-lazy-context.log
build-output.log
build-proxy-fix.log
build-proxy-renamed.log
build-test-final-v2.log
build-test-final.log
lib/calculos/__tests__/fichajes-historico.test.ts.backup
lib/calculos/__tests__/fichajes-historico.test.ts.bak2
lib/calculos/__tests__/fichajes-historico.test.ts.bak3
docs/notificaciones/README.md.backup
docs/notificaciones/README.md.bak
docs/qa/ISSUES_CONOCIDOS.md.backup
```

**Comando**:
```bash
# Eliminar build logs
rm -f build-*.log

# Eliminar backups
find . -name '*.backup' -o -name '*.bak' -o -name '*.bak2' -o -name '*.bak3' | \
  grep -v node_modules | \
  xargs rm -f
```

**Riesgo**: ✅ CERO - Son logs y backups obsoletos
**Rollback**: No necesario (logs regenerables)

---

### Paso 5: Actualizar .gitignore (10 min)

**Añadir al .gitignore**:
```gitignore
# Build logs
build-*.log

# Backups
*.backup
*.bak
*.bak2
*.bak3

# Scripts temporales
scripts/test-*.ts
scripts/diagnostico-*.ts
scripts/setup-test-*.ts

# Análisis temporales en raíz
/ANALISIS_*.md
/INVESTIGACION_*.md
/PLAN_*.md
/REVISION_*.md
/SOLUCION_*.md
/FIX_*.md
/VERIFICACION_*.md

# Logs de desarrollo
*.log
!**/logs/.gitkeep

# Archivos de servidor
ecosystem.config.cjs
.env.backup.*
```

**Riesgo**: ✅ CERO - Solo previene commits futuros
**Beneficio**: Evita volver a committear archivos temporales

---

### Paso 6: Commit y Push (15 min)

**Comandos**:
```bash
# Añadir cambios
git add -A

# Commit descriptivo
git commit -m "chore: limpieza de archivos temporales y documentación histórica

- Mover 63 archivos de análisis a docs/archive/
- Eliminar 50+ scripts de test temporales
- Eliminar 16 archivos backup y build logs
- Actualizar .gitignore para prevenir archivos temporales futuros

BREAKING CHANGES: Ninguno
PRODUCCIÓN: No afectada (solo limpieza de archivos)"

# Push a main
git push origin main
```

**Riesgo**: ✅ BAJO - No toca código productivo
**Rollback**: `git revert HEAD`

---

### Paso 7: Verificación Post-Limpieza (5 min)

**Checklist**:
```bash
# 1. Verificar que producción sigue operativa
curl -I https://app.hrcron.com

# 2. Verificar CRONs siguen funcionando
ssh root@46.224.70.156 "pm2 status clousadmin"

# 3. Verificar logs sin errores
ssh root@46.224.70.156 "pm2 logs clousadmin --lines 20 --nostream"

# 4. Verificar workers procesando
ssh root@46.224.70.156 'tail -20 /root/.pm2/logs/clousadmin-out-1.log | grep Worker'
```

**Criterio de Éxito**:
- ✅ App responde correctamente
- ✅ PM2 status: online
- ✅ Sin errores en logs
- ✅ Workers procesando

**Si falla**: `git revert HEAD && git push origin main`

---

## 🚫 LO QUE NO VAMOS A TOCAR HOY

### Código en Producción
❌ NO modificar archivos TypeScript/TSX en `app/`, `components/`, `lib/`
❌ NO cambiar configuración de Next.js
❌ NO modificar schema de Prisma
❌ NO tocar sistema de workers
❌ NO cambiar variables de entorno

**Razón**: Producción está funcionando. "Don't fix what isn't broken."

### Archivos de Configuración Críticos
❌ NO tocar `next.config.ts`
❌ NO tocar `middleware.ts`
❌ NO tocar `prisma/schema.prisma`
❌ NO tocar `package.json` dependencies

**Razón**: Riesgo de romper funcionalidad existente.

---

## 📊 IMPACTO ESPERADO

### Antes de Limpieza
```
Total archivos en raíz: 100+ (mezclados)
Scripts temporales: 50+ archivos
Build logs: 9 archivos
Backups: 16 archivos
Navegación: DIFÍCIL ❌
Confusión: ALTA ❌
```

### Después de Limpieza
```
Archivos en raíz: 20-30 (solo esenciales)
Scripts productivos: Solo los necesarios
Logs: 0 (en .gitignore)
Backups: 0 (en .gitignore)
Navegación: CLARA ✅
Confusión: BAJA ✅
```

---

## ⏱️ TIEMPO ESTIMADO

| Paso | Tiempo | Riesgo |
|------|--------|--------|
| 1. Backup | 5 min | ✅ Ninguno |
| 2. Mover análisis | 15 min | ✅ Ninguno |
| 3. Eliminar scripts test | 15 min | ✅ Ninguno |
| 4. Eliminar backups | 10 min | ✅ Ninguno |
| 5. Actualizar .gitignore | 10 min | ✅ Ninguno |
| 6. Commit & push | 15 min | 🟡 Bajo |
| 7. Verificación | 5 min | ✅ Ninguno |
| **TOTAL** | **75 min** | **✅ MUY BAJO** |

---

## 🎯 CRITERIOS DE ÉXITO

1. ✅ Reducción de 100+ archivos temporales
2. ✅ Raíz del proyecto con solo archivos esenciales
3. ✅ .gitignore actualizado para prevenir futuros temporales
4. ✅ Producción funcionando correctamente
5. ✅ Sin regresiones en funcionalidad

---

## 🔄 PLAN DE ROLLBACK

Si algo falla en **cualquier momento**:

```bash
# Opción 1: Rollback de Git
git revert HEAD
git push origin main

# Opción 2: Restaurar desde backup
tar -xzf backup-pre-limpieza-*.tar.gz

# Opción 3: Revertir cambios locales
git reset --hard HEAD~1
```

**Tiempo de rollback**: < 2 minutos

---

## 📝 NOTAS IMPORTANTES

### Para la Persona No Técnica (Sofía)
- Esta limpieza **NO toca la funcionalidad** de la app
- Es como ordenar el escritorio, no cambiar el negocio
- Producción seguirá funcionando exactamente igual
- Es 100% seguro y reversible

### Para Futuros Desarrolladores
- Los archivos eliminados están en Git history si se necesitan
- Archivos de análisis movidos a `docs/archive/` por si acaso
- `.gitignore` actualizado para mantener limpieza

---

## ✨ DESPUÉS DE ESTA LIMPIEZA

**Siguiente paso** (otro día, otra sesión):
- Habilitar validación TypeScript en código excluido
- Requiere más tiempo y testing
- Necesita aprobación explícita

**Hoy**: Solo limpieza segura de archivos temporales.

---

**Preparado por**: Senior Developer
**Fecha**: 13 de Diciembre 2025
**Ejecución**: Inmediata (con aprobación)
