# Resumen de Uso de Colores - Clousadmin

**Auditoría completa realizada**: 2025-11-07  
**Archivos analizados**: 130+  
**Rutas buscadas**: Excluido node_modules, .next, dist

---

## Tabla Rápida de Referencia

### Colores Principales del Sistema

| Color | Hex | Ubicación | Status | Acción |
|-------|-----|-----------|--------|--------|
| **Accent Antiguo** | #F26C21 | app/globals.css + 7 archivos | CRÍTICO | Reemplazar por #d97757 |
| **Accent Nuevo** | #d97757 | design-system.ts, 10 archivos | ACTIVO | Mantener y expandir |
| **Accent Hover** | #c6613f | design-system.ts, 8 archivos | ACTIVO | Mantener |
| **Accent Inactive** | #e1af9e | design-system.ts | ACTIVO | Mantener |
| **Pastel Rojo** | #F4564D | fecha-calendar.tsx | ESPECIAL | Revisar alineación |

### Colores Sistema Base (globals.css)

| Componente | Hex | Uso |
|-----------|-----|-----|
| Background | #FAF9F5 | Fondo principal |
| Surface | #FFFFFF | Superficies, cards |
| Surface Secondary | #F6F3F2 | Superficies secundarias |
| Text Primary | #3D3D3A | Texto principal |
| Text Secondary | #6B6A64 | Texto secundario |
| Text Disabled | #B0AFA9 | Texto deshabilitado |
| Border | #EFEFED | Bordes |
| Border Input | #E0DFD9 | Bordes de inputs |
| Success | #16A34A | Estados éxito |
| Success Light | #DCFCE7 | Fondo éxito |
| Error | #DC2626 | Estados error |
| Error Light | #FEE2E2 | Fondo error |
| Warning | #EA580C | Estados advertencia |
| Warning Light | #FFEDD5 | Fondo advertencia |
| Info | #0284C7 | Estados info |
| Info Light | #E0F2FE | Fondo info |

### Colores Externos (No Modificar)

| Color | Hex | Propósito | Ubicación |
|-------|-----|----------|-----------|
| Google Blue | #4285F4 | Logo Google | login-form.tsx |
| Google Green | #34A853 | Logo Google | login-form.tsx |
| Google Yellow | #FBBC05 | Logo Google | login-form.tsx |
| Google Red | #EA4335 | Logo Google | login-form.tsx |
| Recharts Default | #8884d8 | Gráfico | informes-client.tsx |

---

## Distribución de Archivos por Tipo

### Archivos con #F26C21 (Color Antiguo - 8 archivos)

```
1. app/globals.css                              [5 ocurrencias - CRÍTICO]
2. app/(dashboard)/hr/analytics/analytics-client.tsx          [6 ocurrencias]
3. app/(dashboard)/hr/informes/informes-client.tsx           [8 ocurrencias]
4. app/(dashboard)/hr/informes/analytics-client.tsx          [6 ocurrencias]
5. app/(dashboard)/hr/payroll/payroll-client.tsx             [7 ocurrencias]
6. components/shared/fichaje-widget.tsx                      [1 ocurrencia]
7. app/(dashboard)/empleado/mi-espacio/tabs/ausencias-tab.tsx [1 ocurrencia]
8. app/(dashboard)/empleado/mi-espacio/tabs/fichajes-tab.tsx  [1 ocurrencia]

Total: 35+ ocurrencias de #F26C21
```

### Archivos con #d97757 (Color Nuevo - 10 archivos)

```
1. lib/design-system.ts                                       [8 ocurrencias]
2. app/(dashboard)/empleado/horario/ausencias/ausencias-empleado-client.tsx
3. app/(dashboard)/empleado/horario/fichajes/fichajes-empleado-client.tsx
4. app/(dashboard)/empleado/mi-espacio/documentos/documentos-client.tsx
5. app/(dashboard)/empleado/mi-espacio/mi-espacio-client.tsx
6. app/(dashboard)/hr/mi-espacio/mi-espacio-hr-client.tsx
7. app/(dashboard)/hr/mi-espacio/tabs/documentos-tab.tsx
8. app/(dashboard)/hr/mi-espacio/tabs/fichajes-tab.tsx
9. app/(dashboard)/hr/mi-espacio/tabs/ausencias-tab.tsx
10. app/(dashboard)/manager/mi-espacio/mi-espacio-manager-client.tsx

Total: 15+ ocurrencias de #d97757
```

### Archivos con Fondos Circulares (8 archivos)

```
AVATARES/PLACEHOLDERS:
1. app/(dashboard)/hr/documentos/documentos-client.tsx       [bg-gradient-to-br]
2. app/(dashboard)/hr/organizacion/personas/[id]/empleado-detail-client.tsx  [bg-gray-100]
3. components/shared/solicitudes-widget.tsx                   [bg-stone-200]
4. components/ui/avatar.tsx                                   [componente base]

INDICADORES/ESTADOS:
5. app/(dashboard)/manager/equipo/page.tsx                   [bg-blue-100, bg-green-100, bg-red-100]
6. app/(dashboard)/hr/payroll/payroll-client.tsx             [bg-orange-50]
7. app/(dashboard)/empleado/bandeja-entrada/bandeja-entrada-client.tsx [bg-blue-600]
8. components/shared/empty-state.tsx                          [bg-gray-100]

Status: ACEPTABLE - Usados apropiadamente
```

### Archivos con Colores Tailwind (110+ archivos)

