# AUDITORÍA COMPLETA DE COLORES - PROYECTO CLOUSADMIN

**Fecha de Auditoría**: 2025-11-07
**Nivel de Exhaustividad**: Very Thorough
**Estado General**: Sistema de colores bien documentado en DESIGN_SYSTEM.md

---

## 1. BÚSQUEDA DE COLOR ANTIGUO #f26c21 (NARANJA ANTIGUO)

### Status: **ENCONTRADO EN USO ACTIVO**

El color antiguo #F26C21 (mayúsculas) sigue siendo ampliamente utilizado en:
- **Gráficos y charts** (análisis, informes)
- **Iconos destacados**
- **Colores de estado en visualizaciones**

### Archivos que usan #F26C21:

#### 1. **CSS Global (app/globals.css)** - DEFINICIÓN PRINCIPAL
- Línea 19: `--color-accent: #F26C21;`
- Línea 22: `--color-accent-light: #FFF4ED;`
- Línea 59: `--color-chart-1: #F26C21;` (usado en gráficos)
- Línea 99-102: Variables raíz con mismo color
- Línea 154-158: Variables de chart con #F26C21

**Uso**: Color primario del sistema. **REQUIERE REEMPLAZO GLOBAL**

#### 2. **Componentes de Gráficos**
- `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/analytics/analytics-client.tsx`
  - Línea 208, 222, 234, 278, 292, 329, 344: Color de datos en gráficos
  - Múltiples referencias a `color: '#F26C21'`

- `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/informes/informes-client.tsx`
  - Línea 40: `{ tipo: 'Vacaciones', value: 45, color: '#F26C21' }`
  - Línea 139, 146, 199, 218: Strokes en gráficos
  - Línea 170: `fill="#8884d8"` (color externo)

- `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/informes/analytics-client.tsx`
  - Línea 182, 201, 258, 272, 338: Múltiples referencias a color '#F26C21'

#### 3. **Componentes de Iconos**
- `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/mi-espacio/tabs/ausencias-tab.tsx`
  - Línea 249: `<CalendarIcon className="w-5 h-5 text-[#F26C21]" />`

- `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/payroll/payroll-client.tsx`
  - Línea 90, 141, 167, 181, 195, 216: Iconos con `text-[#F26C21]`

- `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/mi-espacio/tabs/fichajes-tab.tsx`
  - Línea 132: `<Clock className="w-5 h-5 text-[#F26C21]" />`

#### 4. **Componentes SVG**
- `/Users/sofiaroig/clousadmin/components/shared/fichaje-widget.tsx`
  - Línea 364: `stroke="#F26C21"` (SVG render)

---

## 2. COLORES ALTERNATIVOS EN USO (NO ESTÁNDARES)

### Color Pastel Rojo - #F4564D
**Archivo**: `/Users/sofiaroig/clousadmin/components/shared/fecha-calendar.tsx`
- **Línea 21**: `style={{ backgroundColor: '#F4564D' }}`
- **Propósito**: Sección superior roja del widget calendario
- **Clasificación**: Color pastel/accent para componentes específicos
- **Nota**: Color diferente del sistema estándar, usado solo en calendario

### Colores Google OAuth - EXTERNOS
**Archivo**: `/Users/sofiaroig/clousadmin/app/(auth)/login/login-form.tsx`
- Línea 184: `fill="#4285F4"` (Azul Google)
- Línea 188: `fill="#34A853"` (Verde Google)
- Línea 192: `fill="#FBBC05"` (Amarillo Google)
- Línea 196: `fill="#EA4335"` (Rojo Google)
- **Propósito**: Logo de Google (elementos externos, no deben modificarse)

### Color Chart Recharts - #8884d8
**Archivo**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/informes/informes-client.tsx`
- Línea 170: `fill="#8884d8"` (Azul pastel de recharts)
- **Propósito**: Ejemplo/fallback en gráfico de pie
- **Tipo**: Color de librería externa

---

## 3. COLORES PERSONALIZADOS EN DESIGN-SYSTEM.TS

**Archivo**: `/Users/sofiaroig/clousadmin/lib/design-system.ts`

### Paleta de Acentos Personalizados:
```
#d97757 - Active (Terracota/Naranja suave) - COLOR NUEVO ESTÁNDAR
#e1af9e - Inactive (Naranja pálido)
#c6613f - Hover (Naranja oscuro para interacción)
```

**Uso en archivos**:
- Línea 14: `active: '#d97757'` - Color principal de acento
- Línea 16: `inactive: '#e1af9e'` - Estado deshabilitado
- Línea 18: `hover: '#c6613f'` - Estado hover
- Líneas 41, 47, 56, 59: Clases CSS que utilizan estos colores

**Archivos que usan estos colores**:
1. `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/horario/ausencias/ausencias-empleado-client.tsx`
   - Línea 128: `<Calendar className="w-5 h-5 text-[#d97757]" />`

2. `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/horario/fichajes/fichajes-empleado-client.tsx`
   - Línea 239: `<Clock className="w-5 h-5 text-[#d97757]" />`

3. Múltiples archivos con hover color `#c6613f`:
   - documentos-client.tsx (línea 56, 78)
   - mi-espacio-client.tsx (línea 63)
   - mi-espacio-hr-client.tsx (línea 53)
   - mi-espacio-manager-client.tsx (línea 53)

