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
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevenir clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevenir MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Política de referrer
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // HSTS - Solo HTTPS (solo en producción)
          // Comentado para desarrollo local (usar en producción)
          // {
          //   key: 'Strict-Transport-Security',
          //   value: 'max-age=31536000; includeSubDomains; preload',
          // },
          // X-XSS-Protection (legacy, pero algunos browsers lo usan)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Permissions Policy - Deshabilitar features no usados
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy - Configuración conservadora
          // Ajustar según necesidades de la app
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval necesario para Next.js dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
