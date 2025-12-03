import { withSentryConfig } from "@sentry/nextjs";
import withPWAInit from "next-pwa";

import runtimeCaching from "./config/pwa-runtime-caching";
import "./lib/env";

import type { NextConfig } from "next";

const storageEndpointHostname = (() => {
  const endpoint = process.env.STORAGE_ENDPOINT;
  if (!endpoint) {
    return undefined;
  }
  try {
    const url = new URL(endpoint);
    return url.hostname;
  } catch (error) {
    console.warn('[next.config] STORAGE_ENDPOINT no es una URL válida:', error);
    return undefined;
  }
})();

const remotePatterns = [
  storageEndpointHostname && {
    protocol: 'https',
    hostname: storageEndpointHostname,
  },
  {
    protocol: 'https',
    hostname: '**.your-objectstorage.com', // Hetzner Object Storage (wildcard)
  },
  {
    protocol: 'https',
    hostname: '**.fsn1.your-objectstorage.com', // Hetzner Falkenstein
  },
  {
    protocol: 'https',
    hostname: '**.nbg1.your-objectstorage.com', // Hetzner Nuremberg
  },
  {
    protocol: 'https',
    hostname: '**.hel1.your-objectstorage.com', // Hetzner Helsinki
  },
].filter(Boolean) as NonNullable<NextConfig['images']>['remotePatterns'];

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching,
  buildExcludes: [/middleware-manifest\.json$/],
  fallbacks: {
    document: "/offline",
  },
  // Nota: en desarrollo el SW se desactiva para evitar inconsistencias de cache.
});

const nextConfig: NextConfig = {
  // TypeScript check - Activado para garantizar calidad del código
  typescript: {
    ignoreBuildErrors: false,
  },

  // Experimental features
  experimental: {
    // Server actions habilitadas (para forms y mutations)
    serverActions: {
      bodySizeLimit: '10mb', // Permitir uploads de hasta 10MB
    },
  },

  // Configuración de imágenes (para Hetzner Object Storage y avatares)
  images: {
    remotePatterns,
    formats: ['image/avif', 'image/webp'],
  },

  // Excluir librerías de servidor del bundle del cliente
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // BullMQ y otras librerías de servidor no deben compilarse en el cliente
      config.resolve.fallback = {
        ...config.resolve.fallback,
        bullmq: false,
        ioredis: false,
        'node:perf_hooks': false,
        perf_hooks: false,
      };
    }
    return config;
  },

  // Headers de seguridad
  async headers() {
    const commonSecurityHeaders: Array<{ key: string; value: string }> = [
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
    ];

    const cspHeader = {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://browser.sentry-cdn.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.sentry.io",
        "worker-src 'self'",
        "frame-ancestors 'self'",
      ].join('; '),
    };

    const previewHeaders = [...commonSecurityHeaders];

    return [
      {
        // Previews de documentos (ej. /api/documentos/123/preview)
        source: '/api/documentos/:path*/preview',
        headers: previewHeaders,
      },
      {
        // Previews de plantillas (ej. /api/plantillas/123/preview)
        source: '/api/plantillas/:path*/preview',
        headers: previewHeaders,
      },
      {
        source: '/(.*)',
        headers: [...commonSecurityHeaders, cspHeader],
      },
    ];
  },
};

const sentryBuildOptions = {
  silent: true,
  tunnelRoute: '/monitoring',
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
};

export default withSentryConfig(withPWA(nextConfig), sentryBuildOptions);
