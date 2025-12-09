# Mejora UI: Solicitar Firma con Configuración

**Fecha:** 9 de diciembre de 2025

## Resumen

Se ha mejorado la interfaz de solicitar firma añadiendo opciones de configuración con tooltips informativos y la opción de incluir automáticamente la firma de empresa.

## Cambios realizados

### 1. Nuevas opciones de configuración

Se añadió una nueva sección "Configuración" en el dialog de solicitar firma con dos opciones:

#### Opción 1: Mantener documento original
- **Switch/Toggle** para activar/desactivar
- **Tooltip informativo** (icono "i") que explica:
  - Si está activado: Se crearán copias individuales del documento firmado para cada empleado
  - Si está desactivado: El documento original será reemplazado con la versión firmada
- **Valor por defecto:** Activado (true)
- **Campo enviado al backend:** `mantenerOriginal`

#### Información 2: Firma de empresa
- **Mensaje informativo** (sin switch):
  - **Si HAY firma configurada:** Mensaje en verde indicando que la firma de empresa se añadirá automáticamente
  - **Si NO HAY firma:** Mensaje en azul sugiriendo configurarla en Configuración > Seguridad
- **Comportamiento:** La firma de empresa siempre se añade automáticamente cuando está configurada (no es opcional)

### 2. Verificación automática de firma de empresa

Se añadió lógica para verificar automáticamente si la empresa tiene firma configurada:
- Al abrir el dialog, se hace una llamada a `/api/empresa/firma`
- Si la llamada es exitosa y `firmaGuardada` es true, se muestra la opción de incluir firma
- Si falla (por permisos o porque no hay firma), se muestra el mensaje informativo

### 3. Mejoras UI/UX

- **Tooltips con icono Info:** Se usa el componente `Tooltip` de shadcn/ui con icono Info
- **Sección visualmente separada:** Las opciones están en un contenedor con fondo gris claro y borde
- **Labels clicables:** Los labels están asociados a los switches para mejor UX
- **Mensaje informativo:** Estilo azul claro para destacar la sugerencia de configurar firma

## Estructura del componente

```tsx
<div className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
  <h3>Configuración</h3>

  {/* Mantener original */}
  <TooltipProvider>
    <div className="flex justify-between">
      <div className="flex gap-2">
        <Label>Mantener documento original</Label>
        <Tooltip>
          <TooltipTrigger><Info /></TooltipTrigger>
          <TooltipContent>...</TooltipContent>
        </Tooltip>
      </div>
      <Switch />
    </div>
  </TooltipProvider>

  {/* Información firma empresa (condicional) */}
  {firmaEmpresaDisponible ? (
    <div className="bg-green-50">
      <Info /> La firma de empresa se añadirá automáticamente...
    </div>
  ) : (
    <div className="bg-blue-50">
      <Info /> Configura la firma...
    </div>
  )}
</div>
```

## Estados añadidos

```typescript
const [mantenerOriginal, setMantenerOriginal] = useState(true);
const [firmaEmpresaDisponible, setFirmaEmpresaDisponible] = useState(false);
```

## Cambios en el backend

El campo `mantenerOriginal` se añadió al body de la petición:

```typescript
const body = {
  documentoId,
  titulo,
  firmantes,
  ordenFirma,
  posicionesFirma,
  mantenerOriginal, // NUEVO
};
```

**Nota:** El backend ya soportaba este campo desde la implementación anterior.

## Flujo de uso

1. **HR admin abre dialog de solicitar firma**
2. **Ve sección de Configuración** con dos opciones
3. **Puede activar/desactivar "Mantener documento original"**
   - Por defecto: Activado (se crean copias individuales)
4. **Si hay firma de empresa configurada:**
   - Ve mensaje en verde informando que la firma se añadirá automáticamente
5. **Si NO hay firma de empresa:**
   - Ve mensaje informativo sugiriendo configurarla
   - No ve el switch de incluir firma

## Testing

Para probar:

1. **Sin firma de empresa:**
   - Abrir dialog de solicitar firma
   - Verificar que se muestra mensaje informativo
   - No debe aparecer switch de "Incluir firma de empresa"

2. **Con firma de empresa:**
   - Configurar firma en Configuración > Seguridad
   - Abrir dialog de solicitar firma
   - Verificar que aparece mensaje en verde informando que la firma se añadirá automáticamente
   - Verificar que tooltip funciona al hacer hover en icono Info de "Mantener documento original"

3. **Verificar comportamiento del switch:**
   - Cambiar estado de "Mantener documento original"
   - Enviar solicitud y verificar que se envía correctamente al backend
   - Verificar que tras firmar todos los empleados, la firma de empresa aparece en el PDF

## Archivos modificados

- [components/firma/solicitar-firma-dialog.tsx](../../components/firma/solicitar-firma-dialog.tsx)

## Notas importantes

- La firma de empresa se añade **automáticamente** siempre que esté configurada. No es opcional por documento.
- El mensaje informativo cambia de color según si hay o no firma configurada (verde vs azul).
- El switch de "Mantener documento original" permite elegir entre:
  - Crear copias individuales para cada empleado (recomendado)
  - Reemplazar el documento original con la versión firmada
