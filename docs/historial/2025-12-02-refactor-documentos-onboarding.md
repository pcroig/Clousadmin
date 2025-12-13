# Refactor: Sistema de Documentos en Onboarding

**Fecha**: 2 de diciembre de 2025  
**Estado**: ✅ Completado

## Resumen

Se ha rediseñado completamente el sistema de documentos en el onboarding para diferenciar claramente entre:
1. **Ver/Descargar**: Documentos existentes que HR comparte con el empleado
2. **Solicitar Documentos**: Documentos que el empleado debe subir (solo título + carpeta)
3. **Firmas**: Documentos que requieren firma digital

## Cambios Principales

### 1. Tipos e Interfaces

**Archivo**: `lib/onboarding-config-types.ts`

Añadidos nuevos campos a `DocumentoRequerido`:
```typescript
interface DocumentoRequerido {
  // ... campos existentes
  tipo?: 'visualizar' | 'solicitar' | 'firma'; // Nuevo: tipo de documento
  documentoId?: string; // Nuevo: ID del documento existente (solo para tipo 'visualizar')
}
```

### 2. Nuevo Componente: DocumentoSelector

**Archivo**: `components/shared/documento-selector.tsx`

Componente reutilizable para seleccionar documentos existentes de carpetas:
- Carga carpetas globales
- Muestra documentos de la carpeta seleccionada
- Permite selección múltiple con checkboxes
- Muestra resumen de documentos seleccionados

**Uso**:
```typescript
<DocumentoSelector
  label="Documentos disponibles"
  description="Selecciona documentos de las carpetas globales"
  selectedDocuments={documentosVisualizar}
  onDocumentsChange={setDocumentosVisualizar}
/>
```

### 3. Gestionar Onboarding Modal

**Archivo**: `components/hr/gestionar-onboarding-modal.tsx`

**Cambios en el estado**:
```typescript
// ANTES
const [documentosRequeridos, setDocumentosRequeridos] = useState<DocumentoRequerido[]>([]);

// DESPUÉS
const [documentosVisualizar, setDocumentosVisualizar] = useState<string[]>([]); // IDs de documentos
const [documentosSolicitar, setDocumentosSolicitar] = useState<DocumentoRequerido[]>([]);
const [firmasRequeridas, setFirmasRequeridas] = useState<DocumentoRequerido[]>([]);
```

**Cambios en el sidebar**:
```typescript
const sidebar = [
  { id: 'campos', label: 'Campos', icon: Settings },
  { id: 'docs-visualizar', label: 'Ver/Descargar', icon: FileText },
  { id: 'docs-solicitar', label: 'Solicitar Documentos', icon: FileText }, // ← Renombrado
  { id: 'firmas', label: 'Firmas', icon: FileSignature },
];
```

**Sección "Ver/Descargar"**:
- Usa `DocumentoSelector` para elegir documentos existentes
- Solo guarda los IDs de los documentos seleccionados
- Los documentos se cargan dinámicamente desde carpetas globales

**Sección "Solicitar Documentos"**:
- Nuevo componente `DocumentoSolicitarCard` simplificado
- Solo pide: **Título** + **Carpeta destino** (+ asignación por equipos opcional)
- Fondo ámbar para distinguir visualmente
- El empleado verá estos documentos como campos de upload

### 4. Nueva Persona - Wizard

**Archivo**: `components/organizacion/add-persona-onboarding-form.tsx`

**Cambios en pasos**:
```typescript
const steps = [
  { id: 'basicos', label: 'Datos Básicos' },
  { id: 'docs-visualizar', label: 'Ver/Descargar' },
  { id: 'docs-solicitar', label: 'Solicitar Documentos' }, // ← Renombrado
  { id: 'firmas', label: 'Firmas' },
];
```

**Paso "Ver/Descargar"**:
- Muestra documentos configurados en "Gestionar Onboarding" con fondo azul
- Permite subir documentos adicionales (como antes)

**Paso "Solicitar Documentos"**:
- Muestra lista de documentos configurados que el empleado deberá subir
- Indica título y carpeta destino de cada documento
- Fondo ámbar para distinguir

### 5. API Route

**Archivo**: `app/api/hr/onboarding-config/route.ts`

Actualizado schema de validación para soportar nuevos campos:
```typescript
const documentoRequeridoSchema = z.object({
  // ... campos existentes
  tipo: z.enum(['visualizar', 'solicitar', 'firma']).optional(),
  documentoId: z.string().optional(),
});
```

### 6. Flujo del Empleado

**Archivo**: `app/(auth)/onboarding/[token]/onboarding-form.tsx`

**Paso "Documentos"** ahora diferencia:

1. **Documentos para descargar** (`tipo === 'visualizar'`):
   - Fondo azul
   - Botón "Descargar"
   - No requiere upload del empleado

