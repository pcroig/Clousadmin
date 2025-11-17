import { strict as assert } from 'node:assert';

import {
  validarEmpleado,
  type EmpleadoDetectado,
} from '@/lib/ia/procesar-excel-empleados';

const baseEmpleado: EmpleadoDetectado = {
  nombre: 'Ana',
  apellidos: 'García',
  email: 'ana@example.com',
  nif: '12345678Z',
  telefono: null,
  fechaNacimiento: null,
  puesto: 'Desarrolladora',
  equipo: 'Engineering',
  manager: 'Laura',
  fechaAlta: '2024-01-01',
  tipoContrato: 'indefinido',
  salarioBrutoAnual: 30000,
  salarioBrutoMensual: 2500,
  direccion: null,
  direccionCalle: null,
  direccionNumero: null,
  direccionPiso: null,
  direccionProvincia: null,
  ciudad: null,
  codigoPostal: null,
};

function testEmpleadoValido() {
  const resultado = validarEmpleado(baseEmpleado);
  assert.equal(resultado.valido, true);
  assert.deepEqual(resultado.errores, []);
}

function testEmpleadoInvalido() {
  const invalido: EmpleadoDetectado = {
    ...baseEmpleado,
    nombre: null,
    apellidos: '',
    email: 'correo-invalid',
  };
  const resultado = validarEmpleado(invalido);
  assert.equal(resultado.valido, false);
  assert.ok(resultado.errores.includes('Falta el nombre'));
  assert.ok(resultado.errores.includes('Faltan los apellidos'));
  assert.ok(resultado.errores.includes('Email inválido'));
}

testEmpleadoValido();
testEmpleadoInvalido();


