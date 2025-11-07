# LISTADO DETALLADO DE ARCHIVOS CON USOS DE COLORES

## ARCHIVOS CON #F26C21 (COLOR ANTIGUO - REQUIERE REEMPLAZO)

### 1. app/globals.css
**Ruta**: `/Users/sofiaroig/clousadmin/app/globals.css`
**Líneas**:
- 19: `--color-accent: #F26C21;`
- 22: `--color-accent-light: #FFF4ED;`
- 59: `--color-chart-1: #F26C21;`
- 99: `--accent: #F26C21;`
- 102: `--accent-light: #FFF4ED;`
- 154: `--chart-1: #F26C21;`
**Crítico**: SI - Define color primario del sistema

### 2. app/(dashboard)/hr/analytics/analytics-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/analytics/analytics-client.tsx`
**Líneas**:
- 208: `color: '#F26C21'` (gráfico)
- 222: `color: '#F26C21'` (gráfico)
- 234: `hombre: { label: 'Hombre', color: '#F26C21' }`
- 253: `color: '#22c55e'` (verde success)
- 257: `color: '#ef4444'` (rojo error)
- 278: `color: '#F26C21'` (gráfico)
- 292: `color: '#F26C21'` (gráfico)
- 307: `color: '#6B6A64'` (gris)
- 329: `color: '#F26C21'` (gráfico)
- 344: `color: '#F26C21'` (gráfico)
- 358: `color: '#ef4444'` (rojo)
**Tipo**: Datos de gráficos

### 3. app/(dashboard)/hr/informes/informes-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/informes/informes-client.tsx`
**Líneas**:
- 40: `{ tipo: 'Vacaciones', value: 45, color: '#F26C21' }`
- 41: `{ tipo: 'Enfermedad', value: 30, color: '#6B6A64' }`
- 42: `{ tipo: 'Permisos', value: 15, color: '#3D3D3A' }`
- 43: `{ tipo: 'Otros', value: 10, color: '#EFEFED' }`
- 131: `stroke="#EFEFED"` (grid)
- 132: `stroke="#6B6A64"` (axis)
- 133: `stroke="#6B6A64"` (axis)
- 139: `stroke="#F26C21"` (line chart)
- 146: `stroke="#6B6A64"` (line chart)
- 170: `fill="#8884d8"` (pie chart color)
- 195: `stroke="#EFEFED"` (grid)
- 196: `stroke="#6B6A64"` (axis)
- 197: `stroke="#6B6A64"` (axis)
- 199: `fill="#F26C21"` (bar)
- 211: `stroke="#EFEFED"` (grid)
- 212: `stroke="#6B6A64"` (axis)
- 213: `stroke="#6B6A64"` (axis)
- 218: `stroke="#F26C21"` (line chart)
**Tipo**: Datos de gráficos, colores de visualización

### 4. app/(dashboard)/hr/informes/analytics-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/informes/analytics-client.tsx`
**Líneas**:
- 182: `color: '#F26C21'`
- 201: `color: '#F26C21'`
- 258: `color: '#F26C21'`
- 272: `color: '#F26C21'`
- 289: `color: '#6B6A64'`
- 338: `color: '#F26C21'`
**Tipo**: Datos de gráficos

### 5. app/(dashboard)/hr/payroll/payroll-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/payroll/payroll-client.tsx`
**Líneas**:
- 81: `? 'text-orange-600'` (Tailwind)
- 89: `<div className="p-3 bg-orange-50 ...` (Tailwind)
- 90: `<FileText className="w-6 h-6 text-[#F26C21]" />`
- 140: `<div className="w-20 h-20 bg-orange-50 rounded-full ...`
- 141: `<FileText className="w-10 h-10 text-[#F26C21]" />`
- 166: `<div className="w-8 h-8 bg-orange-100 ...`
- 167: `<FileText className="w-4 h-4 text-[#F26C21]" />`
- 180: `<div className="w-8 h-8 bg-orange-100 ...`
- 181: `<AlertCircle className="w-4 h-4 text-[#F26C21]" />`
- 194: `<div className="w-8 h-8 bg-orange-100 ...`
- 195: `<Download className="w-4 h-4 text-[#F26C21]" />`
- 215: `<div className="w-20 h-20 bg-orange-50 rounded-full ...`
- 216: `<FileText className="w-10 h-10 text-[#F26C21]" />`
**Tipo**: Iconos, fondos, clases Tailwind

### 6. components/shared/fichaje-widget.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/components/shared/fichaje-widget.tsx`
**Líneas**:
- 351: `stroke="#EFEFED"` (SVG grid)
- 364: `stroke="#F26C21"` (SVG line)
**Tipo**: Render SVG de gráfico

### 7. app/(dashboard)/empleado/mi-espacio/tabs/ausencias-tab.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/mi-espacio/tabs/ausencias-tab.tsx`
**Líneas**:
- 249: `<CalendarIcon className="w-5 h-5 text-[#F26C21]" />`
**Tipo**: Icono

