/**
 * Tipos compartidos para APIs de firma digital
 */

export type MotivoNoSeleccion = 'sin_carpeta' | 'carpeta_personal' | 'carpeta_centralizada';
export type MotivoSeleccion = 'carpeta_compartida';

export interface CarpetaCentralizada {
  id: string;
  nombre: string;
}

export interface InfoCarpetaOrigenSinSeleccion {
  necesitaSeleccion: false;
  motivo: MotivoNoSeleccion;
  carpeta?: {
    id: string;
    nombre: string;
  };
}

export interface InfoCarpetaOrigenConSeleccion {
  necesitaSeleccion: true;
  motivo: MotivoSeleccion;
  carpeta: {
    id: string;
    nombre: string;
  };
  carpetasCentralizadas: CarpetaCentralizada[];
}

export type InfoCarpetaOrigen =
  | InfoCarpetaOrigenSinSeleccion
  | InfoCarpetaOrigenConSeleccion;

export interface CrearCarpetaCentralizadaResponse {
  success: true;
  carpeta: CarpetaCentralizada;
  existente: boolean;
}
