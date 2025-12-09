# Fix: Vision API debe usar base64 para imágenes (no URLs de S3 privadas)

**Fecha:** 2025-12-08
**Tipo:** Bug Fix
**Componente:** Vision API, Extracción de documentos
**Archivos modificados:**
- `app/api/documentos/extraer/route.ts`

## Problema

Al subir imágenes (JPG, PNG) individuales para extracción de datos con IA, el sistema estaba fallando con el siguiente error:

```
Error después de 3 intentos: Todos los proveedores de IA fallaron.
Errores: openai: OpenAI error: 400 Error while downloading
https://fsn1.your-objectstorage.com/clousadmin/documentos/temp/1765220844531-1_UP.png.
```

## Causa Raíz

El código estaba subiendo las imágenes a **Hetzner Object Storage (S3)** con **ACL privado** por defecto, y luego pasaba la URL privada directamente a **OpenAI Vision API**:

```typescript
// ANTES (INCORRECTO)
} else if (isS3Configured) {
  // Producción: Subir a S3 y usar URL pública (solo para imágenes)
  const s3Url = await uploadToS3(buffer, s3Key, file.type);
  console.log(`[API Extraer] Archivo subido a S3: ${s3Url}`);
  documentInput = s3Url; // ❌ URL privada no accesible por OpenAI
}
```

**El problema:**
- El archivo se subía con `ACL: 'private'` (configuración por defecto en `lib/s3.ts:213`)
- La URL generada era `https://fsn1.your-objectstorage.com/clousadmin/...`
- OpenAI intentaba descargar la imagen desde esa URL
- Hetzner devolvía **403 Forbidden** porque el objeto es privado
- OpenAI fallaba con error 400

## Solución

**Usar base64 para TODAS las imágenes** en lugar de URLs de S3:

```typescript
// DESPUÉS (CORRECTO)
} else {
  // Para IMÁGENES: SIEMPRE usar base64 (no URLs de S3)
  // OpenAI Vision API requiere URLs públicas o base64
  // S3 privado no es accesible, así que usamos base64
  const base64 = buffer.toString('base64');
  documentInput = `data:${file.type};base64,${base64}`;
  console.log(`[API Extraer] Imagen detectada, usando base64 (tamaño: ${(base64.length / 1024).toFixed(2)} KB)`);
}
```

**Por qué esta solución es mejor:**

1. **Seguridad:** No exponemos archivos en S3 como públicos
2. **Consistencia:** Mismo comportamiento en desarrollo y producción
3. **Simplicidad:** No necesitamos gestionar permisos ni URLs firmadas
4. **Compatibilidad:** Base64 funciona con OpenAI, Anthropic y todos los proveedores
5. **Límites aceptables:** Máximo 5MB por imagen (configurado en validación), base64 crece ~33% pero sigue siendo aceptable

## Comportamiento Final

### Para Imágenes (JPG, PNG)
- **Siempre:** Convertir a base64 y enviar directamente
- **No se sube a S3:** No es necesario, base64 es suficiente
- **Formato:** `data:image/jpeg;base64,/9j/4AAQ...`

### Para PDFs
- **Con OpenAI API Key:** Subir a OpenAI Files API (file_id)
- **Sin OpenAI:** Usar base64 (Anthropic lo soporta)
- **Fallback:** Si falla upload, usar base64

## Archivos Modificados

### `app/api/documentos/extraer/route.ts`

**Cambios:**
1. Eliminada lógica de subida a S3 para imágenes
2. Simplificada detección: solo verificar si es PDF o no
3. Para imágenes: siempre base64
4. Eliminado import de `uploadToS3` (no se usa)
5. Eliminado campo `s3Url` de la respuesta JSON

**Código anterior:**
```typescript
const isS3Configured = !!(
  process.env.STORAGE_ENDPOINT &&
  process.env.STORAGE_REGION &&
  // ...
);

if (isPDF) {
  // ... lógica PDF
} else if (isS3Configured) {
  // ❌ Subir a S3 con URL privada
  const s3Url = await uploadToS3(buffer, s3Key, file.type);
  documentInput = s3Url;
} else {
  // Solo desarrollo
  const base64 = buffer.toString('base64');
  documentInput = `data:${file.type};base64,${base64}`;
}
```

**Código nuevo:**
```typescript
if (isPDF) {
  // ... lógica PDF con Files API o base64
} else {
  // ✅ SIEMPRE base64 para imágenes
  const base64 = buffer.toString('base64');
  documentInput = `data:${file.type};base64,${base64}`;
  console.log(`[API Extraer] Imagen detectada, usando base64 (tamaño: ${(base64.length / 1024).toFixed(2)} KB)`);
}
```

## Alternativas Consideradas

### ❌ Opción 2: Subir con ACL público
```typescript
await uploadToS3(buffer, s3Key, file.type, { acl: 'public-read' });
```
**Rechazada porque:**
- Expone archivos sensibles (DNIs, contratos) públicamente
- Requiere limpiar archivos temporales después
- Riesgo de seguridad si falla la limpieza

### ❌ Opción 3: Usar URLs firmadas (pre-signed URLs)
```typescript
const signedUrl = await getSignedDownloadUrl(s3Key, { expiresIn: 3600 });
```
**Rechazada porque:**
- Más complejidad sin beneficio real
- URLs firmadas pueden expirar durante procesamiento largo
- Base64 es más simple y directo

## Testing

**Casos probados:**
1. ✅ Subir imagen JPG < 5MB → Extrae datos correctamente
2. ✅ Subir imagen PNG < 5MB → Extrae datos correctamente
3. ✅ Subir PDF < 5MB → Usa Files API o base64 según disponibilidad
4. ✅ Sin S3 configurado → Funciona igual (base64)
5. ✅ Con S3 configurado → No intenta subir imágenes a S3

## Impacto

**Positivo:**
- ✅ Fix del bug crítico de extracción de imágenes
- ✅ Mejora de seguridad (no exponer archivos públicos)
- ✅ Código más simple y mantenible
- ✅ Consistencia entre dev y producción

**Neutral:**
- ⚖️ Tráfico de red: base64 es ~33% más grande que binario
  - Ejemplo: Imagen 2MB → base64 ~2.66MB
  - Aceptable para archivos < 5MB

**Sin impacto negativo:** Esta solución solo tiene ventajas

## Lecciones Aprendidas

1. **OpenAI Vision API requiere URLs públicas o base64**
   - No funciona con URLs privadas de S3
   - Base64 es la opción más segura

2. **S3 privado por defecto es bueno para seguridad**
   - Pero no es compatible con APIs externas que esperan URLs públicas

3. **Base64 es aceptable para archivos < 5MB**
   - La sobrecarga de ~33% es mínima
   - Simplifica arquitectura y mejora seguridad

4. **PDFs grandes pueden beneficiarse de Files API**
   - OpenAI Files API acepta hasta 512MB
   - Más eficiente que base64 para archivos grandes
