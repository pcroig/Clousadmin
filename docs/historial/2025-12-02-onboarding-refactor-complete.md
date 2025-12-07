# Refactorización Completa del Sistema de Onboarding

**Fecha**: 2 de diciembre de 2025  
**Tipo**: Refactorización mayor  
**Estado**: ✅ Completado

## Resumen

Implementación completa del nuevo sistema de onboarding con componentes reutilizables, navegación por pasos y soporte para documentos y firmas asignables por equipo.

## Cambios Implementados

### Fase 1: Componentes Base Reutilizables

#### 1.1 DialogWithSidebar
**Archivo**: `components/shared/dialog-with-sidebar.tsx`

- Nuevo componente Dialog amplio con sidebar lateral
- Navegación entre secciones mediante sidebar
- Responsive: en móvil el sidebar es colapsable con botón hamburguesa
- Props configurables: `open`, `onOpenChange`, `title`, `sidebar`, `activeSidebarItem`, `width`
- Soporta anchos: xl, 2xl, 3xl, 4xl, 5xl

#### 1.2 WizardSteps
**Archivo**: `components/shared/wizard-steps.tsx`

- Componente para flujos multi-paso con navegación secuencial
- Indicador visual de progreso (stepper horizontal con números)
- Botones "Anterior" / "Siguiente" con validación
- Props: `steps`, `currentStep`, `canGoNext`, `canGoPrevious`
- Permite navegación directa a pasos anteriores

### Fase 2: Gestionar Onboarding - Rediseño

#### 2.1 Modelo de Datos Actualizado
**Archivo**: `lib/onboarding-config.ts`

Extendida interfaz `DocumentoRequerido`:
```typescript
interface DocumentoRequerido {
  // ... campos existentes
  esAsincronico?: boolean;        // Para firmas asíncronas
  asignadoA?: 'todos' | 'equipos'; // Alcance del documento
  equipoIds?: string[];            // IDs de equipos
}
```

Nuevas funciones helper:
- `filtrarDocumentosPorEquipo()` - Filtra documentos por equipos del empleado
- `obtenerDocumentosAsincronicos()` - Obtiene solo documentos de firma asíncrona

#### 2.2 Modal Gestionar Onboarding Refactorizado
**Archivo**: `components/hr/gestionar-onboarding-modal.tsx`

**Cambio de tabs a sidebar con 3 secciones**:

1. **Campos**: Campos requeridos organizados en 4 categorías colapsables (Accordion)
   - Datos Personales (DNI/NIE, NSS, Estado Civil, Nº Hijos)
   - Contacto (Teléfono)
   - Dirección (Calle, Número, Piso, CP, Ciudad, Provincia)
   - Datos Bancarios (IBAN, BIC)
   - Layout: Grid de 2 columnas para mejor aprovechamiento del espacio

2. **Documentos**: Documentos para visualización/descarga
   - Lista de documentos configurados (múltiples)
   - Cada documento tiene:
     - Nombre + descripción
     - Checkbox "Requerido"
     - Select "Asignado a": Todos / Equipos específicos
     - MultiSelect de equipos (si aplica)
     - Select "Carpeta destino" (Contratos/Nóminas/Justificantes/Otros/Personalizada)
   - Botón "Añadir Documento"
   - Botones eliminar individuales

3. **Firmas**: Documentos para firma digital
   - Similar a Documentos pero con:
     - Switch "Firma asíncrona" con tooltip explicativo
     - Badge visual cuando es asíncrona
   - Lógica especial para firmas asíncronas:
     - Se suben después del onboarding
     - Empleado completa datos primero
     - HR recibe notificación para subir documento
     - Se envía notificación al empleado para firmar

**Mejoras UX**:
- Título simplificado: "Gestionar Onboarding" (eliminado "Offboarding")
- Guardado independiente por sección
- Loading states y feedback visual
- Estados vacíos con iconos y mensajes descriptivos

