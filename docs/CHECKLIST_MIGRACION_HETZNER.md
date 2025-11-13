# ✅ Checklist de Migración a Hetzner

**Fecha de creación**: 13 de noviembre de 2025
**Última actualización**: 13 de noviembre de 2025

Este checklist te guía paso a paso en la migración completa de AWS a Hetzner. Marca cada ítem conforme lo completes.

---

## 📋 Pre-Migración

### Inventario y Preparación

- [ ] **Listar todos los archivos actuales en AWS S3** (si aplica)
  - [ ] Documentos de empleados
  - [ ] Avatares de usuarios
  - [ ] PDFs de nóminas
  - [ ] Documentos de onboarding/offboarding
  - [ ] Documentos de puestos de trabajo
  - [ ] Logos de empresas
  - [ ] Total de GB almacenados: ___________

- [ ] **Verificar versión actual del código**
  ```bash
  git branch
  # Debe estar en: claude/hetzner-server-implementation-01QcKC9d1MMSB8UueNGoimd9
  ```

- [ ] **Backup de base de datos** (por precaución)
  ```bash
  pg_dump clousadmin > backup_pre_hetzner_$(date +%Y%m%d).sql
  ```

---

## 🔧 Configuración de Hetzner

### 1. Crear Cuenta y Proyecto

- [ ] **Crear cuenta en Hetzner Cloud** (si no tienes una)
  - URL: https://console.hetzner.cloud/
  - [ ] Verificar email
  - [ ] Configurar método de pago

- [ ] **Crear nuevo proyecto** en Hetzner Cloud Console
  - Nombre sugerido: `clousadmin-production`

### 2. Configurar Object Storage

- [ ] **Crear bucket en Object Storage**
  - [ ] Ir a: Object Storage → Create Bucket
  - [ ] Elegir región:
    - [ ] `fsn1` (Falkenstein, Alemania) - Recomendado
    - [ ] `nbg1` (Nuremberg, Alemania)
    - [ ] `hel1` (Helsinki, Finlandia)
  - [ ] Nombre del bucket: `clousadmin-storage-prod`
  - [ ] Permisos: **Privado** (muy importante)

- [ ] **Crear Access Key**
  - [ ] Ir a: Object Storage → Access Keys
  - [ ] Click en "Generate Access Key"
  - [ ] **GUARDAR INMEDIATAMENTE** en lugar seguro:
    - Access Key ID: `____________________`
    - Secret Access Key: `____________________`
    - Endpoint URL: `____________________`

- [ ] **Configurar CORS** (si necesitas acceso desde navegador)
  ```bash
  # Instalar s3cmd si no lo tienes
  pip install s3cmd

  # Configurar s3cmd con tus credenciales de Hetzner
  s3cmd --configure

  # Crear archivo cors.xml con:
  cat > cors.xml <<EOF
  <?xml version="1.0" encoding="UTF-8"?>
  <CORSConfiguration>
    <CORSRule>
      <AllowedOrigin>https://tu-dominio.com</AllowedOrigin>
      <AllowedMethod>GET</AllowedMethod>
      <AllowedMethod>PUT</AllowedMethod>
      <AllowedMethod>POST</AllowedMethod>
      <AllowedMethod>DELETE</AllowedMethod>
      <AllowedHeader>*</AllowedHeader>
      <MaxAgeSeconds>3000</MaxAgeSeconds>
    </CORSRule>
  </CORSConfiguration>
  EOF

  # Aplicar configuración CORS
  s3cmd setcors cors.xml s3://clousadmin-storage-prod
  ```

---

## ⚙️ Configuración de la Aplicación

### 3. Variables de Entorno

- [ ] **Desarrollo Local** - Actualizar `.env.local`:
  ```bash
  # Hetzner Object Storage
  STORAGE_ENDPOINT="https://fsn1.your-objectstorage.com"
  STORAGE_REGION="eu-central-1"
  STORAGE_ACCESS_KEY="tu-access-key"
  STORAGE_SECRET_KEY="tu-secret-key"
  STORAGE_BUCKET="clousadmin-storage-dev"

  # Feature flag
  ENABLE_CLOUD_STORAGE="true"
  ```

- [ ] **Staging** - Configurar variables en servidor de staging:
  - [ ] `STORAGE_ENDPOINT`
  - [ ] `STORAGE_REGION`
  - [ ] `STORAGE_ACCESS_KEY`
  - [ ] `STORAGE_SECRET_KEY`
  - [ ] `STORAGE_BUCKET` (usar bucket de staging)
  - [ ] `ENABLE_CLOUD_STORAGE="true"`

- [ ] **Producción** - Configurar variables en servidor de producción:
  - [ ] `STORAGE_ENDPOINT`
  - [ ] `STORAGE_REGION`
  - [ ] `STORAGE_ACCESS_KEY`
  - [ ] `STORAGE_SECRET_KEY`
  - [ ] `STORAGE_BUCKET` (usar bucket de producción)
  - [ ] `ENABLE_CLOUD_STORAGE="true"`

