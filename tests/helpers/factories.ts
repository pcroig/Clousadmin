/**
 * Data factories para tests
 * Crea datos de test reutilizables con valores por defecto sensibles
 */

import {
  EstadoAusencia,
  EstadoEmpleado,
  EstadoFichaje,
  TipoAusencia,
  TipoContrato,
  TipoFichajeEvento,
} from '@/lib/constants/enums';

let counter = 0;
const uniqueId = () => `test-${Date.now()}-${counter++}`;

/**
 * Factory para crear empresas de test
 */
export const empresaFactory = {
  build: (overrides: Partial<any> = {}) => ({
    id: uniqueId(),
    nombre: 'Empresa Test S.L.',
    cif: 'B12345678',
    direccion: 'Calle Test 123',
    telefono: '+34600123456',
    email: 'contacto@empresatest.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Factory para crear empleados de test
 */
export const empleadoFactory = {
  build: (empresaId: string, overrides: Partial<any> = {}) => ({
    id: uniqueId(),
    empresaId,
    nombre: 'Juan',
    apellidos: 'Pérez García',
    email: `juan.perez${counter}@test.com`,
    nif: `12345678${counter % 10}`,
    numeroSeguridadSocial: `281234567890`,
    telefono: '+34600123456',
    fechaNacimiento: new Date('1990-01-15'),
    fechaAlta: new Date('2023-01-01'),
    puesto: 'Desarrollador',
    departamento: 'Tecnología',
    estado: EstadoEmpleado.activo,
    tipoContrato: TipoContrato.indefinido,
    salarioBase: 35000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Factory para crear usuarios de test
 */
export const usuarioFactory = {
  build: (empleadoId: string, empresaId: string, overrides: Partial<any> = {}) => ({
    id: uniqueId(),
    empleadoId,
    empresaId,
    email: `usuario${counter}@test.com`,
    passwordHash: '$2a$10$dummyHashForTestingPurposesOnly',
    rol: 'empleado',
    activo: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Factory para crear fichajes de test
 */
export const fichajeFactory = {
  build: (empleadoId: string, empresaId: string, overrides: Partial<any> = {}) => ({
    id: uniqueId(),
    empleadoId,
    empresaId,
    fecha: new Date(),
    estado: EstadoFichaje.en_curso,
    horasTrabajadas: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Factory para crear eventos de fichaje
 */
export const fichajeEventoFactory = {
  entrada: (fichajeId: string, hora?: Date) => ({
    id: uniqueId(),
    fichajeId,
    tipo: TipoFichajeEvento.entrada,
    hora: hora || new Date(new Date().setHours(9, 0, 0, 0)),
    esManual: false,
    createdAt: new Date(),
  }),

  salida: (fichajeId: string, hora?: Date) => ({
    id: uniqueId(),
    fichajeId,
    tipo: TipoFichajeEvento.salida,
    hora: hora || new Date(new Date().setHours(18, 0, 0, 0)),
    esManual: false,
    createdAt: new Date(),
  }),

  pausa_inicio: (fichajeId: string, hora?: Date) => ({
    id: uniqueId(),
    fichajeId,
    tipo: TipoFichajeEvento.pausa_inicio,
    hora: hora || new Date(new Date().setHours(14, 0, 0, 0)),
    esManual: false,
    createdAt: new Date(),
  }),

  pausa_fin: (fichajeId: string, hora?: Date) => ({
    id: uniqueId(),
    fichajeId,
    tipo: TipoFichajeEvento.pausa_fin,
    hora: hora || new Date(new Date().setHours(15, 0, 0, 0)),
    esManual: false,
    createdAt: new Date(),
  }),
};

/**
 * Factory para crear ausencias de test
 */
export const ausenciaFactory = {
  build: (empleadoId: string, empresaId: string, overrides: Partial<any> = {}) => ({
    id: uniqueId(),
    empleadoId,
    empresaId,
    tipo: TipoAusencia.vacaciones,
    fechaInicio: new Date('2024-06-01'),
    fechaFin: new Date('2024-06-05'),
    dias: 5,
    estado: EstadoAusencia.pendiente,
    motivo: 'Vacaciones de verano',
    esMedioDia: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Factory para crear jornadas laborales
 */
export const jornadaFactory = {
  build: (empresaId: string, overrides: Partial<any> = {}) => ({
    id: uniqueId(),
    empresaId,
    nombre: 'Jornada Estándar',
    horasSemanales: 40,
    diasLaborables: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
    horaEntrada: '09:00',
    horaSalida: '18:00',
    horasPausa: 1,
    esDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Factory para crear equipos
 */
export const equipoFactory = {
  build: (empresaId: string, overrides: Partial<any> = {}) => ({
    id: uniqueId(),
    empresaId,
    nombre: 'Equipo Tech',
    descripcion: 'Equipo de tecnología',
    tipo: 'proyecto',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

/**
 * Helper para crear un setup completo de empresa con empleados
 */
export const fullSetupFactory = {
  /**
   * Crea empresa + empleado + usuario + jornada
   */
  buildComplete: () => {
    const empresa = empresaFactory.build();
    const empleado = empleadoFactory.build(empresa.id);
    const usuario = usuarioFactory.build(empleado.id, empresa.id);
    const jornada = jornadaFactory.build(empresa.id);

    return { empresa, empleado, usuario, jornada };
  },

  /**
   * Crea setup con manager y empleado
   */
  buildWithHierarchy: () => {
    const empresa = empresaFactory.build();
    const manager = empleadoFactory.build(empresa.id, {
      puesto: 'Manager',
      email: 'manager@test.com',
    });
    const empleado = empleadoFactory.build(empresa.id, {
      managerId: manager.id,
      email: 'empleado@test.com',
    });

    return { empresa, manager, empleado };
  },
};
