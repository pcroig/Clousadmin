# Migración de Posiciones de Firma v1 → v2

## Contexto

Las posiciones de firma han evolucionado de un sistema basado en coordenadas absolutas (v1) a un sistema basado en porcentajes (v2) que es independiente de las dimensiones del PDF.

### Sistema v1 (LEGACY)
```typescript
{
  pagina: 1,
  x: 400,        // Puntos desde la izquierda
  y: 100,        // Puntos desde ABAJO (estándar PDF)
  width: 180,
  height: 60
}
```

**Problema**: Asume tamaño fijo de PDF (A4). Si el PDF real tiene otras dimensiones, la posición aparece incorrecta.

### Sistema v2 (ACTUAL)
```typescript
{
  version: 'v2',
  porcentajes: {
    pagina: 1,
    xPorcentaje: 67.2,    // 0-100% desde izquierda
    yPorcentaje: 12.8,    // 0-100% desde ARRIBA
    widthPorcentaje: 30,
    heightPorcentaje: 7
  },
  pdfDimensiones: {
    width: 595,
    height: 842,
    numPaginas: 3
  }
}
```

**Ventajas**:
- ✅ Independiente del tamaño del PDF
- ✅ Funciona con cualquier dimensión
- ✅ Más preciso y escalable
- ✅ Incluye metadata del PDF original

## Uso del Script de Migración

### 1. Dry Run (Recomendado primero)

Ejecuta sin hacer cambios para ver qué se migraría:

```bash
npx tsx scripts/migrar-posiciones-firma.ts --dry-run
```

### 2. Migración Limitada (Testing)

Migra solo los primeros N registros:

```bash
npx tsx scripts/migrar-posiciones-firma.ts --dry-run --limit=5
npx tsx scripts/migrar-posiciones-firma.ts --limit=5  # Sin --dry-run para aplicar
```

### 3. Migración Completa

Una vez verificado que funciona correctamente:

```bash
npx tsx scripts/migrar-posiciones-firma.ts
```

## Qué Hace el Script

1. **Busca** todas las solicitudes de firma con posiciones guardadas
2. **Detecta** cuáles están en formato v1 (antiguo)
3. Para cada posición v1:
   - Descarga el PDF desde S3
   - Obtiene las dimensiones reales de la página
   - Convierte coordenadas absolutas → porcentajes
   - Guarda la posición en formato v2 con metadata
4. **Reporta** estadísticas completas

## Salida del Script

```
🔄 Iniciando migración de posiciones de firma v1 → v2

Modo: 🔍 DRY RUN (sin cambios)

📊 Encontradas 15 solicitudes con posición

[1/15] Procesando Contrato_trabajo.pdf... ✅ Migrada
[2/15] Procesando Nómina_enero.pdf... ℹ️  Ya es v2
[3/15] Procesando Acuerdo_NDA.pdf... ✅ Migrada
...

============================================================
📈 RESUMEN DE MIGRACIÓN
============================================================
Total procesadas:     15
✅ Migradas a v2:     10
ℹ️  Ya eran v2:        3
⚠️  Sin posición:      1
❌ Errores:           1
============================================================
```

## Verificación Post-Migración

Después de ejecutar la migración, verifica que:

1. **Frontend HR Admin**: Las posiciones seleccionadas se muestran correctamente
2. **Preview Empleado**: El empleado ve el recuadro en la posición correcta
3. **PDF Final**: La firma aparece exactamente donde se seleccionó

## Rollback

Si algo sale mal, el sistema es **retrocompatible**:
- El código maneja tanto v1 como v2
- Los registros no migrados seguirán funcionando
- No es necesario rollback de código

Para restaurar posiciones específicas, busca en logs o backups de BD el valor anterior de `posicionFirma`.

## Notas Técnicas

### Compatibilidad
- El sistema sigue aceptando v1 en nuevas solicitudes (aunque no recomendado)
- Toda la lógica detecta automáticamente el formato
- No hay breaking changes

### Performance
- El script descarga PDFs desde S3 (puede ser lento con muchos registros)
- Incluye pausas de 100ms entre documentos para no saturar S3
- Usa `--limit` para procesar en lotes si tienes muchos registros

### Errores Comunes
- **"PDF no encontrado en S3"**: El documento fue eliminado o movido
- **"Página fuera de rango"**: La posición referencia una página que no existe
- **"Error obteniendo dimensiones"**: PDF corrupto o formato no válido

## Mantenimiento Futuro

Una vez migrados todos los registros existentes:
1. Considera eliminar soporte para v1 en nuevas solicitudes (API endpoint)
2. El código de lectura debe mantener retrocompatibilidad indefinidamente
3. Documenta que v2 es el formato estándar en la API docs
