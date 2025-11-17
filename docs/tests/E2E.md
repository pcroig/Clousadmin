# Suite E2E (manual) – Seguridad & Datos críticos

## 1. Auditoría de accesos
1. Ejecuta `npm run dev`.
2. Inicia sesión como HR (`admin@clousadmin.com`).
3. Abre `http://localhost:3000/hr/organizacion/personas` y consulta un empleado.
4. Abre `http://localhost:3000/hr/auditoria` y confirma que aparece un log con `recurso=empleado`.
5. Descarga un documento (`/api/documentos/<id>`) y verifica en la tabla que se registra `accion=lectura`.

## 2. Importación Excel (endurecida)
1. Preparar archivo `.xlsx` < 5 MB.
2. POST `curl -F "file=@empleados.xlsx" http://localhost:3000/api/empleados/importar-excel`.
3. Enviar archivo > 5 MB o con extensión inválida → debe devolver `400`.

## 3. Upload de nóminas (ZIP/PDF)
1. `curl -F "nominas=@nominas.zip" -F "mes=10" -F "anio=2025" -H "Cookie: ...JWT..." http://localhost:3000/api/nominas/upload`.
2. Intentar subir `.doc` o archivo de 20 MB → recibir `400` con mensaje de tamaño/formato.

## 4. Backup / Restore smoke test
1. Ejecutar `bash scripts/backup-db.sh` (requiere `DATABASE_URL` local).
2. Ejecutar `bash scripts/verify-latest-backup.sh` y conservar el ID del archivo.
3. Restaurar en DB temporal: `createdb clousadmin_restore && gunzip <archivo>.sql.gz && psql clousadmin_restore < <archivo>.sql`.

Documenta los resultados en `docs/daily/`.


