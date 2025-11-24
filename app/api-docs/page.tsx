'use client';

import { useEffect } from 'react';

export default function ApiDocsPage() {
  useEffect(() => {
    // Cargar Swagger UI desde CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5.10.0/swagger-ui-bundle.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      window.SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          // @ts-ignore
          window.SwaggerUIBundle.presets.apis,
          // @ts-ignore
          window.SwaggerUIStandalonePreset
        ],
        plugins: [
          // @ts-ignore
          window.SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: 'StandaloneLayout',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
      });
    };
    document.body.appendChild(script);

    // Cargar standalone preset
    const standaloneScript = document.createElement('script');
    standaloneScript.src = 'https://unpkg.com/swagger-ui-dist@5.10.0/swagger-ui-standalone-preset.js';
    standaloneScript.async = true;
    document.body.appendChild(standaloneScript);

    // Cargar estilos
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.10.0/swagger-ui.css';
    document.head.appendChild(link);

    return () => {
      document.body.removeChild(script);
      document.body.removeChild(standaloneScript);
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Clousadmin API Documentation
          </h1>
          <p className="text-gray-600">
            Documentación interactiva de la API REST de Clousadmin. Explora los
            endpoints disponibles, prueba las peticiones y consulta los schemas.
          </p>
          <div className="mt-4 flex gap-4">
            <a
              href="/api/docs/download"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Descargar OpenAPI YAML
            </a>
            <a
              href="/docs/api"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Ver documentación completa
            </a>
          </div>
        </div>
        <div id="swagger-ui" />
      </div>
    </div>
  );
}
