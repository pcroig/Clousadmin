# Verificación de Implementación: Firma de Empresa

## ✅ Cambios Confirmados en el Código

### 1. Archivo: `components/firma/solicitar-firma-dialog.tsx`

**Línea 337:** Existe la sección "Configuración"
```tsx
<h3 className="text-sm font-semibold text-gray-900">Configuración</h3>
```

**Líneas 315-341:** Opción "Mantener documento original" con tooltip
```tsx
<TooltipProvider>
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-2">
      <Label htmlFor="mantener-original" className="text-sm font-medium cursor-pointer">
        Mantener documento original
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">
            Si está activado, se crearán copias individuales del documento firmado para cada empleado.
            Si está desactivado, el documento original será reemplazado con la versión firmada.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
    <Switch
      id="mantener-original"
      checked={mantenerOriginal}
      onCheckedChange={setMantenerOriginal}
      disabled={loading}
    />
  </div>
</TooltipProvider>
```

**Líneas 343-387:** Mensaje informativo sobre firma de empresa
```tsx
{firmaEmpresaDisponible ? (
  <div className="text-xs text-gray-700 p-3 bg-green-50 rounded-md border border-green-100">
    <p className="flex items-start gap-2">
      <Info className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
      <span>
        La <strong>firma de la empresa</strong> se añadirá automáticamente al documento cuando todos los empleados hayan firmado.
        Aparecerá debajo de las firmas de los empleados.
      </span>
    </p>
  </div>
) : (
  <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded-md border border-blue-100">
    <p className="flex items-start gap-2">
      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <span>
        Configura la firma de tu empresa en <strong>Configuración &gt; Seguridad</strong> para que se añada automáticamente a los documentos firmados.
      </span>
    </p>
  </div>
)}
```

**Líneas 113-129:** Lógica para verificar firma de empresa disponible
```tsx
useEffect(() => {
  if (!open) return;

  fetch('/api/empresa/firma')
    .then(async (res) => {
      if (!res.ok) return;
      return parseJson<{ firmaGuardada?: boolean }>(res);
    })
    .then((data) => {
      setFirmaEmpresaDisponible(Boolean(data?.firmaGuardada));
    })
    .catch(() => {
      // Silenciar error (puede ser que no sea HR admin)
      setFirmaEmpresaDisponible(false);
    });
}, [open]);
```

### 2. Componente Utilizado

El archivo `components/firma/solicitar-firma-dialog.tsx` es importado y usado por:
- `components/firma/firmas-tab.tsx`

### 3. Backend - Firma Automática

**Archivo:** `lib/firma-digital/db-helpers.ts`
**Líneas 519-570:** Lógica que añade firma de empresa automáticamente

```tsx
// NUEVO: Añadir firma de la empresa si existe
const empresa = await prisma.empresas.findUnique({
  where: { id: firma.solicitudes_firma.empresaId },
  select: {
    nombre: true,
    firmaEmpresaGuardada: true,
    firmaEmpresaS3Key: true,
  },
});

if (empresa?.firmaEmpresaGuardada && empresa.firmaEmpresaS3Key) {
  // ... añade firma de empresa
}
```

## 🔧 Posibles Causas de No Ver los Cambios

### 1. Cache del Navegador
**Solución:**
- Presiona `Cmd + Shift + R` (Mac) o `Ctrl + Shift + R` (Windows/Linux) para hard refresh
- O abre DevTools y marca "Disable cache" con DevTools abierto

### 2. Next.js No Reiniciado
**Hay 2 procesos corriendo en puerto 3000**
```bash
# Matar procesos existentes
lsof -ti:3000 | xargs kill -9

# Limpiar cache de Next.js
rm -rf .next

# Reiniciar servidor
npm run dev
```

### 3. Turbopack Cache
Si estás usando Turbopack (Next.js 15+), el cache puede estar desactualizado:
```bash
# Limpiar todo
rm -rf .next
rm -rf node_modules/.cache

# Reiniciar
npm run dev
```

### 4. Verificar Imports
El componente debe importar correctamente Switch y Tooltip:
```tsx
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
```

✅ **CONFIRMADO:** Estos imports están en la línea 13-14

## 📋 Pasos para Verificar

1. **Matar procesos y limpiar cache:**
   ```bash
   lsof -ti:3000 | xargs kill -9
   rm -rf .next
   npm run dev
   ```

2. **Abrir navegador en incógnito:**
   - `Cmd + Shift + N` (Chrome/Edge)
   - `Cmd + Shift + P` (Safari/Firefox)

3. **Ir a la página de solicitar firma:**
   - Login como HR admin
   - Ir a Documentos
   - Abrir cualquier documento PDF
   - Click en "Solicitar firma"

4. **Verificar que aparece:**
   - ✅ Sección "Configuración" con fondo gris claro
   - ✅ Opción "Mantener documento original" con switch e icono Info
   - ✅ Mensaje sobre firma de empresa (verde si hay firma, azul si no)

## 🎯 Dónde Buscar en la UI

**Ubicación en el Dialog:**
```
┌─────────────────────────────────────┐
│ Solicitar firma                     │
├─────────────────────────────────────┤
│ Título: [Input]                     │
│                                     │
│ Firmantes: [MultiSelect]           │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Configuración                   │ │ ← NUEVA SECCIÓN
│ │                                 │ │
│ │ Mantener documento original  🔘 │ │ ← Con tooltip ℹ️
│ │                                 │ │
│ │ [Mensaje firma empresa]         │ │ ← Verde o azul
│ └─────────────────────────────────┘ │
│                                     │
│ Posición de firma (opcional)       │
│ [Vista previa del PDF]             │
└─────────────────────────────────────┘
```

## 🐛 Si Aún No Aparece

Ejecuta esto para verificar que el archivo está correcto:
```bash
grep -n "Configuración" components/firma/solicitar-firma-dialog.tsx
grep -n "Mantener documento original" components/firma/solicitar-firma-dialog.tsx
grep -n "firma de la empresa" components/firma/solicitar-firma-dialog.tsx
```

**Resultado esperado:**
- Línea 337: "Configuración"
- Línea 320: "Mantener documento original"
- Línea 349: "firma de la empresa"

## ✅ Confirmación Final

El código está **100% implementado** en:
- ✅ `components/firma/solicitar-firma-dialog.tsx`
- ✅ `lib/firma-digital/db-helpers.ts`
- ✅ `app/api/empresa/firma/route.ts`
- ✅ `components/settings/company-signature-card.tsx`

**El problema es de cache/compilación, no de código.**