2. **Documentos a subir** (`tipo === 'solicitar'`):
   - Fondo ámbar
   - Campo de upload
   - Muestra si es obligatorio
   - Indica carpeta destino

3. **Otros documentos subidos**:
   - Documentos adicionales que el empleado suba voluntariamente

## Flujo Completo

### HR Admin - Configurar Onboarding

1. **Ver/Descargar**:
   - Abre "Gestionar Onboarding" → "Ver/Descargar"
   - Selecciona carpeta global
   - Marca documentos que el empleado puede descargar
   - Guarda

2. **Solicitar Documentos**:
   - Abre "Gestionar Onboarding" → "Solicitar Documentos"
   - Clic en "Añadir"
   - Completa:
     - Título del documento (ej: "Foto del DNI")
     - Carpeta destino (ej: "Contratos")
     - Asignado a: Todos o equipos específicos
     - Checkbox "Requerido"
   - Guarda

3. **Firmas**:
   - Igual que antes, con toggle asíncrono

### HR Admin - Nueva Persona

1. **Datos Básicos**: Completa nombre, email, puesto, equipo, sede
2. **Ver/Descargar**: Ve los documentos configurados + puede subir adicionales
3. **Solicitar Documentos**: Ve la lista de documentos que el empleado deberá subir
4. **Firmas**: Ve documentos de firma configurados
5. **Finalizar**: Envía invitación

### Empleado - Onboarding

1. **Credenciales**: Crea contraseña
2. **Datos Personales**: Completa campos requeridos
3. **Datos Bancarios**: Completa IBAN, BIC
4. **Documentos**:
   - **Sección 1**: Documentos para descargar (azul)
     - Botón "Descargar" para cada documento
   - **Sección 2**: Documentos a subir (ámbar)
     - Campo upload para cada documento
     - Muestra si es obligatorio
   - **Sección 3**: Otros documentos subidos
5. **PWA**: Explicación de la app móvil

## Archivos Modificados

### Nuevos
- `components/shared/documento-selector.tsx` - Selector de documentos existentes

### Modificados
- `lib/onboarding-config-types.ts` - Nuevos campos en interfaz
- `components/hr/gestionar-onboarding-modal.tsx` - Separación de tipos de documentos
- `components/organizacion/add-persona-onboarding-form.tsx` - Actualización de pasos
- `app/api/hr/onboarding-config/route.ts` - Schema de validación
- `app/(auth)/onboarding/[token]/onboarding-form.tsx` - Filtrado por tipo

## Mejoras de UX

1. **Colores diferenciados**:
   - 🔵 Azul: Documentos para descargar
   - 🟡 Ámbar: Documentos a subir
   - ⚪ Blanco: Firmas

2. **Títulos claros**:
   - "Ver/Descargar" en lugar de "Documentos para Visualizar"
   - "Solicitar Documentos" en lugar de "Documentos para Subir"

3. **Simplificación**:
   - "Solicitar Documentos" solo pide título + carpeta (antes tenía muchos campos)
   - "Ver/Descargar" usa selector visual en lugar de campos manuales

## Compatibilidad hacia atrás

Los documentos existentes sin campo `tipo` se migran automáticamente:
```typescript
tipo: doc.tipo || (
  doc.requiereFirma ? 'firma' : 
  doc.requiereVisualizacion ? 'visualizar' : 
  'solicitar'
)
```

## Testing Recomendado

1. **HR Admin**:
   - [ ] Configurar documentos en "Ver/Descargar" seleccionando de carpetas
   - [ ] Añadir documentos en "Solicitar Documentos" con título + carpeta
   - [ ] Verificar que se guardan correctamente
   - [ ] Crear nuevo empleado y ver que los pasos muestran correctamente

2. **Empleado**:
   - [ ] Completar onboarding
   - [ ] Descargar documentos de tipo "visualizar"
   - [ ] Subir documentos de tipo "solicitar"
   - [ ] Verificar que se guardan en las carpetas correctas

3. **APIs**:
   - [ ] GET `/api/hr/onboarding-config` devuelve tipos correctamente
   - [ ] PATCH `/api/hr/onboarding-config` valida nuevos campos
   - [ ] GET `/api/onboarding/[token]/config` filtra por equipo correctamente

## Próximos Pasos

1. **Descargas en onboarding empleado**: Implementar lógica para descargar documentos de tipo "visualizar"
2. **Validación mejorada**: Verificar que documentos requeridos están completos antes de finalizar
3. **Notificaciones**: Notificar a HR cuando empleado sube documentos solicitados

## Notas Técnicas

- Todos los cambios mantienen compatibilidad con el código existente
- No se requieren migraciones de base de datos (campo `tipo` es opcional)
- El campo `documentoId` solo se usa para tipo "visualizar"
- Los IDs de documentos seleccionados se convierten a objetos `DocumentoRequerido` al guardar