### 8. app/(dashboard)/empleado/mi-espacio/tabs/fichajes-tab.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/mi-espacio/tabs/fichajes-tab.tsx`
**Líneas**:
- 132: `<Clock className="w-5 h-5 text-[#F26C21]" />`
**Tipo**: Icono

---

## ARCHIVOS CON COLORES DEL NUEVO DESIGN SYSTEM (#d97757, #c6613f, #e1af9e)

### 1. lib/design-system.ts
**Ruta**: `/Users/sofiaroig/clousadmin/lib/design-system.ts`
**Líneas**:
- 14: `active: '#d97757'` (Terracota activo)
- 16: `inactive: '#e1af9e'` (Naranja pálido inactivo)
- 18: `hover: '#c6613f'` (Naranja oscuro hover)
- 41: `text-[#d97757]` (clase para icono accent)
- 47: `text-[#d97757]` (clase para icono pequeño accent)
- 56: `hover:text-[#c6613f]` (hover interactivo)
- 59: `hover:text-[#c6613f]` (hover interactivo pequeño)
- 108: `text-[#d97757]` (función helper)
- 133: `text-[#d97757]` (función helper)
**Crítico**: SI - Define nuevo sistema de colores

### 2. app/(dashboard)/empleado/horario/ausencias/ausencias-empleado-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/horario/ausencias/ausencias-empleado-client.tsx`
**Líneas**:
- 128: `<Calendar className="w-5 h-5 text-[#d97757]" />`
**Tipo**: Icono con nuevo color

### 3. app/(dashboard)/empleado/horario/fichajes/fichajes-empleado-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/horario/fichajes/fichajes-empleado-client.tsx`
**Líneas**:
- 239: `<Clock className="w-5 h-5 text-[#d97757]" />`
**Tipo**: Icono con nuevo color

### 4. app/(dashboard)/empleado/mi-espacio/documentos/documentos-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/mi-espacio/documentos/documentos-client.tsx`
**Líneas**:
- 56: `group-hover:text-[#c6613f]`
- 78: `group-hover:text-[#c6613f]`
**Tipo**: Hover interactivo

### 5. app/(dashboard)/empleado/mi-espacio/mi-espacio-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/mi-espacio/mi-espacio-client.tsx`
**Líneas**:
- 63: `hover:text-[#c6613f]`
**Tipo**: Hover interactivo

### 6. app/(dashboard)/hr/mi-espacio/mi-espacio-hr-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/mi-espacio/mi-espacio-hr-client.tsx`
**Líneas**:
- 53: `hover:text-[#c6613f]`
**Tipo**: Hover interactivo

### 7. app/(dashboard)/hr/mi-espacio/tabs/documentos-tab.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/mi-espacio/tabs/documentos-tab.tsx`
**Líneas**:
- 48: `group-hover:text-[#c6613f]`
- 70: `group-hover:text-[#c6613f]`
**Tipo**: Hover interactivo

### 8. app/(dashboard)/hr/mi-espacio/tabs/fichajes-tab.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/mi-espacio/tabs/fichajes-tab.tsx`
**Líneas**:
- 152: `<Clock className="w-5 h-5 text-[#d97757]" />`
**Tipo**: Icono con nuevo color

### 9. app/(dashboard)/hr/mi-espacio/tabs/ausencias-tab.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/mi-espacio/tabs/ausencias-tab.tsx`
**Líneas**:
- 101: `<Calendar className="w-5 h-5 text-[#d97757]" />`
**Tipo**: Icono con nuevo color

### 10. app/(dashboard)/manager/mi-espacio/mi-espacio-manager-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/manager/mi-espacio/mi-espacio-manager-client.tsx`
**Líneas**:
- 53: `hover:text-[#c6613f]`
**Tipo**: Hover interactivo

---

## ARCHIVOS CON COLORES PASTEL/ESPECIALES

### 1. components/shared/fecha-calendar.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/components/shared/fecha-calendar.tsx`
**Líneas**:
- 21: `style={{ backgroundColor: '#F4564D' }}`
**Color**: #F4564D (Rojo pastel)
**Propósito**: Cabecera roja del widget calendario
**Nota**: Color específico no documentado en sistema

### 2. app/(auth)/login/login-form.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(auth)/login/login-form.tsx`
**Líneas**:
- 184: `fill="#4285F4"` (Azul Google)
- 188: `fill="#34A853"` (Verde Google)
- 192: `fill="#FBBC05"` (Amarillo Google)
- 196: `fill="#EA4335"` (Rojo Google)
**Color**: Colores oficiales de Google
**Propósito**: Logo de Google OAuth
**Nota**: NO MODIFICAR - son colores de marca oficial

### 3. app/(dashboard)/hr/informes/informes-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/informes/informes-client.tsx`
**Líneas**:
- 170: `fill="#8884d8"` (Azul pastel recharts)
**Color**: #8884d8 (Color por defecto de recharts)
**Propósito**: Gráfico de pie
**Nota**: Color de librería externa, uso comprensible

---

## ARCHIVOS CON ICONOS CON FONDOS CIRCULARES