### Fase 3: Nueva Persona - Pre-dialog y Wizard

#### 3.1 Pre-Dialog de Selección
**Archivo**: `components/organizacion/nueva-persona-pre-dialog.tsx`

Dialog inicial con 2 opciones grandes (cards):
1. **Empleado Nuevo**: Crear desde cero e iniciar onboarding
2. **Empleado Existente**: Activar onboarding para empleado ya registrado

Diseño visual con iconos grandes y descripciones claras.

#### 3.2 Formulario Onboarding Refactorizado
**Archivo**: `components/organizacion/add-persona-onboarding-form.tsx`

Completamente reescrito con wizard multi-paso:

**Paso 1: Datos Básicos**
- Si empleado existente: SearchableSelect para elegir empleado
- Si empleado nuevo:
  - Nombre, Apellidos, Email (requeridos)
  - Fecha de Alta
  - Puesto (Combobox con crear nuevo)
  - Equipo (SearchableSelect, opcional, UN SOLO equipo)
  - Sede (SearchableSelect, opcional, independiente del equipo)

**Paso 2: Documentos**
- Accordion con 2 secciones:
  - Documentos configurados: Lista de docs de la configuración, filtrados por equipo
  - Documentos adicionales: Upload manual + selector de carpeta

**Paso 3: Firmas**
- Lista de documentos de firma configurados
- Filtrados por equipo del empleado
- Badges visuales:
  - "Requerido"
  - "Se subirá después del onboarding" (si es asíncrono)
- Info box final con explicación del envío de email
- Botón "Crear y Enviar Onboarding"

**Validaciones**:
- Paso 1: Email único, campos requeridos
- Navegación bloqueada si falta información
- Botón "Siguiente" deshabilitado cuando no se puede avanzar

#### 3.3 Integración con Add-Persona-Dialog
**Archivo**: `components/organizacion/add-persona-dialog.tsx`

Refactorizado para usar el flujo nuevo:
1. Se abre pre-dialog
2. Usuario selecciona tipo
3. Se cierra pre-dialog, se abre wizard
4. Al cerrar wizard, vuelve a pre-dialog (permitiendo crear otro empleado sin cerrar todo)

### Fase 4: API y Validación

#### 4.1 API Onboarding Config Actualizada
**Archivo**: `app/api/hr/onboarding-config/route.ts`

Schema de validación extendido:
```typescript
const documentoRequeridoSchema = z.object({
  // ... campos existentes
  esAsincronico: z.boolean().optional(),
  asignadoA: z.enum(['todos', 'equipos']).optional(),
  equipoIds: z.array(z.string()).optional(),
});
```

## Componentes UI Nuevos

### Componentes de Radix UI Agregados

1. **Accordion** (`components/ui/accordion.tsx`)
   - Para secciones colapsables
   - Usado en categorización de campos y documentos

2. **Switch** (`components/ui/switch.tsx`)
   - Toggle para firma asíncrona
   - Mejor UX que checkbox para on/off

3. **Tooltip** (`components/ui/tooltip.tsx`)
   - Tooltips explicativos
   - Usado en firma asíncrona

**Dependencias instaladas**:
```bash
npm install @radix-ui/react-accordion @radix-ui/react-switch
```

## Mejoras de UX/UI

### Diseño
- Modales más anchos (4xl, 5xl) para mejor aprovechamiento del espacio
- Grid de 2 columnas en formularios
- Secciones colapsables para organizar información
- Estados vacíos con iconos y mensajes

### Navegación
- Stepper horizontal con indicadores visuales de progreso
- Navegación bidireccional (Anterior/Siguiente)
- Validación antes de avanzar
- Pre-dialog para evitar confusión inicial

### Feedback
- Loading states en botones
- Toasts de éxito/error (Sonner)
- Badges visuales de estado
- Tooltips explicativos

## Lógica de Negocio