- [ ] **Eliminar variables obsoletas de AWS** (en todos los ambientes):
  - [ ] Eliminar `AWS_REGION`
  - [ ] Eliminar `AWS_ACCESS_KEY_ID`
  - [ ] Eliminar `AWS_SECRET_ACCESS_KEY`
  - [ ] Eliminar `S3_BUCKET`
  - [ ] Eliminar `ENABLE_S3_UPLOAD`

### 4. Código y Deployment

- [ ] **Merge del branch de migración**
  ```bash
  # Revisar cambios
  git diff main claude/hetzner-server-implementation-01QcKC9d1MMSB8UueNGoimd9

  # Merge a main
  git checkout main
  git merge claude/hetzner-server-implementation-01QcKC9d1MMSB8UueNGoimd9
  git push origin main
  ```

- [ ] **Deploy a Staging**
  ```bash
  npm run build
  # Verificar que no hay errores de TypeScript
  ```

- [ ] **Deploy a Producción** (después de testing en staging)

---

## 🔄 Migración de Datos

### 5. Migrar Archivos de AWS S3 a Hetzner (si aplica)

**Opción A: Usando s3cmd**

- [ ] **Instalar s3cmd**
  ```bash
  pip install s3cmd
  ```

- [ ] **Configurar credenciales de AWS** (fuente)
  ```bash
  s3cmd --configure
  # Usar credenciales de AWS S3
  ```

- [ ] **Guardar config de AWS**
  ```bash
  mv ~/.s3cfg ~/.s3cfg.aws
  ```

- [ ] **Configurar credenciales de Hetzner** (destino)
  ```bash
  s3cmd --configure
  # Usar credenciales de Hetzner
  # Host: fsn1.your-objectstorage.com
  # Bucket format: %(bucket)s.fsn1.your-objectstorage.com
  ```

- [ ] **Guardar config de Hetzner**
  ```bash
  mv ~/.s3cfg ~/.s3cfg.hetzner
  ```

- [ ] **Sincronizar archivos**
  ```bash
  # Restaurar config de AWS
  cp ~/.s3cfg.aws ~/.s3cfg

  # Listar archivos en AWS
  s3cmd ls s3://tu-bucket-aws/

  # Cambiar a config de Hetzner
  cp ~/.s3cfg.hetzner ~/.s3cfg

  # Sincronizar (PROBAR PRIMERO CON --dry-run)
  s3cmd sync --dry-run s3://tu-bucket-aws/ s3://clousadmin-storage-prod/

  # Si todo se ve bien, ejecutar sin --dry-run
  s3cmd sync s3://tu-bucket-aws/ s3://clousadmin-storage-prod/

  # Verificar archivos migrados
  s3cmd ls -r s3://clousadmin-storage-prod/
  ```

**Opción B: Script personalizado Node.js**

- [ ] **Crear script de migración** (si necesitas lógica personalizada)
  - Ver ejemplo en `docs/MIGRACION_HETZNER.md`

---

## 🧪 Testing

### 6. Pruebas Funcionales

- [ ] **Desarrollo Local**
  - [ ] ✅ Subir avatar de usuario
  - [ ] ✅ Subir documento de empleado
  - [ ] ✅ Subir documento de onboarding
  - [ ] ✅ Subir PDF de nómina
  - [ ] ✅ Descargar documento existente
  - [ ] ✅ Eliminar documento
  - [ ] ✅ Verificar URLs generadas correctamente
  - [ ] ✅ Extraer datos de documento con IA

- [ ] **Staging**
  - [ ] ✅ Repetir todas las pruebas de desarrollo
  - [ ] ✅ Verificar que URLs sean accesibles
  - [ ] ✅ Verificar permisos (archivos privados no accesibles sin firma)
  - [ ] ✅ Verificar URLs firmadas expiración correcta
  - [ ] ✅ Probar con archivos grandes (hasta 10MB)
  - [ ] ✅ Probar concurrencia (múltiples uploads simultáneos)

- [ ] **Producción** (después de deploy)
  - [ ] ✅ Smoke test: subir y descargar un documento de prueba
  - [ ] ✅ Verificar que documentos existentes (migrados) sean accesibles
  - [ ] ✅ Monitorear logs por errores

### 7. Pruebas de Performance

- [ ] **Medir tiempos de respuesta**
  - [ ] Upload pequeño (<1MB): _______ ms
  - [ ] Upload mediano (1-5MB): _______ ms
  - [ ] Upload grande (5-10MB): _______ ms
  - [ ] Download con URL firmada: _______ ms

- [ ] **Comparar con AWS** (si es posible):
  - [ ] Upload: Hetzner _______ ms vs AWS _______ ms
  - [ ] Download: Hetzner _______ ms vs AWS _______ ms

---

## 🔐 Seguridad

### 8. Verificación de Seguridad