---

## 4. ICONOS CON FONDOS CIRCULARES (ROUNDED-FULL BG-)

### Ubicaciones encontradas:

#### a) Fondos Informativos (Permitidos en UI):
1. **`/Users/sofiaroig/clousadmin/app/(dashboard)/manager/equipo/page.tsx`**
   - Línea 226: `<div className="rounded-full bg-blue-100 p-3">`
   - Línea 238: `<div className="rounded-full bg-green-100 p-3">`
   - Línea 252: `<div className="rounded-full bg-red-100 p-3">`
   - **Tipo**: Indicadores de estado de equipo

2. **`/Users/sofiaroig/clousadmin/app/(dashboard)/hr/documentos/documentos-client.tsx`**
   - Línea ~: `<div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 ...`
   - **Tipo**: Avatar placeholder de usuario

3. **`/Users/sofiaroig/clousadmin/app/(dashboard)/hr/payroll/payroll-client.tsx`**
   - Línea 140: `<div className="w-20 h-20 bg-orange-50 rounded-full ...`
   - Línea 215: `<div className="w-20 h-20 bg-orange-50 rounded-full ...`
   - **Tipo**: Placeholder de documento

#### b) Elementos Menores:
- **`/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/bandeja-entrada/bandeja-entrada-client.tsx`**
  - Línea ~: `<div className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-2" />`
  - **Tipo**: Indicador de notificación no leída (punto pequeño)

- **`/Users/sofiaroig/clousadmin/components/shared/empty-state.tsx`**
  - `<EmptyMedia className="w-20 h-20 rounded-full bg-gray-100 mb-4">`
  - **Tipo**: Estado vacío decorativo

- **`/Users/sofiaroig/clousadmin/components/shared/solicitudes-widget.tsx`**
  - `<div className="w-10 h-10 rounded-full bg-stone-200 ...`
  - **Tipo**: Avatar de usuario

#### c) Componentes UI (Avatar):
- **`/Users/sofiaroig/clousadmin/components/ui/avatar.tsx`**
  - Clase base para avatares (uso estándar permitido)

---

## 5. COLORES TAILWIND ESTÁNDAR EN USO

### Paleta de Estados (Tailwind estándar):
- **Azul**: `bg-blue-100`, `bg-blue-200`, `text-blue-600`, `text-blue-800`, `bg-blue-600`
- **Verde**: `bg-green-100`, `bg-green-200`, `text-green-800`, `bg-green-600`
- **Rojo**: `bg-red-100`, `text-red-800`, `bg-red-600`
- **Amarillo**: `bg-yellow-100`, `text-yellow-800`, `text-yellow-600`
- **Naranja**: `bg-orange-50`, `bg-orange-100`, `text-orange-600`, `text-orange-800`
- **Gris**: `bg-gray-50`, `bg-gray-100`, `bg-gray-200`, `text-gray-500` hasta `text-gray-900`
- **Stone**: `bg-stone-200`, `text-stone-700`
- **Zinc**: Varias clases (tipografía principalmente)

### Archivos principales con Tailwind:
- `components/empleado/preferencias-vacaciones-modal.tsx` - Estados badge orange
- `components/shared/document-list.tsx` - Clasificación documentos
- Múltiples archivos de UI (110+ archivos con colores Tailwind)

---

## 6. COLORES EN EMAIL/COMUNICACIONES (lib/email.ts)

**Colores encontrados**:
- `#2563eb` (Azul Tailwind) - Enlaces y títulos en emails
- `#f3f4f6` (Gris claro) - Fondos informativos
- `#4F46E5` (Índigo) - Botones CTA
- `#e5e7eb` (Gris borde) - Separadores

**Nota**: Estos son colores de email y pueden diferir del sistema principal.

---

## 7. RESUMEN DE COLORES POR CATEGORÍA

### ACCENT/PRIMARY (NARANJA - REQUIERE ATENCIÓN)
```
ANTIGUO (aún en uso):     #F26C21 (naranja brillante)
NUEVO (design-system):    #d97757 (terracota)
NUEVO (hover):            #c6613f (naranja oscuro)
NUEVO (inactive):         #e1af9e (naranja pálido)
```
**Ubicaciones**: globals.css, analytics, informes, charts, payroll

