/**
 * Sistema de Plantillas de Documentos
 * Exportación centralizada de todas las funcionalidades
 */

// Tipos
export * from './tipos';

// Constantes
export {
  VARIABLES_DISPONIBLES,
  QUICK_MAPPINGS,
  CAMPOS_ENCRIPTADOS,
  FORMATO_FECHA_ES,
  FORMATO_FECHA_LARGO_ES,
  EXTENSIONES_SOPORTADAS,
  LIMITES,
} from './constantes';

// Resolución de variables con IA
export {
  getVariableMapping,
  resolverVariables,
  limpiarCacheVariables,
} from './ia-resolver';

// Generación de documentos
export {
  extraerVariablesDePlantilla,
  generarDocumentoDesdePlantilla,
  generarDocumentosMultiples,
} from './generar-documento';

// PDFs rellenables
export {
  extraerCamposPDF,
  extraerDatosPDFConVision,
  generarDocumentoDesdePDFRellenable,
} from './pdf-rellenable';

// Utilidades de sanitización
export {
  sanitizarNombreArchivo,
  formatearFecha,
  formatearFechaLarga,
  formatearMoneda,
  formatearNumero,
  construirDireccionCompleta,
  capitalizarPalabras,
  numeroAPalabras,
  calcularEdad,
  calcularDuracionMeses,
  formatearTipoContrato,
  formatearTipoAusencia,
  esVariableValida,
  extraerVariablesDeTexto,
} from './sanitizar';

// Sistema de colas (background jobs)
export {
  documentosQueue,
  documentosQueueEvents,
  documentosWorker,
  agregarJobGeneracion,
  obtenerEstadoJob,
  cancelarJob,
  limpiarJobsAntiguos,
  obtenerEstadisticasCola,
  cerrarQueue,
} from './queue';
