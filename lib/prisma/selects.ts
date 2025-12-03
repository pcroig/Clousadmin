import { Prisma } from '@prisma/client';

const empleadoBaseSelect: Prisma.empleadosSelect = {
  id: true,
  nombre: true,
  apellidos: true,
  email: true,
  activo: true,
  fotoUrl: true,
};

export const empleadoSelectBasico = Prisma.validator<Prisma.empleadosSelect>()({
  ...empleadoBaseSelect,
});

export const empleadoSelectConUsuario = Prisma.validator<Prisma.empleadosSelect>()({
  ...empleadoBaseSelect,
  usuario: {
    select: {
      id: true,
      email: true,
      rol: true,
      nombre: true,
      apellidos: true,
      activo: true,
    },
  },
});

export const empleadoSelectConPuesto = Prisma.validator<Prisma.empleadosSelect>()({
  ...empleadoBaseSelect,
  puestoRelacion: {
    select: {
      id: true,
      nombre: true,
    },
  },
});

export const empleadoSelectDashboard = Prisma.validator<Prisma.empleadosSelect>()({
  ...empleadoBaseSelect,
  manager: {
    select: {
      id: true,
      nombre: true,
      apellidos: true,
    },
  },
  jornada: {
    select: {
      id: true,
      nombre: true,
      horasSemanales: true,
    },
  },
  equipos: {
    include: {
      equipo: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
  puestoRelacion: {
    select: {
      id: true,
      nombre: true,
    },
  },
});

export const empleadoSelectListado = Prisma.validator<Prisma.empleadosSelect>()({
  ...empleadoBaseSelect,
  onboardingCompletado: true,
  onboardingCompletadoEn: true,
  usuario: {
    select: {
      id: true,
      email: true,
      rol: true,
      nombre: true,
      apellidos: true,
    },
  },
  manager: {
    select: {
      id: true,
      nombre: true,
      apellidos: true,
    },
  },
  puestoRelacion: {
    select: {
      id: true,
      nombre: true,
    },
  },
  equipos: {
    include: {
      equipo: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
});

export const jornadaSelectResumida = Prisma.validator<Prisma.jornadasSelect>()({
  id: true,
  nombre: true,
  horasSemanales: true,
});

export const jornadaSelectCompleta = Prisma.validator<Prisma.jornadasSelect>()({
  ...jornadaSelectResumida,
  config: true,
});

const fichajeBaseSelect: Prisma.fichajesSelect = {
  id: true,
  empleadoId: true,
  fecha: true,
  estado: true,
  horasTrabajadas: true,
  horasEnPausa: true,
};

export const fichajeSelectBasico = Prisma.validator<Prisma.fichajesSelect>()({
  ...fichajeBaseSelect,
});

export const fichajeSelectConEventos = Prisma.validator<Prisma.fichajesSelect>()({
  ...fichajeBaseSelect,
  eventos: {
    orderBy: {
      hora: 'asc',
    },
    select: {
      id: true,
      tipo: true,
      hora: true,
      ubicacion: true,
    },
  },
});

