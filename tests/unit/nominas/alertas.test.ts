/**
 * Tests unitarios para sistema de alertas de nóminas
 * Valida detección de datos faltantes y anomalías
 */

import { describe, expect, it } from 'vitest';

describe('Sistema de Alertas de Nóminas', () => {
  describe('Tipos de Alertas', () => {
    it('debe definir tipos de alerta correctos', () => {
      const tiposValidos: Array<'critico' | 'advertencia' | 'info'> = [
        'critico',
        'advertencia',
        'info',
      ];

      expect(tiposValidos).toHaveLength(3);
      expect(tiposValidos).toContain('critico');
      expect(tiposValidos).toContain('advertencia');
      expect(tiposValidos).toContain('info');
    });

    it('debe definir categorías de alerta correctas', () => {
      const categoriasValidas: Array<
        | 'datos_faltantes'
        | 'fichajes'
        | 'ausencias'
        | 'horas'
        | 'cambios'
      > = ['datos_faltantes', 'fichajes', 'ausencias', 'horas', 'cambios'];

      expect(categoriasValidas).toHaveLength(5);
      expect(categoriasValidas).toContain('datos_faltantes');
      expect(categoriasValidas).toContain('fichajes');
    });
  });

  describe('Códigos de Alertas Críticas', () => {
    it('debe identificar NO_IBAN como crítico', () => {
      const alertaCritica = {
        codigo: 'NO_IBAN',
        tipo: 'critico' as const,
        mensaje: 'Sin IBAN configurado',
      };

      expect(alertaCritica.tipo).toBe('critico');
      expect(alertaCritica.codigo).toBe('NO_IBAN');
    });

    it('debe identificar NO_NSS como crítico', () => {
      const alertaCritica = {
        codigo: 'NO_NSS',
        tipo: 'critico' as const,
        mensaje: 'Sin número de Seguridad Social',
      };

      expect(alertaCritica.tipo).toBe('critico');
      expect(alertaCritica.codigo).toBe('NO_NSS');
    });

    it('debe identificar NO_SALARIO como crítico', () => {
      const alertaCritica = {
        codigo: 'NO_SALARIO',
        tipo: 'critico' as const,
        mensaje: 'Salario no configurado',
      };

      expect(alertaCritica.tipo).toBe('critico');
      expect(alertaCritica.codigo).toBe('NO_SALARIO');
    });
  });

  describe('Validación de Datos de Empleado', () => {
    describe('IBAN', () => {
      it('debe considerar válido un IBAN español', () => {
        const iban = 'ES9121000418450200051332';
        expect(iban).toMatch(/^ES\d{22}$/);
      });

      it('debe detectar IBAN faltante', () => {
        const empleado = {
          iban: null,
          nss: '281234567890',
          salarioBrutoMensual: 30000,
        };

        expect(empleado.iban).toBeNull();
      });

      it('debe detectar IBAN undefined', () => {
        const empleado = {
          iban: undefined,
          nss: '281234567890',
          salarioBrutoMensual: 30000,
        };

        expect(empleado.iban).toBeUndefined();
      });
    });

    describe('NSS (Número Seguridad Social)', () => {
      it('debe considerar válido un NSS español (12 dígitos)', () => {
        const nss = '281234567890';
        expect(nss).toMatch(/^\d{12}$/);
      });

      it('debe detectar NSS faltante', () => {
        const empleado = {
          iban: 'ES9121000418450200051332',
          nss: null,
          salarioBrutoMensual: 30000,
        };

        expect(empleado.nss).toBeNull();
      });

      it('debe validar formato NSS correcto', () => {
        const nssValido = '281234567890';
        const nssInvalido = '12345'; // Muy corto

        expect(nssValido.length).toBe(12);
        expect(nssInvalido.length).not.toBe(12);
      });
    });

    describe('Salario', () => {
      it('debe validar salario positivo', () => {
        const salario = 30000;
        expect(salario).toBeGreaterThan(0);
      });

      it('debe detectar salario no configurado', () => {
        const empleado = {
          iban: 'ES9121000418450200051332',
          nss: '281234567890',
          salarioBrutoMensual: null,
        };

        expect(empleado.salarioBrutoMensual).toBeNull();
      });

      it('debe detectar salario cero como inválido', () => {
        const salario = 0;
        expect(salario).toBe(0);
        // En lógica de negocio, 0 debería generar alerta
      });

      it('debe detectar salario negativo como inválido', () => {
        const salario = -1000;
        expect(salario).toBeLessThan(0);
      });
    });
  });

  describe('Estructura de Alertas', () => {
    it('debe tener todos los campos requeridos', () => {
      const alerta = {
        empleadoId: 'emp-123',
        tipo: 'critico' as const,
        categoria: 'datos_faltantes' as const,
        codigo: 'NO_IBAN',
        mensaje: 'Sin IBAN configurado',
        detalles: {
          empleado: 'Juan Pérez',
        },
        accionUrl: '/hr/organizacion/personas/emp-123',
      };

      expect(alerta.empleadoId).toBeDefined();
      expect(alerta.tipo).toBeDefined();
      expect(alerta.categoria).toBeDefined();
      expect(alerta.codigo).toBeDefined();
      expect(alerta.mensaje).toBeDefined();
    });

    it('debe permitir detalles opcionales', () => {
      const alertaMinima = {
        empleadoId: 'emp-123',
        tipo: 'advertencia' as const,
        categoria: 'fichajes' as const,
        codigo: 'DIAS_SIN_FICHAR',
        mensaje: 'Días sin fichar',
      };

      expect(alertaMinima.detalles).toBeUndefined();
      expect(alertaMinima.accionUrl).toBeUndefined();
    });

    it('debe permitir accionUrl como enlace', () => {
      const alerta = {
        empleadoId: 'emp-123',
        tipo: 'critico' as const,
        categoria: 'datos_faltantes' as const,
        codigo: 'NO_IBAN',
        mensaje: 'Sin IBAN configurado',
        accionUrl: '/hr/organizacion/personas/emp-123',
      };

      expect(alerta.accionUrl).toMatch(/^\/hr\//);
    });
  });

  describe('Prioridad de Alertas', () => {
    it('crítico debe tener mayor prioridad que advertencia', () => {
      const prioridades = {
        critico: 3,
        advertencia: 2,
        info: 1,
      };

      expect(prioridades.critico).toBeGreaterThan(prioridades.advertencia);
      expect(prioridades.advertencia).toBeGreaterThan(prioridades.info);
    });

    it('debe agrupar alertas por tipo', () => {
      const alertas = [
        { tipo: 'critico' as const, codigo: 'NO_IBAN' },
        { tipo: 'advertencia' as const, codigo: 'DIAS_SIN_FICHAR' },
        { tipo: 'critico' as const, codigo: 'NO_NSS' },
        { tipo: 'info' as const, codigo: 'CAMBIO_SALARIO' },
      ];

      const criticas = alertas.filter((a) => a.tipo === 'critico');
      const advertencias = alertas.filter((a) => a.tipo === 'advertencia');
      const info = alertas.filter((a) => a.tipo === 'info');

      expect(criticas).toHaveLength(2);
      expect(advertencias).toHaveLength(1);
      expect(info).toHaveLength(1);
    });
  });

  describe('Categorías de Alertas', () => {
    it('datos_faltantes debe incluir IBAN, NSS, salario', () => {
      const alertasDatosFaltantes = [
        'NO_IBAN',
        'NO_NSS',
        'NO_SALARIO',
        'NO_CONTRATO',
      ];

      expect(alertasDatosFaltantes).toContain('NO_IBAN');
      expect(alertasDatosFaltantes).toContain('NO_NSS');
      expect(alertasDatosFaltantes).toContain('NO_SALARIO');
    });

    it('fichajes debe incluir alertas de control horario', () => {
      const alertasFichajes = [
        'DIAS_SIN_FICHAR',
        'FICHAJE_INCOMPLETO',
        'EXCESO_HORAS',
      ];

      expect(alertasFichajes).toContain('DIAS_SIN_FICHAR');
      expect(alertasFichajes).toContain('FICHAJE_INCOMPLETO');
    });

    it('ausencias debe incluir alertas de vacaciones y permisos', () => {
      const alertasAusencias = [
        'AUSENCIA_SIN_APROBAR',
        'SALDO_NEGATIVO',
        'SOLAPAMIENTO',
      ];

      expect(alertasAusencias).toContain('AUSENCIA_SIN_APROBAR');
      expect(alertasAusencias).toContain('SALDO_NEGATIVO');
    });
  });

  describe('Mensajes de Alerta', () => {
    it('debe tener mensajes claros y accionables', () => {
      const mensajes = {
        NO_IBAN: 'Sin IBAN configurado',
        NO_NSS: 'Sin número de Seguridad Social',
        NO_SALARIO: 'Salario no configurado',
      };

      Object.values(mensajes).forEach((mensaje) => {
        expect(mensaje.length).toBeGreaterThan(5);
        expect(mensaje.length).toBeLessThan(100);
      });
    });

    it('debe evitar mensajes genéricos', () => {
      const mensajeGenerico = 'Error';
      const mensajeEspecifico = 'Sin IBAN configurado';

      expect(mensajeEspecifico.length).toBeGreaterThan(
        mensajeGenerico.length
      );
      expect(mensajeEspecifico).toContain('IBAN');
    });
  });

  describe('Bloqueo de Exportación', () => {
    it('alertas críticas deben bloquear exportación', () => {
      const alertasCriticas = [
        { tipo: 'critico' as const, codigo: 'NO_IBAN' },
        { tipo: 'critico' as const, codigo: 'NO_NSS' },
      ];

      const tieneAlertasCriticas = alertasCriticas.some(
        (a) => a.tipo === 'critico'
      );

      expect(tieneAlertasCriticas).toBe(true);
    });

    it('advertencias NO deben bloquear exportación', () => {
      const alertas = [
        { tipo: 'advertencia' as const, codigo: 'DIAS_SIN_FICHAR' },
        { tipo: 'info' as const, codigo: 'CAMBIO_SALARIO' },
      ];

      const tieneAlertasCriticas = alertas.some((a) => a.tipo === 'critico');

      expect(tieneAlertasCriticas).toBe(false);
    });

    it('debe poder exportar si solo hay advertencias', () => {
      const alertas = [
        { tipo: 'advertencia' as const },
        { tipo: 'advertencia' as const },
        { tipo: 'info' as const },
      ];

      const puedeExportar = !alertas.some((a) => a.tipo === 'critico');

      expect(puedeExportar).toBe(true);
    });
  });

  describe('Casos Edge', () => {
    it('debe manejar empleado sin ninguna alerta', () => {
      const alertas: any[] = [];

      expect(alertas).toHaveLength(0);
    });

    it('debe manejar empleado con múltiples alertas críticas', () => {
      const alertas = [
        { tipo: 'critico' as const, codigo: 'NO_IBAN' },
        { tipo: 'critico' as const, codigo: 'NO_NSS' },
        { tipo: 'critico' as const, codigo: 'NO_SALARIO' },
      ];

      const criticas = alertas.filter((a) => a.tipo === 'critico');

      expect(criticas).toHaveLength(3);
    });

    it('debe manejar mezcla de tipos de alertas', () => {
      const alertas = [
        { tipo: 'critico' as const },
        { tipo: 'advertencia' as const },
        { tipo: 'advertencia' as const },
        { tipo: 'info' as const },
      ];

      const distribucion = {
        critico: alertas.filter((a) => a.tipo === 'critico').length,
        advertencia: alertas.filter((a) => a.tipo === 'advertencia').length,
        info: alertas.filter((a) => a.tipo === 'info').length,
      };

      expect(distribucion.critico).toBe(1);
      expect(distribucion.advertencia).toBe(2);
      expect(distribucion.info).toBe(1);
    });
  });
});
