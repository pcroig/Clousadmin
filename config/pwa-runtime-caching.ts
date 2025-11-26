import defaultRuntimeCaching from 'next-pwa/cache';
import type { RuntimeCaching } from 'workbox-build';

/**
 * Evita cachear los chunks del App Router.
 *
 * Next.js 16 genera rutas sin hash para `/_next/static/chunks/app/*`.
 * Si el SW guarda esos ficheros, tras desplegar una nueva versión
 * el navegador puede seguir sirviendo código antiguo y provocar
 * `ChunkLoadError`. Forzamos `NetworkOnly` para esos assets y dejamos
 * el resto de la estrategia por defecto.
 */

const JS_ASSETS_REGEX = /\.(?:js)$/i;

const sanitizedDefaultCaching = (defaultRuntimeCaching as RuntimeCaching[]).filter(
  (entry) => !(entry.urlPattern instanceof RegExp && entry.urlPattern.source === JS_ASSETS_REGEX.source)
);

const appChunkBypass: RuntimeCaching[] = [
  /\/_next\/static\/chunks\/app\/.+\.js$/i,
  /\/_next\/static\/chunks\/pages\/.+\.js$/i,
  /\/_next\/static\/chunks\/webpack.+\.js$/i,
].map((pattern) => ({
  urlPattern: pattern,
  handler: 'NetworkOnly',
  options: {
    cacheName: 'next-router-chunks',
  },
}));

const runtimeCaching: RuntimeCaching[] = [...appChunkBypass, ...sanitizedDefaultCaching];

export default runtimeCaching;






