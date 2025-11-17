# Migración 2025-11-16 · Cifrado de empleados existentes

## Objetivo
Cifrar los campos sensibles (`iban`, `nif`, `nss`) ya almacenados en `empleados` para cumplir con la Fase 4 del plan de seguridad antes de cargar datos reales de clientes.

## Requisitos previos
1. **Backup completo realizado durante las últimas 24h**
   - BD: `bash scripts/backup-db.sh`
   - Storage: `s3cmd sync` según `docs/DISASTER_RECOVERY.md`
2. `ENCRYPTION_KEY` configurada y validada (`lib/crypto.ts` → `validateEncryptionSetup`).
3. Acceso a la base de datos con el rol adecuado para ejecutar updates.

## Procedimiento
1. **Dry run (identificar registros afectados)**
   ```bash
   tsx scripts/encrypt-empleados.ts --confirm-backup --dry-run
   ```
   - Revisa la salida y anota cuántos empleados serán actualizados por empresa.
2. **Ejecución real**
   ```bash
   tsx scripts/encrypt-empleados.ts --confirm-backup
   ```
   - El script procesa en lotes (por defecto 200 registros) y salta campos ya cifrados.
3. **Verificación**
   - Ejecuta `SELECT id, iban FROM empleados WHERE iban NOT LIKE '%:%:%:%' LIMIT 5;` y confirma que no devuelve filas.
   - Spot-check manual desde `/hr/organizacion/personas` para validar que el Front sigue mostrando los datos desencriptados.
4. **Registro**
   - Documenta la fecha/hora y número de registros en `docs/daily/`.

> ℹ️ El script exige `--confirm-backup` para evitar ejecuciones accidentales sin respaldo.

## Rollback
Si algo falla:
1. Restaura la BD con el último backup (`docs/DISASTER_RECOVERY.md` · sección 3.1).
2. Verifica que la app vuelve a servir datos sin errores.
3. Investiga la causa (clave incorrecta, datos corruptos, etc.) antes de reintentar.

## FAQs
- **¿Qué pasa si algunos campos ya estaban cifrados?**  
  `scripts/encrypt-empleados.ts` detecta el formato `salt:iv:authTag:ciphertext` y solo toca registros en texto plano.

- **¿Puedo añadir nuevos campos sensibles?**  
  Sí. Añádelos en `lib/empleado-crypto.ts` (`SENSITIVE_FIELDS`) y vuelve a ejecutar el script (se limitará a los campos no cifrados).

- **¿Cuándo debo volver a correr la migración?**  
  Solo cuando importes datos legacy no cifrados (por ejemplo, al migrar otra instancia). Para instalaciones nuevas no es necesario.



