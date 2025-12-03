# Fix: Dialog que se cierra + Separación de Documentos + UX Improvements

**Fecha**: 2 de diciembre de 2025  
**Tipo**: Bug Fix + Feature Enhancement + UX Improvements  
**Estado**: ✅ Completado

## Problema 1: Dialog se Cierra Inmediatamente

### Síntoma
Al abrir el dialog de "Nueva Persona", se cerraba inmediatamente después de abrirse.

### Causa
La lógica de control de estado tenía un conflicto:
- `showPreDialog` empezaba en `true`
- Al seleccionar un tipo, se llamaba `setShowPreDialog(false)`
- El cambio de estado de `open` en el pre-dialog disparaba `onOpenChange(false)`
- Esto cerraba TODO el flujo

### Solución
Simplificación de la lógica de estado en `add-persona-dialog.tsx`:

**ANTES**:
```typescript
const [showPreDialog, setShowPreDialog] = useState(true);
const [showOnboardingForm, setShowOnboardingForm] = useState(false);
```

**DESPUÉS**:
```typescript
const [showingForm, setShowingForm] = useState(false);
// Pre-dialog se muestra cuando !showingForm
// Form se muestra cuando showingForm
```

**Lógica mejorada**:
- Pre-dialog visible: `!showingForm`
- Form visible: `showingForm`
- Solo se cierra TODO cuando se cierra el form o se cancela el pre-dialog sin seleccionar

## Problema 2: Documentos Mezclados

### Contexto
En el wizard de onboarding había un solo paso "Documentos" que mezclaba:
- Documentos que HR sube para que el empleado VEA/DESCARGUE
- Documentos que el EMPLEADO debe SUBIR

Esto generaba confusión sobre qué documentos debía subir cada parte.

### Solución
Separación en 2 pasos distintos en el wizard:

#### Paso 2: Documentos para Visualizar/Descargar
**¿Qué es?**
- Documentos que HR sube (o ya ha subido)
- El empleado los verá o descargará durante el onboarding
- Ejemplos: Manual del empleado, Políticas de la empresa, Código de conducta

**¿Cómo funciona?**
- Muestra documentos con `requiereVisualizacion: true` y `requiereFirma: false`
- HR puede subir documentos adicionales específicos para este empleado
- Los documentos se filtran por equipo del empleado

**UI**:
- Lista de documentos configurados (fondo gris claro, icono azul)
- Accordion para documentos adicionales
- DocumentUploader para subir documentos específicos

#### Paso 3: Documentos para Subir
**¿Qué es?**
- Documentos que el EMPLEADO debe subir
- El empleado los subirá durante su onboarding
- Ejemplos: Foto DNI, Certificados académicos, Títulos profesionales

**¿Cómo funciona?**
- Muestra documentos con `requiereVisualizacion: false` y `requiereFirma: false`
- Solo se muestran como lista (no se suben aquí, los sube el empleado)
- Se filtran por equipo

**UI**:
- Lista de documentos que se solicitarán (fondo ámbar, icono ámbar)
- Badge "Requerido" si aplica
- Info box explicando que el empleado los subirá

#### Paso 4: Firmas
Sin cambios, sigue igual.

### Nueva Estructura del Wizard

```
1. Datos Básicos
   └─ Info del empleado

2. Docs. Visualizar
   └─ HR sube → Empleado ve/descarga

3. Docs. Subir
   └─ Empleado sube → HR revisa

4. Firmas
   └─ Documentos para firma digital
```

## Cambios en el Código

### 1. Simplificación de add-persona-dialog.tsx

```typescript
// Estado simplificado
const [showingForm, setShowingForm] = useState(false);

// Pre-dialog
open={open && !showingForm}

// Form
open={open && showingForm}
```

### 2. Wizard con 4 pasos

```typescript
const steps = [
  { id: 'basicos', label: 'Datos Básicos' },
  { id: 'docs-visualizar', label: 'Docs. Visualizar' },
  { id: 'docs-subir', label: 'Docs. Subir' },
  { id: 'firmas', label: 'Firmas' },
];
```

### 3. Filtrado de documentos por tipo

**Para visualizar**:
```typescript
documentosFiltrados.filter((d) => 
  d.requiereVisualizacion && !d.requiereFirma
)
```

**Para subir**:
```typescript
documentosFiltrados.filter((d) => 
  !d.requiereVisualizacion && !d.requiereFirma
)
```

**Para firma**:
```typescript
firmasFiltradas // Ya vienen filtradas con requiereFirma: true
```

## Lógica de Documentos

### Campo: `requiereVisualizacion`

| Valor | Significado | Quién sube | Quién ve |
|-------|-------------|------------|----------|
| `true` | Documento para ver/descargar | HR | Empleado |
| `false` | Documento para subir | Empleado | HR |

### Combinaciones

| `requiereVisualizacion` | `requiereFirma` | Tipo |
|------------------------|-----------------|------|
| `true` | `false` | Visualizar/Descargar |
| `false` | `false` | Subir |
| N/A | `true` | Firma |

## UI/UX Mejoras

### Estados Vacíos
Cada paso muestra un mensaje específico cuando no hay documentos:

**Paso 2 (Visualizar)**:
```
[Icono FileText gris]
No hay documentos de visualización configurados
Puedes configurarlos en "Gestionar Onboarding"
```