### SISTEMA BASE (globals.css)
```
Background:               #FAF9F5
Surface:                  #FFFFFF
Surface Secondary:        #F6F3F2
Border:                   #EFEFED
Border Input:             #E0DFD9
Text Primary:             #3D3D3A
Text Secondary:           #6B6A64
Text Disabled:            #B0AFA9
Success:                  #16A34A
Success Light:            #DCFCE7
Error:                    #DC2626
Error Light:              #FEE2E2
Warning:                  #EA580C
Warning Light:            #FFEDD5
Info:                     #0284C7
Info Light:               #E0F2FE
```

### PASTEL/ESPECIALES
```
Calendario Rojo:          #F4564D (fecha-calendar.tsx)
Chart Default:            #8884d8 (recharts)
Google OAuth:             #4285F4, #34A853, #FBBC05, #EA4335
```

### TAILWIND ESTÁNDAR
```
Blue:     100, 200, 600, 800
Green:    100, 200, 600, 800
Red:      100, 600, 800
Yellow:   100, 600, 800
Orange:   50, 100, 600, 700, 800
Gray:     50, 100, 200, 300, 500, 600, 700, 800, 900
Stone:    200, 700
Slate:    500, 600
Cyan:     200
Lime:     100, 200
Sky:      200
Violet:   200
```

---

## 8. INCIDENCIAS Y RECOMENDACIONES

### CRÍTICO:
1. **Color antiguo #F26C21 aún en uso**
   - Aparece en `globals.css` como variable primaria
   - Necesita reemplazo por #d97757 o nuevo sistema
   - Afecta gráficos, charts e iconos

2. **Inconsistencia de colores de acento**
   - `globals.css` usa #F26C21
   - `design-system.ts` usa #d97757
   - Necesita unificación

### MODERADO:
1. **Color pastel #F4564D en fecha-calendar**
   - No sigue paleta definida
   - Considerar alineación con sistema

2. **Múltiples archivos con colores hardcodeados**
   - Mejor usar variables CSS del sistema
   - Facilita mantenimiento futuro

### MENOR:
1. **Google OAuth usa colores específicos** (correcto - no modificar)
2. **Recharts usa color por defecto** (comprensible, librería externa)

---

## 9. ARCHIVOS A REVISAR PRIORITARIAMENTE

**ALTA PRIORIDAD** (contienen #F26C21):
```
/Users/sofiaroig/clousadmin/app/globals.css
/Users/sofiaroig/clousadmin/app/(dashboard)/hr/analytics/analytics-client.tsx
/Users/sofiaroig/clousadmin/app/(dashboard)/hr/informes/informes-client.tsx
/Users/sofiaroig/clousadmin/app/(dashboard)/hr/payroll/payroll-client.tsx
/Users/sofiaroig/clousadmin/components/shared/fichaje-widget.tsx
```

**MEDIA PRIORIDAD** (colores personalizados):
```
/Users/sofiaroig/clousadmin/lib/design-system.ts
/Users/sofiaroig/clousadmin/components/shared/fecha-calendar.tsx
/Users/sofiaroig/clousadmin/lib/email.ts
```

**BAJA PRIORIDAD** (revisar iconos con fondos):
```
/Users/sofiaroig/clousadmin/app/(dashboard)/manager/equipo/page.tsx
/Users/sofiaroig/clousadmin/app/(dashboard)/hr/documentos/documentos-client.tsx
/Users/sofiaroig/clousadmin/components/ui/avatar.tsx
```

---

## 10. CONTEO DE USOS POR COLOR

| Color | Formato | Ocurrencias | Tipo | Acción |
|-------|---------|------------|------|--------|
| #F26C21 | Hex uppercase | 40+ | CSS vars, gráficos | Reemplazar |
| #f26c21 | Hex lowercase | 0 | N/A | N/A |
| #d97757 | Design system | 15+ | Iconos, accentos | Mantener |
| #c6613f | Hover state | 8+ | Interacción | Mantener |
| #e1af9e | Inactive | 5+ | Deshabilitado | Mantener |
| #F4564D | Pastel rojo | 1 | Calendario | Revisar |
| #8884d8 | Chart color | 1 | Gráfico | Mantener |
| Google colors | OAuth | 4 | Externos | No tocar |

---

## 11. CONCLUSIONES

**Estado del Proyecto**: Sistema de colores en **transición**
- Documentación excelente en DESIGN_SYSTEM.md
- Design system bien definido (design-system.ts)
- Pero implementación aún usa color antiguo (#F26C21) en muchos lugares
- Inconsistencia entre definición (globals.css) e implementación (componentes)

**Recomendaciones Finales**:
1. Unificar color de acento: #F26C21 → #d97757
2. Actualizar globals.css con nuevos colores
3. Revisar y estandarizar colores en gráficos
4. Documentar excepciones (avatares, oauth, pastel colors)

