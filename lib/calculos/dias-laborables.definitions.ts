// ========================================
// Configuración base de Días Laborables
// ========================================
// Este módulo es seguro para ambos entornos (cliente y servidor).
// Define únicamente tipos y valores por defecto para evitar importar
// dependencias de Prisma en componentes cliente.

export interface DiasLaborables {
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sabado: boolean;
  domingo: boolean;
}

export const DIAS_LABORABLES_DEFAULT: DiasLaborables = {
  lunes: true,
  martes: true,
  miercoles: true,
  jueves: true,
  viernes: true,
  sabado: false,
  domingo: false,
};