**Paso 3 (Subir)**:
```
[Icono FileText gris]
No hay documentos de subida configurados
El empleado no tendrá que subir ningún documento
```

### Diferenciación Visual

**Documentos para visualizar**:
- Fondo: `bg-gray-50`
- Icono: `text-blue-600`

**Documentos para subir**:
- Fondo: `bg-amber-50 border-amber-200`
- Icono: `text-amber-600`
- Badge: `bg-amber-100`

### Info Boxes

**Paso 3 (Subir)**:
```
⚠️ Nota: Estos documentos serán solicitados al empleado durante su onboarding.
El empleado deberá subirlos antes de completar el proceso.
```

## Archivos Modificados

- ✅ `components/organizacion/add-persona-dialog.tsx`
  - Simplificación de lógica de estado
  - Fix del bug de cierre

- ✅ `components/organizacion/add-persona-onboarding-form.tsx`
  - 4 pasos en lugar de 3
  - Separación clara de documentos por tipo
  - UI mejorada con diferenciación visual

## Verificación

```bash
npx tsc --noEmit
# ✅ Sin errores

npm run build
# ✅ Build exitoso
```

## Próximos Pasos (Gestionar Onboarding)

En el modal "Gestionar Onboarding", ahora necesitas actualizar:

1. **Tab Documentos** → Cambiar a:
   - **Documentos para Visualizar** (empleado ve/descarga)
   - Checkbox "Requiere visualización" siempre `true`

2. **Nuevo Tab "Documentos para Subir"**:
   - Lista de documentos que el empleado debe subir
   - Checkbox "Requerido"
   - Sin checkbox de visualización (siempre `false`)
   - Asignación por equipos igual

3. **Tab Firmas** → Sin cambios

## Mejoras UX Adicionales (Segunda Iteración)

### 1. Stepper en Sidebar
**Antes**: Stepper horizontal encima del contenido  
**Después**: Stepper integrado en el sidebar como items numerados

**Comportamiento**:
- Número del paso en círculo
- Color gris para paso actual
- Color primary para pasos completados
- Gris claro para pasos pendientes

### 2. Colores Consistentes
**Cambios**:
- Pre-dialog: De colores azul/verde a `primary` (colores del sistema)
- Stepper: Gris para actual, primary para completados (no verde)
- Uso de variables CSS del tema en lugar de colores hardcoded

### 3. Nombres de Pasos Mejorados
**Antes**:
- Docs. Visualizar
- Docs. Subir

**Después**:
- Ver/Descargar (para documentos que HR sube)
- Documentos (para documentos que el empleado sube)

### 4. Campos Requeridos
**Cambios**:
- Puesto: Ahora requerido (antes opcional)
- Equipo: Ahora requerido (antes opcional)
- Sede: Sigue siendo opcional
- Validación actualizada en `canGoNext()`

### 5. Documentos Adicionales
**Antes**: En acordeón colapsado  
**Después**: Siempre visible, sin acordeón

**Justificación**: Los documentos adicionales son una funcionalidad principal, no secundaria. Deben estar siempre accesibles independientemente de si hay documentos configurados o no.

### 6. Banners Eliminados
**Removidos**:
- Banner "Nota: Estos documentos serán solicitados..." en paso de Documentos
- Banner "¿Listo para enviar? Se enviará un email..." en paso de Firmas

**Justificación**: Información redundante que ocupa espacio.

### 7. Botón Finalizar Unificado
**Antes**: Botón "Crear y Enviar Onboarding" en el paso de Firmas  
**Después**: Botón "Finalizar y Enviar" en el footer (igual que "Siguiente")

**Mejora**: Evita duplicación de botones y mantiene consistencia en la navegación.

### 8. Gestionar Onboarding - Campos Agrupados
**Antes**: 4 acordeones (Personales, Contacto, Dirección, Bancarios)  
**Después**: 2 acordeones (Datos Personales, Datos Bancarios)

**Cambio**: Todos los campos personales, contacto y dirección ahora en un solo grupo.

### 9. Gestionar Onboarding - Separación de Documentos
**Antes**: 1 sección "Documentos"  
**Después**: 2 secciones separadas

**Secciones**:
1. **Ver/Descargar**: Documentos que HR sube para que el empleado vea
2. **Documentos**: Documentos que el empleado debe subir

**Sidebar actualizado**:
- Campos
- Ver/Descargar
- Documentos
- Firmas

### 10. Botones de Guardar Más Pequeños
**Antes**: `className="w-full"` (ocupan todo el ancho)  
**Después**: Sin clase de ancho, en contenedor `flex justify-start`

**Resultado**: Botones más compactos, alineados a la izquierda.

## Resultado Final

✅ **Dialog funciona correctamente** (no se cierra solo)  
✅ **Documentos separados por tipo** (visualizar vs subir)  
✅ **UI clara y diferenciada** (colores, iconos, mensajes)  
✅ **Lógica consistente** (filtrado por tipo)  
✅ **Sin errores de TypeScript**  
✅ **Stepper en sidebar** (mejor uso del espacio)  
✅ **Colores consistentes** (primary theme colors)  
✅ **Validaciones mejoradas** (puesto y equipo requeridos)  
✅ **UX simplificada** (menos banners, menos acordeones)  
✅ **Gestionar Onboarding actualizado** (2 pasos de documentos)

