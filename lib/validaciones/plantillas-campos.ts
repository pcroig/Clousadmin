import type { CamposRequeridos } from '@/lib/onboarding-config';

type GrupoClave = keyof CamposRequeridos;

export type DependenciaVariable = {
  variable: string;
  grupo: GrupoClave;
  campo: string;
  label: string;
};

const DEPENDENCIAS_VARIABLES: DependenciaVariable[] = [
  { variable: 'empleado_nif', grupo: 'datos_personales', campo: 'nif', label: 'NIF/NIE' },
  { variable: 'empleado_nss', grupo: 'datos_personales', campo: 'nss', label: 'Nº Seguridad Social' },
  { variable: 'empleado_telefono', grupo: 'datos_personales', campo: 'telefono', label: 'Teléfono' },
  {
    variable: 'empleado_direccion_calle',
    grupo: 'datos_personales',
    campo: 'direccionCalle',
    label: 'Dirección - Calle',
  },
  {
    variable: 'empleado_direccion_numero',
    grupo: 'datos_personales',
    campo: 'direccionNumero',
    label: 'Dirección - Número',
  },
  {
    variable: 'empleado_direccion_piso',
    grupo: 'datos_personales',
    campo: 'direccionPiso',
    label: 'Dirección - Piso',
  },
  {
    variable: 'empleado_codigo_postal',
    grupo: 'datos_personales',
    campo: 'codigoPostal',
    label: 'Código Postal',
  },
  { variable: 'empleado_ciudad', grupo: 'datos_personales', campo: 'ciudad', label: 'Ciudad' },
  {
    variable: 'empleado_provincia',
    grupo: 'datos_personales',
    campo: 'direccionProvincia',
    label: 'Provincia',
  },
  {
    variable: 'empleado_estado_civil',
    grupo: 'datos_personales',
    campo: 'estadoCivil',
    label: 'Estado civil',
  },
  {
    variable: 'empleado_numero_hijos',
    grupo: 'datos_personales',
    campo: 'numeroHijos',
    label: 'Número de hijos',
  },
  { variable: 'empleado_iban', grupo: 'datos_bancarios', campo: 'iban', label: 'IBAN' },
  {
    variable: 'empleado_bic',
    grupo: 'datos_bancarios',
    campo: 'bic',
    label: 'BIC/SWIFT',
  },
];

const VARIABLE_MAP = new Map<string, DependenciaVariable>(
  DEPENDENCIAS_VARIABLES.map((dep) => [dep.variable, dep])
);

export function obtenerDependenciasDeVariables(variables: string[]): DependenciaVariable[] {
  return variables
    .map((variable) => VARIABLE_MAP.get(variable))
    .filter((dep): dep is DependenciaVariable => Boolean(dep));
}

export function obtenerCamposFaltantesDePlantilla(
  variables: string[],
  camposRequeridos: CamposRequeridos
): string[] {
  const dependencias = obtenerDependenciasDeVariables(variables);
  const faltantes: string[] = [];

  for (const dependencia of dependencias) {
    const grupo = camposRequeridos[dependencia.grupo] as Record<string, boolean> | undefined;
    if (!grupo) continue;

    if (!grupo[dependencia.campo]) {
      faltantes.push(dependencia.label);
    }
  }

  return faltantes;
}

export interface PlantillaValidacionInput {
  id: string;
  nombre: string;
  variablesUsadas: string[];
}

export interface PlantillaValidacionResultado {
  plantillaId: string;
  plantillaNombre: string;
  camposFaltantes: string[];
}

export function validarPlantillasContraCampos(
  plantillas: PlantillaValidacionInput[],
  camposRequeridos: CamposRequeridos
): PlantillaValidacionResultado[] {
  return plantillas
    .map((plantilla) => {
      const camposFaltantes = obtenerCamposFaltantesDePlantilla(
        plantilla.variablesUsadas,
        camposRequeridos
      );
      return {
        plantillaId: plantilla.id,
        plantillaNombre: plantilla.nombre,
        camposFaltantes,
      };
    })
    .filter((resultado) => resultado.camposFaltantes.length > 0);
}