### 1. app/(dashboard)/manager/equipo/page.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/manager/equipo/page.tsx`
**Líneas**:
- 226: `<div className="rounded-full bg-blue-100 p-3">`
- 238: `<div className="rounded-full bg-green-100 p-3">`
- 252: `<div className="rounded-full bg-red-100 p-3">`
**Tipo**: Indicadores de estado de equipo
**Status**: Aceptable - uso informativo

### 2. app/(dashboard)/hr/documentos/documentos-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/documentos/documentos-client.tsx`
**Líneas**:
- ~: `<div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 ...`
**Tipo**: Avatar placeholder
**Status**: Aceptable - uso de avatar

### 3. app/(dashboard)/hr/organizacion/personas/[id]/empleado-detail-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/organizacion/personas/[id]/empleado-detail-client.tsx`
**Líneas**:
- 868: `<div className="w-24 h-24 rounded-full bg-gray-100 ...`
**Tipo**: Avatar de usuario
**Status**: Aceptable - uso de avatar

### 4. app/(dashboard)/hr/payroll/payroll-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/hr/payroll/payroll-client.tsx`
**Líneas**:
- 140: `<div className="w-20 h-20 bg-orange-50 rounded-full ...`
- 215: `<div className="w-20 h-20 bg-orange-50 rounded-full ...`
**Tipo**: Placeholder de documento
**Status**: Aceptable - uso de contenedor informativo

### 5. app/(dashboard)/empleado/bandeja-entrada/bandeja-entrada-client.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/app/(dashboard)/empleado/bandeja-entrada/bandeja-entrada-client.tsx`
**Líneas**:
- ~: `<div className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-2" />`
**Tipo**: Indicador de notificación
**Status**: Aceptable - elemento pequeño informativo

### 6. components/shared/empty-state.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/components/shared/empty-state.tsx`
**Líneas**:
- ~: `<EmptyMedia className="w-20 h-20 rounded-full bg-gray-100 mb-4">`
**Tipo**: Estado vacío decorativo
**Status**: Aceptable - uso decorativo

### 7. components/shared/solicitudes-widget.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/components/shared/solicitudes-widget.tsx`
**Líneas**:
- ~: `<div className="w-10 h-10 rounded-full bg-stone-200 ...`
**Tipo**: Avatar de usuario
**Status**: Aceptable - uso de avatar

### 8. components/ui/avatar.tsx
**Ruta**: `/Users/sofiaroig/clousadmin/components/ui/avatar.tsx`
**Líneas**:
- 45: `"bg-muted flex size-full items-center justify-center rounded-full"`
**Tipo**: Componente base para avatares
**Status**: Aceptable - componente de UI

---

## ARCHIVOS CON COLORES TAILWIND ESTÁNDAR

Total de archivos: 110+

**Archivos principales con múltiples colores Tailwind**:
- components/ui/button.tsx
- components/shared/widget-card.tsx
- components/shared/table-filters.tsx
- components/shared/solicitudes-widget.tsx
- components/shared/notificaciones-widget.tsx
- components/shared/empty-state.tsx
- components/shared/document-list.tsx
- components/layout/sidebar.tsx
- app/(dashboard)/onboarding/cargar-datos/onboarding-client.tsx
- Y 100+ más...

**Paleta Tailwind más utilizada**:
- blue (100, 200, 600, 800)
- green (100, 200, 600, 800)
- red (100, 600, 800)
- orange (50, 100, 600, 700, 800)
- gray (50, 100, 200, 300, 500, 600, 700, 800, 900)
- yellow (100, 600, 800)

---

## ARCHIVOS CON COLORES EN EMAIL

### 1. lib/email.ts
**Ruta**: `/Users/sofiaroig/clousadmin/lib/email.ts`
**Líneas**:
- 103: `<h1 style="color: #2563eb;">` (Azul Tailwind)
- 108: `style="background-color: #2563eb;"` (Azul)
- 114: `<a href="${invitationUrl}" style="color: #2563eb;">` (Azul)
- 158: `<h1 style="color: #2563eb;">` (Azul)
- 204: `<h1 style="color: #2563eb;">` (Azul)
- 209: `style="background-color: #2563eb;"` (Azul)
- 215: `style="color: #2563eb;">` (Azul)
- 263: `<h1 style="color: #2563eb;">` (Azul)
- 271: `style="background-color: #f3f4f6;"` (Gris claro)
- 283: `style="background-color: #4F46E5;"` (Índigo)
- 290: `style="color: #2563eb;">` (Azul)
- 293: `style="border-top: 1px solid #e5e7eb;"` (Gris borde)
**Colores**: Azul (#2563eb), Índigo (#4F46E5), Gris (#f3f4f6, #e5e7eb)
**Propósito**: Emails de notificación
**Nota**: Pueden diferir del sistema principal

---

## RESUMEN ESTADÍSTICO

**Archivos con #F26C21**: 8
**Archivos con #d97757 y variantes**: 10
**Archivos con fondos circulares**: 8
**Archivos con colores Tailwind**: 110+
**Archivos con colores especiales**: 3
**Total de archivos analizados**: 130+

