# Migración de Documentos Legacy a Hetzner Object Storage

## 📋 Resumen

Script para migrar documentos almacenados localmente (`uploads/`) a Hetzner Object Storage (S3).

**Estado actual**: Solo hay 1 archivo legacy (72KB) - momento perfecto para migrar.

---

## 🎯 ¿Cuándo migrar?

### ✅ **Migrar AHORA si:**
- Tienes pocos documentos legacy (< 1000)
- Quieres tener todo centralizado en Hetzner
- Quieres simplificar backups (todo en un lugar)
- Quieres poder cambiar de servidor sin mover archivos manualmente

### ⏸️ **Esperar si:**
- Tienes muchos documentos (> 10,000) - mejor planificarlo
- Estás en horario de alto tráfico - mejor hacerlo en horario bajo
- No estás seguro de la configuración de S3 - mejor validar primero

---

## 🚀 Uso del Script

### 1. Verificar qué se migraría (DRY RUN)

```bash
cd /opt/clousadmin
npx tsx scripts/migrate-documents-to-s3.ts --dry-run
```

Esto mostrará:
- Cuántos documentos se migrarían
- Qué archivos se procesarían
- **NO hace cambios reales**

### 2. Ejecutar migración real

```bash
cd /opt/clousadmin
npx tsx scripts/migrate-documents-to-s3.ts
```

Esto:
- ✅ Migra documentos a S3
- ✅ Actualiza registros en DB
- ✅ Mantiene archivos locales (por seguridad)

### 3. Migrar y eliminar archivos locales

```bash
cd /opt/clousadmin
npx tsx scripts/migrate-documents-to-s3.ts --delete-after
```

**⚠️ CUIDADO**: Esto elimina archivos locales después de migrar. Solo úsalo cuando estés 100% seguro de que la migración fue exitosa.

---

## 🔒 Seguridad del Script

El script está diseñado para ser **seguro e idempotente**:

- ✅ Verifica que el archivo existe antes de migrar
- ✅ Verifica que la subida a S3 fue exitosa antes de actualizar DB
- ✅ No elimina archivos locales a menos que `--delete-after` esté activo
- ✅ Puede ejecutarse múltiples veces sin problemas (idempotente)
- ✅ Logs detallados de cada operación
- ✅ Manejo de errores robusto

---

## 📊 Proceso de Migración

Para cada documento legacy:

1. **Verificar**: ¿Existe el archivo físico en `uploads/`?
2. **Leer**: Cargar archivo desde filesystem local
3. **Subir**: Subir a Hetzner Object Storage con clave `documentos/{ruta-original}`
4. **Actualizar DB**: Cambiar `s3Bucket` de `'local'` a nombre del bucket
5. **Opcional**: Eliminar archivo local si `--delete-after` está activo

---

## 🧪 Verificación Post-Migración

Después de ejecutar el script, verifica:

1. **Contar documentos migrados**:
   ```sql
   SELECT COUNT(*) FROM documento WHERE s3_bucket != 'local' AND s3_bucket IS NOT NULL;
   ```

2. **Verificar que no quedan legacy**:
   ```sql
   SELECT COUNT(*) FROM documento WHERE s3_bucket = 'local' OR s3_bucket IS NULL;
   ```

3. **Probar descarga**: Descargar un documento migrado desde la UI

---

## ⚠️ Troubleshooting

### Error: "STORAGE_BUCKET no configurado"
- Verifica que `STORAGE_BUCKET` esté en `.env`
- Verifica que `ENABLE_CLOUD_STORAGE=true`

### Error: "Archivo no encontrado"
- El documento en DB apunta a un archivo que no existe físicamente
- Puede ser un documento huérfano (se puede ignorar o eliminar de DB)

### Error: "Access Denied" en S3
- Verifica credenciales `STORAGE_ACCESS_KEY` y `STORAGE_SECRET_KEY`
- Verifica que el bucket existe en Hetzner

---

## 📝 Notas

- El script es **idempotente**: puede ejecutarse múltiples veces sin problemas
- Los documentos ya migrados se omiten automáticamente
- Los archivos locales se mantienen por defecto (por seguridad)
- El script genera logs detallados para auditoría

---

## 🔄 Migración Futura

Si en el futuro necesitas migrar más documentos:

1. Ejecuta `--dry-run` primero para ver qué se migraría
2. Ejecuta sin flags para migrar
3. Verifica resultados
4. Ejecuta con `--delete-after` para limpiar archivos locales

---

**Última actualización**: 2025-11-16



