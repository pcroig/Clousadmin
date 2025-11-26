/**
 * Tests de integración: Validaciones complejas combinadas
 */

import { describe, expect, it } from 'vitest';

import { validateFile } from '@/lib/validaciones/file-upload';
import { extraerCodigoBanco, validarIBAN } from '@/lib/validaciones/iban';
import { obtenerInfoValidacionNIF, validarNIE, validarNIF } from '@/lib/validaciones/nif';

describe('Validaciones Complejas Integration', () => {
  describe('Flujo completo: Crear empleado', () => {
    it('should validate all employee fields in correct order', async () => {
      const datosEmpleado = {
        nombre: 'Juan',
        apellidos: 'Pérez',
        nif: '12345678Z',
        iban: 'ES9121000418450200051332',
      };

      // 1. Validar NIF
      const nifValido = validarNIF(datosEmpleado.nif);
      expect(nifValido).toBe(true);

      // 2. Obtener info detallada
      const infoNIF = obtenerInfoValidacionNIF(datosEmpleado.nif);
      expect(infoNIF.valido).toBe(true);
      expect(infoNIF.tipo).toBe('NIF');

      // 3. Validar IBAN
      const ibanValido = validarIBAN(datosEmpleado.iban);
      expect(ibanValido).toBe(true);

      // 4. Extraer banco
      const codigoBanco = extraerCodigoBanco(datosEmpleado.iban);
      expect(codigoBanco).toBe('2100'); // BBVA/CaixaBank
    });

    it('should detect and provide helpful error for invalid NIF', () => {
      const nifIncorrecto = '12345678A'; // Debería ser Z

      const valido = validarNIF(nifIncorrecto);
      expect(valido).toBe(false);

      const info = obtenerInfoValidacionNIF(nifIncorrecto);
      expect(info.valido).toBe(false);
      expect(info.letraCorrecta).toBe('Z');
      expect(info.mensaje).toContain('La letra correcta es: Z');
    });

    it('should handle NIE with proper validation', () => {
      const nie = 'X1234567L';

      expect(validarNIE(nie)).toBe(true);
      
      const info = obtenerInfoValidacionNIF(nie);
      expect(info.tipo).toBe('NIE');
      expect(info.valido).toBe(true);
    });
  });

  describe('Flujo: Subir documento con validaciones', () => {
    function createMockPDFFile(): File {
      const buffer = new ArrayBuffer(1024);
      const view = new Uint8Array(buffer);
      view[0] = 0x25; // %
      view[1] = 0x50; // P
      view[2] = 0x44; // D
      view[3] = 0x46; // F

      const blob = new Blob([buffer], { type: 'application/pdf' });
      return Object.assign(blob, {
        name: 'contrato.pdf',
        lastModified: Date.now(),
        webkitRelativePath: '',
        slice: (start = 0, end = 1024) => {
          return new Blob([buffer.slice(start, end)], { type: 'application/pdf' });
        },
      }) as File;
    }

    it('should validate file type, size and content', async () => {
      const file = createMockPDFFile();

      const result = await validateFile(file, {
        acceptedTypes: ['application/pdf'],
        maxSizeMB: 5,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Batch validation for multiple employees', () => {
    it('should validate multiple NIFs and IBANs', () => {
      const empleados = [
        { nif: '12345678Z', iban: 'ES9121000418450200051332' },
        { nif: 'X1234567L', iban: 'ES1000492352082414205416' },
        { nif: '87654321X', iban: 'ES7921000813610123456789' },
      ];

      const resultados = empleados.map(emp => ({
        nifValido: validarNIF(emp.nif) || validarNIE(emp.nif),
        ibanValido: validarIBAN(emp.iban),
      }));

      expect(resultados.every(r => r.nifValido)).toBe(true);
      expect(resultados.every(r => r.ibanValido)).toBe(true);
    });
  });
});