### Asignación por Equipos
- Documentos y firmas se pueden asignar a:
  - Todos los empleados
  - Equipos específicos (multi-select)
- Al crear empleado, documentos se filtran automáticamente por su equipo
- Empleado puede pertenecer a UN SOLO equipo (relación directa)

### Firmas Asíncronas
Flujo especial:
1. HR configura documento de firma como asíncrono
2. Empleado completa onboarding (campos + documentos)
3. HR recibe notificación de onboarding completado
4. HR sube el documento para firma (ahora que tiene los datos)
5. Se envía notificación + email al empleado para firmar

### Validaciones
- Email único al crear empleado
- Campos requeridos según configuración
- No se puede avanzar paso sin completar información necesaria
- TypeScript estricto sin `any`

## Archivos Modificados

### Nuevos
- `components/shared/dialog-with-sidebar.tsx`
- `components/shared/wizard-steps.tsx`
- `components/organizacion/nueva-persona-pre-dialog.tsx`
- `components/ui/accordion.tsx`
- `components/ui/switch.tsx`
- `components/ui/tooltip.tsx`

### Modificados
- `components/hr/gestionar-onboarding-modal.tsx` (reescrito completo)
- `components/organizacion/add-persona-onboarding-form.tsx` (reescrito completo)
- `components/organizacion/add-persona-dialog.tsx` (refactorizado)
- `lib/onboarding-config.ts` (extendido)
- `app/api/hr/onboarding-config/route.ts` (schema actualizado)

### Correcciones menores
- `components/layout/page-mobile-header.tsx` (eliminado prop strokeWidth no soportado)

## Testing y Calidad

### Verificaciones Realizadas
✅ TypeScript: Sin errores de tipos  
✅ ESLint: Sin warnings ni errors  
✅ Imports: Organizados y sin no utilizados  
✅ Dependencias: Instaladas correctamente  

### Comandos de Verificación
```bash
npx tsc --noEmit                    # ✅ Sin errores
npx eslint [archivos] --fix         # ✅ Sin warnings
```

## Consideraciones Técnicas

1. **Validación de equipos**: Se verifica que empleado y documentos pertenezcan a la misma empresa
2. **Permisos**: Solo HR Admin puede configurar onboarding
3. **Estados de firma**: Preparado para nuevos estados ("pendiente_documento", "documento_subido")
4. **Carpetas**: Usa lógica existente de campo `asignadoA` en tabla `carpetas`
5. **Mobile**: Dialog con sidebar adapta a layout móvil con sidebar colapsable
6. **TypeScript**: Tipado estricto sin `any`

## Próximos Pasos (No Implementados en Este Refactor)

1. Actualizar flujo del empleado para:
   - Mostrar solo documentos asignados a su equipo
   - Omitir paso de firma si es asíncrona
   - Notificar HR al completar onboarding con firmas pendientes

2. Implementar notificaciones:
   - Email + in-app a HR cuando onboarding completo con firmas asíncronas
   - Función en `lib/notificaciones.ts`

3. Actualizar endpoint de empleados:
   - Asignar a equipo al crear empleado
   - Endpoint: `/api/equipos/[id]/members` (ya existe)

4. Testing E2E:
   - Crear empleado nuevo con equipo
   - Configurar documentos por equipo
   - Firma asíncrona flow completo
   - Empleado existente flow

## Conclusión

Refactorización completa del sistema de onboarding implementada exitosamente. El nuevo sistema es:
- ✅ Más escalable (componentes reutilizables)
- ✅ Más intuitivo (wizard multi-paso con indicadores)
- ✅ Más flexible (asignación por equipos, firmas asíncronas)
- ✅ Mejor UX (navegación clara, feedback visual, estados vacíos)
- ✅ Mantenible (código limpio, tipado estricto, sin warnings)

**Total de archivos nuevos**: 6  
**Total de archivos modificados**: 6  
**Dependencias añadidas**: 2  
**Errores de código**: 0  
**Warnings de linting**: 0