- [ ] **Variables de entorno protegidas**
  - [ ] ✅ No hay credenciales en código
  - [ ] ✅ No hay credenciales en repositorio Git
  - [ ] ✅ Variables en servidor con permisos restringidos
  - [ ] ✅ Variables en gestor de secretos (si aplica)

- [ ] **Permisos de bucket**
  - [ ] ✅ Bucket es privado (no acceso público)
  - [ ] ✅ CORS configurado correctamente
  - [ ] ✅ Access Key tiene permisos mínimos necesarios

- [ ] **Logging y Auditoría**
  - [ ] ✅ Habilitar logging en Hetzner (si está disponible)
  - [ ] ✅ Configurar alertas de acceso no autorizado
  - [ ] ✅ Revisar logs de aplicación por errores

---

## 📊 Monitoreo Post-Migración

### 9. Monitoreo Primeras 48 Horas

- [ ] **Día 1 - Cada 2 horas**
  - [ ] Revisar logs de aplicación
  - [ ] Verificar que uploads funcionan
  - [ ] Verificar que downloads funcionan
  - [ ] Revisar métricas de error rate
  - [ ] Verificar uso de storage en Hetzner Console

- [ ] **Día 2 - Cada 4 horas**
  - [ ] Repetir verificaciones del Día 1

- [ ] **Semana 1 - Diariamente**
  - [ ] Revisar costos en Hetzner Cloud Console
  - [ ] Comparar con costos proyectados
  - [ ] Verificar que no hay degradación de performance

---

## 🧹 Cleanup (Después de 30 días)

### 10. Limpieza de Recursos AWS

⚠️ **SOLO DESPUÉS DE VERIFICAR QUE TODO FUNCIONA CORRECTAMENTE**

- [ ] **Eliminar archivos de AWS S3** (si aplica)
  ```bash
  # Listar archivos una última vez
  aws s3 ls s3://tu-bucket-aws/ --recursive

  # Eliminar (con precaución)
  aws s3 rm s3://tu-bucket-aws/ --recursive

  # Eliminar bucket
  aws s3 rb s3://tu-bucket-aws/
  ```

- [ ] **Eliminar Access Keys de AWS**
  - [ ] Ir a AWS IAM Console
  - [ ] Eliminar Access Keys antiguas

- [ ] **Cancelar servicios AWS** (si no se usan para nada más)
  - [ ] Verificar que no hay otros servicios en uso
  - [ ] Cancelar cuenta/servicios

---

## 📝 Documentación

### 11. Actualizar Documentación

- [x] ✅ README.md actualizado
- [x] ✅ docs/ARQUITECTURA.md actualizado
- [x] ✅ docs/SETUP.md actualizado
- [x] ✅ docs/CONFIGURACION_SEGURIDAD.md actualizado
- [x] ✅ docs/MIGRACION_HETZNER.md creado
- [x] ✅ .cursorrules actualizado
- [ ] **Documentar decisiones**
  - [ ] Razones de la migración
  - [ ] Comparativa de costos
  - [ ] Lecciones aprendidas

---

## 🎯 Criterios de Éxito

La migración se considera exitosa cuando:

- ✅ **Funcionalidad**: Todas las funciones de almacenamiento funcionan correctamente
- ✅ **Performance**: Tiempos de respuesta similares o mejores que con AWS
- ✅ **Seguridad**: No hay brechas de seguridad, archivos correctamente protegidos
- ✅ **Estabilidad**: Sin errores relacionados con almacenamiento en logs
- ✅ **Costos**: Reducción de costos confirmada (~70-80% vs AWS)
- ✅ **Documentación**: Toda la documentación actualizada y clara

---

## 📞 Contactos de Soporte

- **Hetzner Support**: https://docs.hetzner.com/
- **Hetzner Status**: https://status.hetzner.com/
- **Object Storage Docs**: https://docs.hetzner.com/storage/object-storage/

---

## 🐛 Troubleshooting Común

### Problema: URLs no funcionan

**Síntomas**: URLs generadas dan 404 o Access Denied

**Solución**:
1. Verificar que endpoint está correcto
2. Verificar que bucket existe
3. Verificar permisos de Access Key
4. Verificar formato de URL generada

### Problema: Credenciales inválidas

**Síntomas**: Error "SignatureDoesNotMatch" o "InvalidAccessKeyId"

**Solución**:
1. Verificar Access Key y Secret Key
2. Verificar que no hay espacios extra
3. Regenerar credenciales si es necesario
4. Verificar que endpoint coincide con región del bucket

### Problema: CORS errors en navegador

**Síntomas**: Error de CORS al acceder a archivos

**Solución**:
1. Configurar CORS en bucket (ver paso 2)
2. Verificar que origen está permitido
3. Verificar métodos HTTP permitidos

---

**Última verificación**: ___/___/_____ a las ____:____
**Verificado por**: _________________________
**Estado final**: [ ] ✅ Exitoso  [ ] ⚠️ Con observaciones  [ ] ❌ Fallido

