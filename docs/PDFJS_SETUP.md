# Configuración de PDF.js

Este documento explica cómo está configurado PDF.js en el proyecto y cómo solucionar problemas comunes.

## Arquitectura

El proyecto usa `react-pdf` para renderizar PDFs en canvas, con las siguientes características:

- **Librería**: `react-pdf@10.2.0` + `pdfjs-dist@5.4.296`
- **Worker**: Local en `/public/pdf.worker.min.mjs`
- **Configuración**: `/lib/pdf-config.ts`
- **Componente**: `/components/shared/pdf-canvas-viewer.tsx`

## ¿Por qué worker local?

Usamos un worker local en lugar del CDN por:

1. **Compatibilidad Turbopack**: Next.js 16 con Turbopack bloquea imports dinámicos HTTP
2. **Performance**: No hay latencia de red externa
3. **Confiabilidad**: Funciona offline y sin dependencia de CDN
4. **Sincronización**: Versiones siempre alineadas entre API y Worker

## Instalación Automática

El worker se copia automáticamente después de `npm install`:

```json
{
  "scripts": {
    "postinstall": "cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs || true"
  }
}
```

## Versiones Críticas

⚠️ **IMPORTANTE**: `react-pdf` y `pdfjs-dist` deben tener versiones compatibles.

```bash
# Verificar versiones
npm list react-pdf pdfjs-dist

# Debe mostrar:
# ├── pdfjs-dist@5.4.296
# └─┬ react-pdf@10.2.0
#   └── pdfjs-dist@5.4.296 deduped
```

## Solución de Problemas

### Error: "API version does not match Worker version"

**Causa**: Mismatch entre versión de pdfjs-dist instalada y el worker copiado.

**Solución**:
```bash
# 1. Verificar qué versión necesita react-pdf
npm list react-pdf

# 2. Instalar la versión exacta
npm install pdfjs-dist@5.4.296

# 3. Copiar worker correcto
npm run postinstall
```

### Error: "Failed to fetch worker from unpkg"

**Causa**: Intentando usar CDN en lugar de worker local.

**Solución**: Verificar que `/lib/pdf-config.ts` apunta a worker local:
```typescript
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

### Worker no se encuentra en /public

**Solución**:
```bash
# Copiar manualmente
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

## CI/CD

El worker se genera automáticamente en el pipeline:

1. `npm install` → ejecuta `postinstall`
2. Worker se copia a `/public`
3. Next.js sirve el worker estáticamente
4. Sin pasos adicionales necesarios ✅

## Actualización de Versiones

Al actualizar `react-pdf`:

```bash
# 1. Actualizar react-pdf
npm install react-pdf@latest

# 2. Verificar versión de pdfjs-dist requerida
npm list react-pdf

# 3. Si hay mismatch, instalar versión correcta
npm install pdfjs-dist@X.Y.Z

# 4. Copiar worker
npm run postinstall
```

## Archivo Generado

El archivo `/public/pdf.worker.min.mjs`:
- ✅ Se genera automáticamente
- ✅ Está en `.gitignore`
- ✅ Tamaño: ~1MB
- ❌ NO commitear a git

## Referencias

- [react-pdf docs](https://github.com/wojtekmaj/react-pdf)
- [PDF.js docs](https://mozilla.github.io/pdf.js/)
- Componente: `/components/shared/pdf-canvas-viewer.tsx`
- Configuración: `/lib/pdf-config.ts`
