# 🔧 Troubleshooting Hetzner Object Storage

Este documento describe los problemas comunes con Hetzner Object Storage y sus soluciones.

## ✅ Mejoras Implementadas

### 1. Validación Mejorada de Configuración (`lib/s3.ts`)
- ✅ Validación del formato del endpoint (debe incluir `https://`)
- ✅ Normalización automática de endpoints (elimina trailing slashes)
- ✅ Trim de espacios en credenciales
- ✅ Mejor logging de errores con contexto

### 2. Script de Diagnóstico
- ✅ Nuevo script `scripts/test-hetzner-storage.ts` para verificar la configuración
- ✅ Prueba conexión, credenciales, bucket, upload, download y signed URLs

### 3. Documentación Mejorada
- ✅ Comentarios en `next.config.ts` sobre cómo actualizar dominios
- ✅ Mejor manejo de errores con mensajes descriptivos

---

## 🐛 Problemas Comunes y Soluciones

### Error: "Object Storage client no disponible"

**Causa**: Variables de entorno no configuradas o incorrectas

**Solución**:
```bash
# Verificar que todas las variables estén presentes
echo $STORAGE_ENDPOINT
echo $STORAGE_REGION
echo $STORAGE_ACCESS_KEY
echo $STORAGE_SECRET_KEY
echo $STORAGE_BUCKET
```

**Verificación**:
```bash
# Ejecutar script de diagnóstico
npx tsx scripts/test-hetzner-storage.ts
```

---

### Error: "SignatureDoesNotMatch" o "InvalidAccessKeyId"

**Causa**: Credenciales incorrectas o endpoint mal configurado

**Solución**:
1. Verifica que el Access Key y Secret Key sean correctos en Hetzner Cloud Console
2. Asegúrate que el endpoint tenga el formato: `https://REGION.your-objectstorage.com`
   - Ejemplo: `https://fsn1.your-objectstorage.com`
3. Verifica que la región coincida con tu bucket:
   - `fsn1` → Falkenstein (Alemania)
   - `nbg1` → Nuremberg (Alemania)
   - `hel1` → Helsinki (Finlandia)
4. Asegúrate de no tener espacios extra en las variables de entorno

**Verificación**:
```bash
# Verificar formato del endpoint
echo $STORAGE_ENDPOINT | grep -E '^https://[a-z0-9]+\.your-objectstorage\.com$'
```

---

### Error: "NoSuchBucket"

**Causa**: El bucket no existe o el nombre es incorrecto

**Solución**:
1. Verifica que el bucket exista en Hetzner Cloud Console
2. Verifica que el nombre en `STORAGE_BUCKET` sea exacto (case-sensitive)
3. Asegúrate de estar apuntando a la región correcta

**Verificación**:
```bash
# Listar buckets accesibles
npx tsx scripts/test-hetzner-storage.ts
```

---

### Error: "NetworkingError" o timeout

**Causa**: Problemas de conectividad o endpoint incorrecto

**Solución**:
1. Verifica que el endpoint sea accesible:
   ```bash
   curl -I $STORAGE_ENDPOINT
   ```
2. Verifica que no haya firewall bloqueando la conexión
3. Asegúrate de que el endpoint no tenga trailing slash:
   ```bash
   # ❌ Incorrecto
   STORAGE_ENDPOINT="https://fsn1.your-objectstorage.com/"
   
   # ✅ Correcto
   STORAGE_ENDPOINT="https://fsn1.your-objectstorage.com"
   ```

---

### Error: URLs de archivos no funcionan en Next.js Image

**Causa**: El dominio no está configurado en `next.config.ts`

**Solución**:
1. Actualiza `next.config.ts` con el dominio real de tu Hetzner Object Storage:
   ```typescript
   images: {
     remotePatterns: [
       {
         protocol: 'https',
         hostname: 'fsn1.your-objectstorage.com', // Reemplaza con tu dominio real
       },
     ],
   },
   ```
2. Si usas un dominio personalizado, añádelo también
3. Reinicia el servidor de desarrollo después de cambiar `next.config.ts`

---

### Error: "STORAGE_ENDPOINT debe incluir el protocolo"

**Causa**: El endpoint no incluye `https://`

**Solución**:
```bash
# ❌ Incorrecto
STORAGE_ENDPOINT="fsn1.your-objectstorage.com"

# ✅ Correcto
STORAGE_ENDPOINT="https://fsn1.your-objectstorage.com"
```

---

## 🔍 Diagnóstico Paso a Paso

### 1. Verificar Variables de Entorno

```bash
# Verificar que todas las variables estén configuradas
env | grep STORAGE_
```

Debes ver:
- `STORAGE_ENDPOINT`
- `STORAGE_REGION`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_BUCKET`

### 2. Ejecutar Script de Diagnóstico

```bash
npx tsx scripts/test-hetzner-storage.ts
```

Este script verificará:
- ✅ Variables de entorno
- ✅ Formato del endpoint
- ✅ Credenciales válidas
- ✅ Bucket existe y es accesible
- ✅ Upload funciona
- ✅ Download funciona
- ✅ Signed URLs funcionan

### 3. Verificar en Hetzner Cloud Console

1. Accede a [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Ve a **Object Storage**
3. Verifica:
   - El bucket existe
   - El nombre coincide exactamente con `STORAGE_BUCKET`
   - La región coincide con `STORAGE_REGION`
   - Los Access Keys están activos

### 4. Probar Upload Manual

```typescript
// En cualquier API route o script
import { uploadToS3 } from '@/lib/s3';

const testBuffer = Buffer.from('test');
const url = await uploadToS3(testBuffer, 'test/test.txt', 'text/plain');
console.log('URL:', url);
```

---

## 📋 Checklist de Configuración

- [ ] Variables de entorno configuradas en `.env`
- [ ] `STORAGE_ENDPOINT` incluye `https://`
- [ ] `STORAGE_ENDPOINT` no tiene trailing slash
- [ ] `STORAGE_REGION` coincide con la región del bucket
- [ ] `STORAGE_BUCKET` coincide exactamente con el nombre del bucket
- [ ] Access Key y Secret Key son correctos
- [ ] El bucket existe en Hetzner Cloud Console
- [ ] `next.config.ts` tiene el dominio correcto en `remotePatterns`
- [ ] Script de diagnóstico pasa todos los tests
- [ ] Upload de prueba funciona
- [ ] URLs generadas son accesibles

---

## 🔗 Referencias

- [Hetzner Object Storage Docs](https://docs.hetzner.com/storage/object-storage/)
- [AWS SDK S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [S3 API Compatibility](https://docs.hetzner.com/storage/object-storage/s3-api/)
- [Documentación de Migración](docs/MIGRACION_HETZNER.md)

---

## 💡 Tips Adicionales

1. **Usa el script de diagnóstico** antes de reportar problemas
2. **Verifica los logs** de la aplicación para ver errores específicos
3. **Revisa la consola de Hetzner** para ver si hay problemas del lado del servidor
4. **Prueba con curl** para verificar conectividad:
   ```bash
   curl -I https://fsn1.your-objectstorage.com
   ```
5. **Verifica permisos CORS** si necesitas acceso desde el navegador

---

**Última actualización**: 2025-01-27

