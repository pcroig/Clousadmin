# Fix: Rutas de redirección post-firma (2025-12-08)

## Problema

Se identificaron tres problemas críticos en las rutas de redirección después de firmar o ver solicitudes de firma:

### 1. Platform admin sin destino válido
- **Síntoma**: `platform_admin` era redirigido a `/hr/mi-espacio` después de firmar o ver solicitudes
- **Problema**: `/hr/mi-espacio` solo acepta rol `hr_admin`, causando un bucle de redirección a login
- **Causa raíz**: Lógica incorrecta que asumía que `platform_admin` debía usar el mismo destino que `hr_admin`

### 2. Botón "Volver" en estado de error usa router.back()
- **Síntoma**: Si el usuario llega desde un enlace sin histórico, o la firma no existe (404), el botón no funciona correctamente
- **Problema**: `router.back()` no tiene efecto cuando no hay historial, dejando al usuario atrapado
- **Causa raíz**: Uso de `router.back()` en lugar de una ruta calculada explícita

### 3. Lógica duplicada en múltiples componentes
- **Síntoma**: La función `obtenerRutaPostFirma` estaba duplicada en 2 archivos
- **Problema**: Código difícil de mantener, riesgo de divergencias, y el bug de `platform_admin` existía en todas las copias
- **Causa raíz**: Falta de helper centralizado

## Solución

### 1. Helper centralizado: `getPostFirmaRedirect()`

Creado nuevo helper en [`lib/firma-digital/get-post-firma-redirect.ts`](../../lib/firma-digital/get-post-firma-redirect.ts):

```typescript
export function getPostFirmaRedirect(): string
```

**Rutas por rol:**
- `platform_admin` → `/platform/invitaciones` (panel de administración de la plataforma)
- `hr_admin` → `/hr/mi-espacio` (mi espacio de HR)
- `manager` → `/manager/mi-espacio` (mi espacio de manager)
- `empleado` → `/empleado/mi-espacio` (mi espacio de empleado)
- fallback → `/empleado/mi-espacio` (por defecto)

**Características:**
- Lee el rol desde la cookie de sesión
- Manejo robusto de errores (fallback a empleado)
- SSR-safe (verifica `typeof document !== 'undefined'`)
- Documentación completa con notas sobre cada rol

### 2. Archivos actualizados

Se eliminó la lógica duplicada y se reemplazó por el helper en:

1. **[app/firma/solicitud/[solicitudId]/ver-solicitud-client.tsx](../../app/firma/solicitud/[solicitudId]/ver-solicitud-client.tsx)**
   - Eliminada función `obtenerRutaPostFirma()` duplicada
   - Reemplazado por `getPostFirmaRedirect()` en 2 lugares:
     - Botón "Volver" en estado de error (línea 131)
     - Botón "Volver" en header (línea 149)

2. **[app/firma/firmar/[firmaId]/firmar-documento-client.tsx](../../app/firma/firmar/[firmaId]/firmar-documento-client.tsx)**
   - Eliminadas funciones `obtenerRolDesdeCookie()` y `obtenerRutaPostFirma()`
   - Reemplazado por `getPostFirmaRedirect()` en 2 lugares:
     - Botón "Volver" en estado de error (línea 256)
     - Botón "Volver"/"Ir a Mi Espacio" en header (línea 271)

3. **[app/firma/solicitar/[documentoId]/solicitar-firma-client.tsx](../../app/firma/solicitar/[documentoId]/solicitar-firma-client.tsx)**
   - Reemplazados 3 usos de `router.back()` por `router.push(getPostFirmaRedirect())`:
     - Éxito total (línea 250)
     - Éxito parcial (línea 256)
     - Botón "Volver" en header (línea 277)

### 3. Verificación de rutas

Confirmado que:
- `/hr/mi-espacio` correctamente solo acepta `hr_admin` (línea 14 de page.tsx)
- `platform_admin` NO debe acceder a funcionalidades de HR
- `/platform/invitaciones` es el destino correcto para `platform_admin`

## Impacto

### ✅ Beneficios
1. **Eliminado bucle de redirección**: `platform_admin` ahora va a su panel correcto
2. **Mejor UX en errores**: Botón "Volver" siempre funciona, incluso sin historial
3. **Código más mantenible**: Una única fuente de verdad para la lógica de redirección
4. **Más robusto**: Manejo de errores consistente en todos los flujos
5. **Mejor testeable**: Helper aislado y fácil de testear

### 🔧 Deuda técnica resuelta
- Eliminada duplicación de código
- Documentación inline para cada rol
- Arquitectura más clara y escalable

## Testing

### Casos de prueba manuales

1. **Platform admin firmando documento**
   - Login como `platform_admin`
   - Ir a solicitud de firma
   - Firmar documento
   - ✅ Verificar redirección a `/platform/invitaciones`

2. **HR admin firmando documento**
   - Login como `hr_admin`
   - Ir a solicitud de firma
   - Firmar documento
   - ✅ Verificar redirección a `/hr/mi-espacio`

3. **Manager firmando documento**
   - Login como `manager`
   - Ir a solicitud de firma
   - Firmar documento
   - ✅ Verificar redirección a `/manager/mi-espacio`

4. **Empleado firmando documento**
   - Login como `empleado`
   - Ir a solicitud de firma
   - Firmar documento
   - ✅ Verificar redirección a `/empleado/mi-espacio`

5. **Error 404 en firma**
   - Acceder a URL de firma inválida (ej: `/firma/firmar/xyz-invalid`)
   - ✅ Verificar que botón "Volver" lleva al dashboard correcto según rol

6. **Solicitar firma y volver**
   - Como HR admin, ir a solicitar firma
   - Pulsar "Volver" sin completar
   - ✅ Verificar redirección a dashboard correcto

## Notas adicionales

- **Platform admin**: Este rol es exclusivamente para gestión de cuentas e invitaciones, NO tiene acceso a funcionalidades de HR
- **Backward compatibility**: Los cambios son totalmente compatibles, solo afectan rutas internas
- **No breaking changes**: No se modificaron APIs ni estructuras de datos

## Referencias

- Issue reportado: Errores de redirección en sistema de firma
- Archivos modificados: 4 archivos
- Líneas de código eliminadas: ~50 (lógica duplicada)
- Líneas de código añadidas: ~60 (helper + documentación)