**Paleta más utilizada:**
- Blue: bg-blue-100, bg-blue-200, text-blue-600, text-blue-800, bg-blue-600
- Green: bg-green-100, bg-green-200, text-green-800, bg-green-600
- Orange: bg-orange-50, bg-orange-100, text-orange-600, text-orange-800
- Gray: Completa (50, 100, 200, 300, 500, 600, 700, 800, 900)
- Red, Yellow, Stone, Slate, Cyan, Lime, Sky, Violet

**Status:** BIEN IMPLEMENTADO

---

## Comparativa: Sistema Antiguo vs Nuevo

```
┌─────────────────────────────────────────────────────────────────┐
│ SISTEMA ANTIGUO (¿2024?)                                       │
├─────────────────────────────────────────────────────────────────┤
│ Color Principal:     #F26C21 (Naranja brillante)               │
│ Estado:              En CSS global y 7 componentes              │
│ Característica:      Naranja vibrante, alto contraste          │
│ Documentación:       Mínima                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SISTEMA NUEVO (2025)                                           │
├─────────────────────────────────────────────────────────────────┤
│ Color Principal:     #d97757 (Terracota/Naranja suave)         │
│ Hover:               #c6613f (Naranja oscuro)                  │
│ Inactive:            #e1af9e (Naranja pálido)                  │
│ Estado:              En design-system.ts, 10 componentes        │
│ Característica:      Terracota sofisticado, más cálido         │
│ Documentación:       Excelente (DESIGN_SYSTEM.md)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Migración

### Fase 1: CSS Global (INMEDIATA)
- [ ] Reemplazar `#F26C21` por `#d97757` en app/globals.css (líneas 19, 59, 99, 154)
- [ ] Reemplazar `#F26C21` por `#d97757` en variables CSS raíz (líneas 99, 154)
- [ ] Verificar compilación sin errores

### Fase 2: Gráficos y Charts (ALTA PRIORIDAD)
- [ ] Actualizar analytics-client.tsx (6 ocurrencias)
- [ ] Actualizar informes-client.tsx (8 ocurrencias)
- [ ] Actualizar informes/analytics-client.tsx (6 ocurrencias)
- [ ] Probar visualizaciones de datos

### Fase 3: Componentes Específicos (ALTA PRIORIDAD)
- [ ] payroll-client.tsx (7 ocurrencias)
- [ ] fichaje-widget.tsx (1 ocurrencia SVG)
- [ ] ausencias-tab.tsx (1 ocurrencia)
- [ ] fichajes-tab.tsx (1 ocurrencia)

### Fase 4: Revisión de Especiales (MEDIA)
- [ ] fecha-calendar.tsx: Decidir si #F4564D sigue siendo válido o cambiar
- [ ] Documentar excepciones (Google OAuth, recharts, emails)

### Fase 5: Testing y QA (FINAL)
- [ ] Testing visual en todos los navegadores
- [ ] Verificar contraste de colores (WCAG AA)
- [ ] Testing de modo oscuro (si aplica)

---

## Incidencias Detectadas

### Críticas (Resolver ya)
1. **Inconsistencia de variables CSS**
   - globals.css define #F26C21
   - design-system.ts define #d97757
   - Necesita unificación inmediata

2. **Hardcoding de colores en gráficos**
   - 20+ referencias hardcodeadas en componentes
   - Deberían extraerse a constantes o variables

### Moderadas (Resolver pronto)
3. **Color pastel #F4564D sin documentación**
   - Único uso en fecha-calendar
   - Deberías documentarse o alinearse con sistema

4. **Falta de constantes de color**
   - Muchos colores repetidos en código
   - Mejor crear constants.ts para colores

### Menores (Considerar)
5. **Emails usan colores independientes**
   - #2563eb, #4F46E5, grises diferentes
   - Comprensible pero podría unificarse si se desea

---

## Archivos de Documentación Generados

1. **COLOR_AUDIT_REPORT.md** (12 KB)
   - Reporte completo con análisis detallado
   - 11 secciones de análisis
   - Recomendaciones prioritarias

2. **DETAILED_COLOR_LISTING.md** (12 KB)
   - Listado línea por línea
   - Rutas absolutas de cada uso
   - Clasificación por tipo

3. **COLOR_USAGE_SUMMARY.md** (este archivo)
   - Resumen ejecutivo
   - Tablas de referencia rápida
   - Checklist de migración

---

## Comandos Útiles para Migración

```bash
# Buscar todas las ocurrencias de #F26C21
grep -r "#F26C21" --include="*.tsx" --include="*.ts" --include="*.css" .

# Buscar color antiguo (minúsculas)
grep -r "#f26c21" --include="*.tsx" --include="*.ts" --include="*.css" .

# Buscar todo en mayúsculas/minúsculas
grep -ri "#f26c21" --include="*.tsx" --include="*.ts" --include="*.css" .

# Contar ocurrencias
grep -ri "#f26c21" --include="*.tsx" --include="*.ts" --include="*.css" . | wc -l

# Reemplazar en un archivo (dry-run)
sed 's/#F26C21/#d97757/g' archivo.tsx | head -20

# Reemplazar en todos los archivos
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) \
  ! -path "./node_modules/*" \
  -exec sed -i 's/#F26C21/#d97757/g' {} \;
```

---

## Contactos y Referencias

- **Sistema de Diseño**: `/Users/sofiaroig/clousadmin/DESIGN_SYSTEM.md`
- **Design System TS**: `/Users/sofiaroig/clousadmin/lib/design-system.ts`
- **Reporte Completo**: `/Users/sofiaroig/clousadmin/COLOR_AUDIT_REPORT.md`
- **Listado Detallado**: `/Users/sofiaroig/clousadmin/DETAILED_COLOR_LISTING.md`

---

**Última actualización**: 2025-11-07  
**Versión del reporte**: 1.0  
**Auditor**: Claude Code - Color Audit System

