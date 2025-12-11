/**
 * Instrumentation para Next.js
 * Se ejecuta al iniciar el servidor
 */

/**
 * Verifica si la zona horaria es válida para el sistema de fichajes
 * Acepta variantes de UTC que Node expone en diferentes entornos
 */
function esZonaHorariaValida(tz: string): boolean {
  // Variantes de UTC que Node expone en diferentes entornos (Docker, macOS, Linux)
  const utcVariantes = [
    'UTC',
    'Etc/UTC',
    'GMT',
    'GMT+0',
    'GMT-0',
    'UTC+0',
    'UTC-0',
    'Etc/GMT',
    'Etc/Universal',
    'Universal',
  ];
  
  return utcVariantes.includes(tz) || tz === 'Europe/Madrid';
}

export async function register() {
  // ⚠️ VALIDACIÓN CRÍTICA: Zona horaria del servidor
  const tz = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🕐 ZONA HORARIA DEL SERVIDOR');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Zona horaria detectada: ${tz}`);
  console.log(`Variable TZ: ${process.env.TZ || '(no configurada)'}`);
  
  // FIX: Aceptar todas las variantes válidas de UTC
  if (!esZonaHorariaValida(tz)) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('⚠️  ERROR DE CONFIGURACIÓN: ZONA HORARIA');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Zona horaria actual: ${tz}`);
    console.error('Zona horaria requerida: UTC (o variantes) / Europe/Madrid');
    console.error('Variantes UTC aceptadas: UTC, Etc/UTC, GMT, GMT+0, etc.');
    console.error('');
    console.error('El sistema de fichajes puede fallar con otras zonas horarias.');
    console.error('Configura TZ=UTC en las variables de entorno:');
    console.error('  - En .env.local: TZ=UTC');
    console.error('  - En Docker: ENV TZ=UTC');
    console.error('  - En servidor: export TZ=UTC');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Zona horaria del servidor incorrecta: ${tz}. ` +
        'Configure TZ=UTC en las variables de entorno.'
      );
    } else {
      console.warn('⚠️  Modo desarrollo: continuando con advertencia');
    }
  } else {
    console.log(`✅ Zona horaria válida: ${tz}`);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // TEMPORARY FIX: Deshabilitar Sentry durante build para evitar error de prerendering en Next.js 16
  // Sentry causa que Next.js intente prerenderizar /_global-error con React Context
  // if (process.env.NODE_ENV === 'production') {
  //   await import('./sentry.server.config');
  // }
}
