# Migración a Hetzner Object Storage

**Fecha**: 13 de noviembre de 2025
**Estado**: ✅ Completado

---

## 📋 Resumen

Clousadmin ha migrado de AWS a Hetzner como proveedor de infraestructura cloud. Esta migración incluye:

- ✅ **Object Storage**: Migrado de AWS S3 a Hetzner Object Storage (S3-compatible)
- ✅ **Variables de entorno**: Actualizadas para Hetzner
- ✅ **Código**: Todas las referencias actualizadas
- ❌ **AWS Cognito**: Removido (nunca se usó, usamos JWT)
- ✅ **Email**: Ya migrado a Resend (ver MIGRACION_RESEND.md)

---

## 🔄 Cambios Realizados

### 1. Variables de Entorno

#### Antes (AWS)
```bash
AWS_REGION="eu-west-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
S3_BUCKET=""
```

#### Después (Hetzner)
```bash
STORAGE_ENDPOINT="https://fsn1.your-objectstorage.com"
STORAGE_REGION="eu-central-1"
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
STORAGE_BUCKET=""
```

### 2. Archivos Modificados

#### Código Principal
- `lib/s3.ts` - Cliente S3 actualizado para Hetzner
- `lib/env.ts` - Validación de variables actualizada
- `.env.example` - Template actualizado

#### APIs Actualizadas
- `app/api/upload/route.ts`
- `app/api/documentos/extraer/route.ts`
- `app/api/empleados/[id]/onboarding/documentos/route.ts`
- `app/api/onboarding/[token]/documentos/route.ts`
- `app/api/puestos/[id]/documentos/route.ts`
- `app/api/nominas/eventos/[id]/importar/route.ts`
- `lib/onboarding.ts`

#### Configuración
- `next.config.ts` - Dominios permitidos actualizados
- `amplify.yml` - **ELIMINADO** (no necesario para Hetzner)

#### Documentación
- `README.md`
- `docs/ARQUITECTURA.md`
- `docs/SETUP.md`

---

## 🚀 Configuración de Hetzner Object Storage

### Paso 1: Crear Bucket en Hetzner

1. Accede a [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Ve a **Object Storage**
3. Crea un nuevo bucket:
   - **Región**: Elige entre:
     - `fsn1` (Falkenstein, Alemania)
     - `nbg1` (Nuremberg, Alemania)
     - `hel1` (Helsinki, Finlandia)
   - **Nombre**: `clousadmin-storage` (o el que prefieras)
   - **Permisos**: Privado

### Paso 2: Obtener Credenciales

1. En Hetzner Cloud Console, ve a **Object Storage → Access Keys**
2. Crea un nuevo Access Key
3. Guarda:
   - Access Key ID
   - Secret Access Key
   - Endpoint URL (ej: `https://fsn1.your-objectstorage.com`)

### Paso 3: Configurar Variables de Entorno

Actualiza tu `.env` o `.env.local`:

```bash
# Hetzner Object Storage
STORAGE_ENDPOINT="https://fsn1.your-objectstorage.com"
STORAGE_REGION="eu-central-1"
STORAGE_ACCESS_KEY="tu-access-key"
STORAGE_SECRET_KEY="tu-secret-key"
STORAGE_BUCKET="clousadmin-storage"

# Feature flag
ENABLE_CLOUD_STORAGE="true"
```

### Paso 4: Configurar CORS (si es necesario)

Si necesitas acceso desde el navegador, configura CORS en tu bucket:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://tu-dominio.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

---

## 🔐 Seguridad

### Mejores Prácticas

1. **Nunca** commiteés las credenciales al repositorio
2. Usa variables de entorno seguras en producción
3. Configura permisos mínimos necesarios en Hetzner
4. Rota las credenciales periódicamente
5. Habilita logging para auditoría

### Permisos Recomendados

El Access Key debe tener permisos para:
- ✅ Leer objetos (`s3:GetObject`)
- ✅ Escribir objetos (`s3:PutObject`)
- ✅ Eliminar objetos (`s3:DeleteObject`)
- ✅ Listar bucket (`s3:ListBucket`)

---

## 🧪 Testing

### Verificar Configuración

```typescript
// En cualquier API route o script
import { isS3Configured } from '@/lib/s3';

console.log('Storage configurado:', isS3Configured());
```

### Test de Upload

```bash
# Prueba subir un archivo desde el dashboard
# HR Admin → Empleados → Editar → Subir avatar
```

### Fallback Local

Si Object Storage no está configurado, la aplicación automáticamente usa almacenamiento local en `/uploads` para desarrollo.

---

## 💰 Costos

### Hetzner Object Storage Pricing (aprox.)

- **Almacenamiento**: ~€0.005/GB/mes
- **Transferencia de salida**: Primera 1TB gratis, luego ~€0.01/GB
- **Requests**: Mínimos, incluidos

### Comparativa vs AWS S3

| Concepto | Hetzner | AWS S3 (eu-west-1) |
|----------|---------|-------------------|
| Almacenamiento | €0.005/GB/mes | €0.023/GB/mes |
| Transferencia | 1TB gratis | €0.09/GB |
| GET requests | Incluido | €0.0004/1000 |

**Ahorro estimado**: ~70-80% en costos de storage

---

## 🔄 Migración de Datos Existentes

Si ya tienes datos en AWS S3:

### Opción 1: AWS CLI + s3cmd

```bash
# Instalar s3cmd
pip install s3cmd

# Configurar para AWS
s3cmd --configure

# Sincronizar a Hetzner
s3cmd sync s3://tu-bucket-aws/ \
  --host=fsn1.your-objectstorage.com \
  --host-bucket="%(bucket)s.fsn1.your-objectstorage.com" \
  s3://tu-bucket-hetzner/
```

### Opción 2: Script Node.js

```typescript
// scripts/migrate-storage.ts
import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3';

// Implementar migración personalizada
```

---

## 📚 Referencias

- [Hetzner Object Storage Docs](https://docs.hetzner.com/storage/object-storage/)
- [AWS SDK S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [S3 API Compatibility](https://docs.hetzner.com/storage/object-storage/s3-api/)

---

## ✅ Checklist Post-Migración

- [x] Actualizar variables de entorno en todos los ambientes
- [x] Eliminar credenciales AWS del código
- [x] Actualizar documentación
- [x] Eliminar amplify.yml
- [ ] Configurar backups en Hetzner
- [ ] Configurar lifecycle policies (opcional)
- [ ] Migrar datos existentes de AWS (si aplica)
- [ ] Actualizar monitoring/alertas

---

## 🐛 Troubleshooting

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

### Error: "SignatureDoesNotMatch"

**Causa**: Credenciales incorrectas o endpoint mal configurado

**Solución**:
1. Verifica que el Access Key y Secret Key sean correctos
2. Asegúrate que el endpoint tenga el formato: `https://REGION.your-objectstorage.com`
3. Verifica que la región coincida con tu bucket

### Error: "NoSuchBucket"

**Causa**: El bucket no existe o el nombre es incorrecto

**Solución**:
1. Verifica que el bucket exista en Hetzner Cloud Console
2. Verifica que el nombre en `STORAGE_BUCKET` sea exacto
3. Asegúrate de estar apuntando a la región correcta

---

## 📞 Soporte

Para problemas con la migración:
1. Consulta los logs de la aplicación
2. Verifica la configuración de Hetzner Cloud Console
3. Revisa [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

**Última actualización**: 13 de noviembre de 2025
**Autor**: Claude (AI Assistant)
