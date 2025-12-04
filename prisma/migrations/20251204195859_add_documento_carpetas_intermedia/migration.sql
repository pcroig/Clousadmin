-- ========================================
-- Migración: Tabla intermedia documento_carpetas (relación M:N)
-- ========================================
-- Esta migración transforma la relación 1:N (documentos → carpetas)
-- en una relación M:N mediante tabla intermedia.
--
-- Esto permite que un documento esté en múltiples carpetas:
-- - Carpeta personal del empleado
-- - Carpeta master centralizada para HR
--
-- ========================================

-- PASO 1: Crear tabla intermedia documento_carpetas
-- ========================================
CREATE TABLE "documento_carpetas" (
    "documentoId" TEXT NOT NULL,
    "carpetaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_carpetas_pkey" PRIMARY KEY ("documentoId","carpetaId")
);

-- Crear índices para performance
CREATE INDEX "documento_carpetas_documentoId_idx" ON "documento_carpetas"("documentoId");
CREATE INDEX "documento_carpetas_carpetaId_idx" ON "documento_carpetas"("carpetaId");

-- Agregar foreign keys
ALTER TABLE "documento_carpetas" ADD CONSTRAINT "documento_carpetas_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documento_carpetas" ADD CONSTRAINT "documento_carpetas_carpetaId_fkey" FOREIGN KEY ("carpetaId") REFERENCES "carpetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- PASO 2: Migrar datos existentes de documentos.carpetaId → documento_carpetas
-- ========================================
INSERT INTO "documento_carpetas" ("documentoId", "carpetaId", "createdAt")
SELECT
    id as "documentoId",
    "carpetaId",
    NOW() as "createdAt"
FROM "documentos"
WHERE "carpetaId" IS NOT NULL
ON CONFLICT ("documentoId", "carpetaId") DO NOTHING;

-- Verificar: deben coincidir
DO $$
DECLARE
    docs_con_carpeta INTEGER;
    relaciones_creadas INTEGER;
BEGIN
    SELECT COUNT(*) INTO docs_con_carpeta FROM "documentos" WHERE "carpetaId" IS NOT NULL;
    SELECT COUNT(*) INTO relaciones_creadas FROM "documento_carpetas";

    RAISE NOTICE 'Documentos con carpeta original: %', docs_con_carpeta;
    RAISE NOTICE 'Relaciones creadas en tabla intermedia: %', relaciones_creadas;

    IF docs_con_carpeta != relaciones_creadas THEN
        RAISE WARNING 'Los números no coinciden! Revisar migración.';
    ELSE
        RAISE NOTICE '✓ Migración de datos verificada correctamente';
    END IF;
END $$;


-- PASO 3: Sincronizar documentos con carpetas master
-- ========================================
-- Para cada carpeta master (empleadoId = NULL, esSistema = true),
-- crear relaciones con todos los documentos de las carpetas de empleados
-- con el mismo nombre.

DO $$
DECLARE
    carpeta_master RECORD;
    carpeta_empleado RECORD;
    doc_carpeta RECORD;
    sincronizados INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando sincronización con carpetas master...';

    -- Para cada carpeta master
    FOR carpeta_master IN
        SELECT * FROM "carpetas"
        WHERE "empleadoId" IS NULL AND "esSistema" = true
    LOOP
        RAISE NOTICE 'Procesando carpeta master: %', carpeta_master.nombre;

        -- Encontrar carpetas de empleados con el mismo nombre
        FOR carpeta_empleado IN
            SELECT * FROM "carpetas"
            WHERE "nombre" = carpeta_master.nombre
            AND "esSistema" = true
            AND "empleadoId" IS NOT NULL
            AND "empresaId" = carpeta_master."empresaId"
        LOOP
            -- Para cada documento en carpeta del empleado
            FOR doc_carpeta IN
                SELECT * FROM "documento_carpetas"
                WHERE "carpetaId" = carpeta_empleado.id
            LOOP
                -- Crear relación con carpeta master (si no existe)
                INSERT INTO "documento_carpetas" ("documentoId", "carpetaId", "createdAt")
                VALUES (doc_carpeta."documentoId", carpeta_master.id, NOW())
                ON CONFLICT ("documentoId", "carpetaId") DO NOTHING;

                sincronizados := sincronizados + 1;
            END LOOP;
        END LOOP;
    END LOOP;

    RAISE NOTICE '✓ Documentos sincronizados con carpetas master: %', sincronizados;
END $$;


-- PASO 4: Eliminar índice viejo de carpetaId
-- ========================================
DROP INDEX IF EXISTS "documentos_carpetaId_idx";


-- PASO 5: Eliminar foreign key vieja
-- ========================================
ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "documentos_carpetaId_fkey";


-- PASO 6: Eliminar columna carpetaId de documentos
-- ========================================
ALTER TABLE "documentos" DROP COLUMN IF EXISTS "carpetaId";


-- PASO 7: Verificación final
-- ========================================
DO $$
DECLARE
    total_relaciones INTEGER;
    carpetas_master INTEGER;
    carpetas_empleados INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_relaciones FROM "documento_carpetas";
    SELECT COUNT(*) INTO carpetas_master FROM "carpetas" WHERE "empleadoId" IS NULL AND "esSistema" = true;
    SELECT COUNT(*) INTO carpetas_empleados FROM "carpetas" WHERE "empleadoId" IS NOT NULL AND "esSistema" = true;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN DE MIGRACIÓN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total relaciones documento-carpeta: %', total_relaciones;
    RAISE NOTICE 'Carpetas master (HR): %', carpetas_master;
    RAISE NOTICE 'Carpetas de empleados: %', carpetas_empleados;
    RAISE NOTICE '✓ Migración completada exitosamente!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;
