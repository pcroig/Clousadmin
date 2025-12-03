/**
 * Configuración de PDF.js
 *
 * Este archivo configura el worker de PDF.js necesario para renderizar PDFs.
 * El worker se ejecuta en un hilo separado para no bloquear el UI.
 *
 * IMPORTANTE: Esta configuración debe ejecutarse una sola vez al inicio.
 *
 * @version 1.0.2
 * - Worker local en /public (compatible con Turbopack/Next.js 16)
 * - Versión sincronizada automáticamente con react-pdf
 * - Script postinstall copia worker después de npm install
 *
 * NOTA: react-pdf requiere una versión específica de pdfjs-dist.
 * El script postinstall en package.json se encarga de copiar la versión correcta.
 */

import { pdfjs } from 'react-pdf';

/**
 * Configurar el worker local
 *
 * Ventajas sobre CDN:
 * - No depende de red externa (más rápido y confiable)
 * - Compatible con Turbopack (Next.js 16)
 * - No hay problemas de CORS o mixed content
 * - Funciona offline
 * - Versiones siempre sincronizadas (evita mismatch API/Worker)
 *
 * El archivo pdf.worker.min.mjs está en /public y se copia automáticamente
 * desde node_modules/pdfjs-dist/build/ mediante el script postinstall
 */
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
