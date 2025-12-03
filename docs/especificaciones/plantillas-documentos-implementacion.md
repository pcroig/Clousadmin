# 🛠️ Plantillas de Documentos - Guía de Implementación Técnica

**Proyecto**: Clousadmin  
**Complemento de**: `plantillas-documentos.md`  
**Fecha**: 12 de Noviembre 2025

---

## 📋 Índice

1. [Setup Inicial](#1-setup-inicial)
2. [Migración de Base de Datos](#2-migración-de-base-de-datos)
3. [Implementación de Utilidades](#3-implementación-de-utilidades)
4. [Implementación de APIs](#4-implementación-de-apis)
5. [Componentes UI](#5-componentes-ui)
6. [Seeders de Plantillas Oficiales](#6-seeders-de-plantillas-oficiales)
7. [Ejemplos de Uso](#7-ejemplos-de-uso)

---

## 1. Setup Inicial

### 1.1 Instalación de Dependencias

```bash
# Librerías principales
npm install docxtemplater pizzip

# TypeScript types
npm install --save-dev @types/docxtemplater

# Para PDFs (Fase 2 - Opcional por ahora)
# npm install pdf-lib @pdf-lib/fontkit
```

### 1.2 Verificar Instalación

Crear script de prueba `scripts/test-docxtemplater.ts`:

```typescript
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { readFileSync, writeFileSync } from 'fs';

// Test básico de docxtemplater
const content = readFileSync('test-template.docx', 'binary');
const zip = new PizZip(content);
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
});

doc.setData({
  nombre: 'Juan Pérez',
  fecha: '12/11/2025',
});

doc.render();

const buf = doc.getZip().generate({
  type: 'nodebuffer',
  compression: 'DEFLATE',
});

writeFileSync('output.docx', buf);
console.log('✅ docxtemplater funciona correctamente!');
```

Ejecutar:
```bash
npx tsx scripts/test-docxtemplater.ts
```

---

## 2. Migración de Base de Datos

### 2.1 Actualizar `prisma/schema.prisma`

**Agregar nuevos modelos**:

```prisma
/// PlantillaDocumento - Template storage and metadata
model PlantillaDocumento {
  id        String  @id @default(uuid())
  empresaId String? // NULL = plantilla oficial, NOT NULL = personalizada
  
  nombre      String  @db.VarChar(255)
  descripcion String? @db.Text
  categoria   String  @db.VarChar(100) // 'contrato', 'fiscal', 'ausencia', 'personal'
  
  tipo    String @db.VarChar(50) // 'oficial' | 'personalizada'
  formato String @db.VarChar(20) // 'docx' | 'pdf_rellenable'
  
  s3Key    String @unique @db.Text
  s3Bucket String @db.VarChar(255)
  
  variablesUsadas Json @default("[]")
  
  activa               Boolean @default(true)
  esOficial            Boolean @default(false)
  requiereContrato     Boolean @default(false)
  requiereFirma        Boolean @default(false)
  carpetaDestinoDefault String? @db.VarChar(50)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  empresa             Empresa?            @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  documentosGenerados DocumentoGenerado[]
  
  @@index([empresaId])
  @@index([tipo])
  @@index([categoria])
  @@index([activa])
  @@map("plantillas_documentos")
}

/// DocumentoGenerado - Documents generated from templates
model DocumentoGenerado {
  id          String @id @default(uuid())
  empresaId   String
  empleadoId  String
  plantillaId String
  documentoId String @unique
  
  generadoPor String?
  generadoEn  DateTime @default(now())
  
  variablesUtilizadas Json
  
  notificado Boolean @default(false)
  visto      Boolean @default(false)
  vistoEn    DateTime?
  
  requiereFirma Boolean   @default(false)
  firmado       Boolean   @default(false)
  firmadoEn     DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  empresa   Empresa            @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  empleado  Empleado           @relation(fields: [empleadoId], references: [id], onDelete: Cascade)
  plantilla PlantillaDocumento @relation(fields: [plantillaId], references: [id], onDelete: Cascade)
  documento Documento          @relation(fields: [documentoId], references: [id], onDelete: Cascade)
  
  @@index([empresaId])
  @@index([empleadoId])
  @@index([plantillaId])
  @@index([documentoId])
  @@index([generadoEn])
  @@index([firmado])
  @@map("documentos_generados")
}
```

**Actualizar modelos existentes**:

```prisma
model Documento {
  // ... campos existentes ...
  
  generadoDesde DocumentoGenerado?
  
  // ... resto de relaciones ...
}

model Empresa {
  // ... campos existentes ...
  
  plantillasDocumentos PlantillaDocumento[]
  documentosGenerados  DocumentoGenerado[]
  
  // ... resto de relaciones ...
}

model Empleado {
  // ... campos existentes ...
  
  documentosGenerados DocumentoGenerado[]
  
  // ... resto de relaciones ...
}
```

### 2.2 Ejecutar Migración

```bash
# Crear migración
npx prisma migrate dev --name add_plantillas_documentos

# Aplicar migración en producción
npx prisma migrate deploy

# Generar cliente Prisma
npx prisma generate
```

---

## 3. Implementación de Utilidades

### 3.0 `lib/plantillas/docx-to-pdf.ts`

**Regla de negocio clave:** todos los documentos que se visualizan o se firman en Clousadmin deben estar en PDF, aunque la fuente original sea un DOCX.  
Para garantizarlo existe una capa única de conversión (`lib/plantillas/docx-to-pdf.ts`) que:

- Descarga el DOCX (o recibe el buffer en memoria), ejecuta LibreOffice (`soffice --headless`) y genera un PDF fiel.
- Permite definir `LIBREOFFICE_PATH` cuando el binario no está en el `PATH`.
- Proporciona dos funciones:
  - `convertDocxBufferToPdf(buffer, options?)`: retorna un `Buffer` con el PDF listo para guardarse.
  - `convertDocxFromS3ToPdf(docxS3Key, options?)`: reutiliza la anterior, sube el PDF a S3 y devuelve la nueva `s3Key`.
- Es la **única** forma admitida de obtener un PDF firmable desde una plantilla DOCX y se debe invocar inmediatamente después de renderizar el DOCX con `docxtemplater`.

> Nota: la firma digital (SolicitudFirma/Firma) siempre usa el PDF generado por esta capa; el DOCX se puede conservar como referencia (metadatos, auditoría) pero no se expone para firma.

### 3.1 `lib/plantillas/tipos.ts`

```typescript
/**
 * Tipos y interfaces para plantillas de documentos
 */

export interface VariableDefinicion {
  key: string;
  label: string;
  tipo: 'string' | 'number' | 'date' | 'boolean';
  ejemplo: string;
  categoria: 'empleado' | 'empresa' | 'contrato' | 'jornada' | 'manager' | 'sistema';
  requerido?: boolean;
  encriptado?: boolean;
}

export interface VariablesResueltas {
  resueltas: Record<string, string>;
  faltantes: string[];
}

export interface ConfiguracionGeneracion {
  nombreDocumento?: string; // Template para nombre: "Contrato_{{empleado_apellidos}}_{{fecha}}"
  carpetaDestino?: string;
  notificar: boolean;
  requiereFirma?: boolean;
}

export interface ResultadoGeneracion {
  empleadoId: string;
  empleadoNombre: string;
  documentoId?: string;
  success: boolean;
  error?: string;
}

export interface ResumenGeneracion {
  totalEmpleados: number;
  generadosExitosos: number;
  fallidos: number;
  documentos: ResultadoGeneracion[];
}
```

### 3.2 `lib/plantillas/constantes.ts`

```typescript
/**
 * Constantes y definiciones de variables disponibles
 */
import { VariableDefinicion } from './tipos';

export const VARIABLES_DISPONIBLES: VariableDefinicion[] = [
  // Empleado - Datos personales
  {
    key: 'empleado_nombre',
    label: 'Nombre del empleado',
    tipo: 'string',
    ejemplo: 'Juan',
    categoria: 'empleado',
    requerido: true,
  },
  {
    key: 'empleado_apellidos',
    label: 'Apellidos del empleado',
    tipo: 'string',
    ejemplo: 'Pérez García',
    categoria: 'empleado',
    requerido: true,
  },
  {
    key: 'empleado_email',
    label: 'Email del empleado',
    tipo: 'string',
    ejemplo: 'juan.perez@empresa.com',
    categoria: 'empleado',
  },
  {
    key: 'empleado_nif',
    label: 'NIF/NIE',
    tipo: 'string',
    ejemplo: '12345678A',
    categoria: 'empleado',
    encriptado: true,
  },
  {
    key: 'empleado_nss',
    label: 'Número Seguridad Social',
    tipo: 'string',
    ejemplo: '123456789012',
    categoria: 'empleado',
    encriptado: true,
  },
  {
    key: 'empleado_fecha_nacimiento',
    label: 'Fecha de nacimiento',
    tipo: 'date',
    ejemplo: '15/03/1990',
    categoria: 'empleado',
  },
  {
    key: 'empleado_telefono',
    label: 'Teléfono',
    tipo: 'string',
    ejemplo: '612345678',
    categoria: 'empleado',
  },
  
  // Empleado - Dirección
  {
    key: 'empleado_direccion_completa',
    label: 'Dirección completa',
    tipo: 'string',
    ejemplo: 'Calle Mayor 123, 3º A, 28001 Madrid',
    categoria: 'empleado',
  },
  {
    key: 'empleado_direccion_calle',
    label: 'Calle',
    tipo: 'string',
    ejemplo: 'Calle Mayor',
    categoria: 'empleado',
  },
  {
    key: 'empleado_direccion_numero',
    label: 'Número',
    tipo: 'string',
    ejemplo: '123',
    categoria: 'empleado',
  },
  {
    key: 'empleado_direccion_piso',
    label: 'Piso',
    tipo: 'string',
    ejemplo: '3º A',
    categoria: 'empleado',
  },
  {
    key: 'empleado_codigo_postal',
    label: 'Código postal',
    tipo: 'string',
    ejemplo: '28001',
    categoria: 'empleado',
  },
  {
    key: 'empleado_ciudad',
    label: 'Ciudad',
    tipo: 'string',
    ejemplo: 'Madrid',
    categoria: 'empleado',
  },
  {
    key: 'empleado_provincia',
    label: 'Provincia',
    tipo: 'string',
    ejemplo: 'Madrid',
    categoria: 'empleado',
  },
  
  // Empleado - Familia
  {
    key: 'empleado_estado_civil',
    label: 'Estado civil',
    tipo: 'string',
    ejemplo: 'Casado/a',
    categoria: 'empleado',
  },
  {
    key: 'empleado_numero_hijos',
    label: 'Número de hijos',
    tipo: 'number',
    ejemplo: '2',
    categoria: 'empleado',
  },
  
  // Empleado - Bancario
  {
    key: 'empleado_iban',
    label: 'IBAN',
    tipo: 'string',
    ejemplo: 'ES12 1234 1234 12 1234567890',
    categoria: 'empleado',
    encriptado: true,
  },
  {
    key: 'empleado_bic',
    label: 'Código BIC',
    tipo: 'string',
    ejemplo: 'BBVAESMMXXX',
    categoria: 'empleado',
  },
  
  // Contrato
  {
    key: 'contrato_tipo',
    label: 'Tipo de contrato',
    tipo: 'string',
    ejemplo: 'Indefinido',
    categoria: 'contrato',
  },
  {
    key: 'contrato_fecha_inicio',
    label: 'Fecha de inicio del contrato',
    tipo: 'date',
    ejemplo: '01/01/2024',
    categoria: 'contrato',
  },
  {
    key: 'contrato_fecha_fin',
    label: 'Fecha de fin del contrato',
    tipo: 'date',
    ejemplo: '31/12/2024',
    categoria: 'contrato',
  },
  {
    key: 'contrato_salario_bruto_anual',
    label: 'Salario base anual',
    tipo: 'string',
    ejemplo: '30.000,00 €',
    categoria: 'contrato',
  },
  {
    key: 'contrato_salario_bruto_mensual',
    label: 'Salario base mensual',
    tipo: 'string',
    ejemplo: '2.500,00 €',
    categoria: 'contrato',
  },
  {
    key: 'contrato_puesto',
    label: 'Puesto de trabajo',
    tipo: 'string',
    ejemplo: 'Desarrollador Senior',
    categoria: 'contrato',
  },
  {
    key: 'contrato_categoria_profesional',
    label: 'Categoría profesional',
    tipo: 'string',
    ejemplo: 'Técnico',
    categoria: 'contrato',
  },
  {
    key: 'contrato_grupo_cotizacion',
    label: 'Grupo de cotización',
    tipo: 'number',
    ejemplo: '1',
    categoria: 'contrato',
  },
  
  // Jornada
  {
    key: 'jornada_nombre',
    label: 'Nombre de la jornada',
    tipo: 'string',
    ejemplo: 'Jornada completa 40h',
    categoria: 'jornada',
  },
  {
    key: 'jornada_horas_semanales',
    label: 'Horas semanales',
    tipo: 'string',
    ejemplo: '40',
    categoria: 'jornada',
  },
  
  // Empresa
  {
    key: 'empresa_nombre',
    label: 'Nombre de la empresa',
    tipo: 'string',
    ejemplo: 'Clousadmin SL',
    categoria: 'empresa',
  },
  {
    key: 'empresa_cif',
    label: 'CIF',
    tipo: 'string',
    ejemplo: 'B12345678',
    categoria: 'empresa',
  },
  {
    key: 'empresa_email',
    label: 'Email de la empresa',
    tipo: 'string',
    ejemplo: 'info@clousadmin.com',
    categoria: 'empresa',
  },
  {
    key: 'empresa_telefono',
    label: 'Teléfono de la empresa',
    tipo: 'string',
    ejemplo: '911234567',
    categoria: 'empresa',
  },
  {
    key: 'empresa_direccion',
    label: 'Dirección de la empresa',
    tipo: 'string',
    ejemplo: 'Calle Empresa 1, 28001 Madrid',
    categoria: 'empresa',
  },
  {
    key: 'empresa_web',
    label: 'Web de la empresa',
    tipo: 'string',
    ejemplo: 'www.clousadmin.com',
    categoria: 'empresa',
  },
  {
    key: 'empresa_ciudad',
    label: 'Ciudad de la empresa',
    tipo: 'string',
    ejemplo: 'Madrid',
    categoria: 'empresa',
  },
  
  // Manager
  {
    key: 'manager_nombre',
    label: 'Nombre del manager',
    tipo: 'string',
    ejemplo: 'María López',
    categoria: 'manager',
  },
  {
    key: 'manager_apellidos',
    label: 'Apellidos del manager',
    tipo: 'string',
    ejemplo: 'López Martínez',
    categoria: 'manager',
  },
  {
    key: 'manager_email',
    label: 'Email del manager',
    tipo: 'string',
    ejemplo: 'maria.lopez@empresa.com',
    categoria: 'manager',
  },
  {
    key: 'manager_nombre_completo',
    label: 'Nombre completo del manager',
    tipo: 'string',
    ejemplo: 'María López Martínez',
    categoria: 'manager',
  },
  
  // Sistema (fechas dinámicas)
  {
    key: 'fecha_actual',
    label: 'Fecha actual',
    tipo: 'date',
    ejemplo: '12/11/2025',
    categoria: 'sistema',
  },
  {
    key: 'año_actual',
    label: 'Año actual',
    tipo: 'number',
    ejemplo: '2025',
    categoria: 'sistema',
  },
  {
    key: 'mes_actual',
    label: 'Mes actual',
    tipo: 'string',
    ejemplo: 'Noviembre',
    categoria: 'sistema',
  },
  
  // Vacaciones
  {
    key: 'vacaciones_dias_totales',
    label: 'Días de vacaciones totales',
    tipo: 'number',
    ejemplo: '22',
    categoria: 'empleado',
  },
  {
    key: 'vacaciones_dias_disponibles',
    label: 'Días de vacaciones disponibles',
    tipo: 'number',
    ejemplo: '15',
    categoria: 'empleado',
  },
  {
    key: 'vacaciones_dias_usados',
    label: 'Días de vacaciones usados',
    tipo: 'number',
    ejemplo: '7',
    categoria: 'empleado',
  },
];

/**
 * Mapeo rápido por categoría
 */
export const VARIABLES_POR_CATEGORIA = VARIABLES_DISPONIBLES.reduce(
  (acc, variable) => {
    if (!acc[variable.categoria]) {
      acc[variable.categoria] = [];
    }
    acc[variable.categoria].push(variable);
    return acc;
  },
  {} as Record<string, VariableDefinicion[]>
);
```

### 3.3 `lib/plantillas/resolver-variables.ts`

```typescript
/**
 * Resolver variables de plantillas con datos del empleado
 */
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { VariablesResueltas } from './tipos';

interface EmpleadoConRelaciones {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  nif: string | null;
  nss: string | null;
  fechaNacimiento: Date | null;
  telefono: string | null;
  direccionCalle: string | null;
  direccionNumero: string | null;
  direccionPiso: string | null;
  codigoPostal: string | null;
  ciudad: string | null;
  direccionProvincia: string | null;
  estadoCivil: string | null;
  numeroHijos: number;
  iban: string | null;
  bic: string | null;
  diasVacaciones: number;
  empresa: {
    nombre: string;
    cif: string | null;
    email: string | null;
    telefono: string | null;
    direccion: string | null;
    web: string | null;
  };
  manager: {
    nombre: string;
    apellidos: string;
    email: string;
  } | null;
  jornada: {
    nombre: string;
    horasSemanales: any;
  } | null;
  contratos: Array<{
    tipoContrato: string;
    fechaInicio: Date;
    fechaFin: Date | null;
    salarioBaseAnual: any;
    categoriaProfesional: string | null;
    grupoCotizacion: number | null;
  }>;
  saldosAusencias: Array<{
    diasTotales: number;
    diasUsados: any;
    diasPendientes: any;
  }>;
}

/**
 * Resuelve variables de plantilla con datos del empleado
 */
export async function resolverVariables(
  variables: string[],
  empleadoId: string
): Promise<VariablesResueltas> {
  // 1. Buscar empleado con todas las relaciones necesarias
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    include: {
      empresa: true,
      manager: {
        select: {
          nombre: true,
          apellidos: true,
          email: true,
        },
      },
      jornada: {
        select: {
          nombre: true,
          horasSemanales: true,
        },
      },
      contratos: {
        orderBy: { fechaInicio: 'desc' },
        take: 1, // Último contrato
        select: {
          tipoContrato: true,
          fechaInicio: true,
          fechaFin: true,
          salarioBaseAnual: true,
          categoriaProfesional: true,
          grupoCotizacion: true,
        },
      },
      saldosAusencias: {
        where: { año: new Date().getFullYear() },
        select: {
          diasTotales: true,
          diasUsados: true,
          diasPendientes: true,
        },
      },
    },
  });

  if (!empleado) {
    throw new Error(`Empleado ${empleadoId} no encontrado`);
  }

  // 2. Resolver cada variable
  const resueltas: Record<string, string> = {};
  const faltantes: string[] = [];

  for (const variable of variables) {
    const valor = obtenerValorVariable(variable, empleado);

    if (valor !== null && valor !== undefined && valor !== '') {
      resueltas[variable] = valor;
    } else {
      faltantes.push(variable);
    }
  }

  return { resueltas, faltantes };
}

/**
 * Obtiene el valor de una variable específica del empleado
 */
function obtenerValorVariable(
  variable: string,
  empleado: EmpleadoConRelaciones
): string | null {
  // --- EMPLEADO: Datos personales ---
  if (variable === 'empleado_nombre') return empleado.nombre;
  if (variable === 'empleado_apellidos') return empleado.apellidos;
  if (variable === 'empleado_email') return empleado.email;

  // Campos encriptados
  if (variable === 'empleado_nif') {
    return empleado.nif ? decrypt(empleado.nif) : null;
  }
  if (variable === 'empleado_nss') {
    return empleado.nss ? decrypt(empleado.nss) : null;
  }
  if (variable === 'empleado_iban') {
    return empleado.iban ? decrypt(empleado.iban) : null;
  }

  // Fechas
  if (variable === 'empleado_fecha_nacimiento') {
    return empleado.fechaNacimiento
      ? format(empleado.fechaNacimiento, 'dd/MM/yyyy')
      : null;
  }

  // Otros datos personales
  if (variable === 'empleado_telefono') return empleado.telefono;
  if (variable === 'empleado_estado_civil') return empleado.estadoCivil;
  if (variable === 'empleado_numero_hijos') return empleado.numeroHijos.toString();
  if (variable === 'empleado_bic') return empleado.bic;

  // --- EMPLEADO: Dirección ---
  if (variable === 'empleado_direccion_calle') return empleado.direccionCalle;
  if (variable === 'empleado_direccion_numero') return empleado.direccionNumero;
  if (variable === 'empleado_direccion_piso') return empleado.direccionPiso;
  if (variable === 'empleado_codigo_postal') return empleado.codigoPostal;
  if (variable === 'empleado_ciudad') return empleado.ciudad;
  if (variable === 'empleado_provincia') return empleado.direccionProvincia;

  // Dirección completa
  if (variable === 'empleado_direccion_completa') {
    const partes = [
      empleado.direccionCalle,
      empleado.direccionNumero,
      empleado.direccionPiso,
      empleado.codigoPostal,
      empleado.ciudad,
    ].filter(Boolean);
    return partes.length > 0 ? partes.join(', ') : null;
  }

  // --- EMPRESA ---
  if (variable === 'empresa_nombre') return empleado.empresa.nombre;
  if (variable === 'empresa_cif') return empleado.empresa.cif;
  if (variable === 'empresa_email') return empleado.empresa.email;
  if (variable === 'empresa_telefono') return empleado.empresa.telefono;
  if (variable === 'empresa_direccion') return empleado.empresa.direccion;
  if (variable === 'empresa_web') return empleado.empresa.web;

  // Extraer ciudad de la dirección de la empresa (simplificado)
  if (variable === 'empresa_ciudad') {
    // Asumimos formato "Calle X, CP Ciudad"
    const direccion = empleado.empresa.direccion;
    if (direccion) {
      const partes = direccion.split(',');
      if (partes.length >= 3) {
        return partes[partes.length - 1].trim();
      }
    }
    return null;
  }

  // --- CONTRATO ---
  const contrato = empleado.contratos[0];
  if (!contrato) return null;

  if (variable === 'contrato_tipo') {
    // Convertir enum a texto legible
    const tipos: Record<string, string> = {
      indefinido: 'Indefinido',
      temporal: 'Temporal',
      administrador: 'Administrador Societario',
      fijo_discontinuo: 'Fijo Discontinuo',
      becario: 'Becario',
      practicas: 'Prácticas',
      obra_y_servicio: 'Obra y Servicio',
    };
    return tipos[contrato.tipoContrato] || contrato.tipoContrato;
  }

  if (variable === 'contrato_fecha_inicio') {
    return format(contrato.fechaInicio, 'dd/MM/yyyy');
  }

  if (variable === 'contrato_fecha_fin') {
    return contrato.fechaFin ? format(contrato.fechaFin, 'dd/MM/yyyy') : '';
  }

  if (variable === 'contrato_salario_bruto_anual') {
    const salario = parseFloat(contrato.salarioBaseAnual.toString());
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(salario);
  }

  if (variable === 'contrato_salario_bruto_mensual') {
    const salarioAnual = parseFloat(contrato.salarioBaseAnual.toString());
    const salarioMensual = salarioAnual / 14; // 14 pagas
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(salarioMensual);
  }

  if (variable === 'contrato_puesto') {
    // Obtener de empleado (campo puesto) o de relación puestoRelacion
    // Por ahora retornamos null, se puede mejorar
    return null;
  }

  if (variable === 'contrato_categoria_profesional') {
    return contrato.categoriaProfesional;
  }

  if (variable === 'contrato_grupo_cotizacion') {
    return contrato.grupoCotizacion?.toString() || null;
  }

  // --- JORNADA ---
  if (variable === 'jornada_nombre') {
    return empleado.jornada?.nombre || null;
  }

  if (variable === 'jornada_horas_semanales') {
    return empleado.jornada?.horasSemanales.toString() || null;
  }

  // --- MANAGER ---
  if (variable === 'manager_nombre') {
    return empleado.manager?.nombre || null;
  }

  if (variable === 'manager_apellidos') {
    return empleado.manager?.apellidos || null;
  }

  if (variable === 'manager_email') {
    return empleado.manager?.email || null;
  }

  if (variable === 'manager_nombre_completo') {
    return empleado.manager
      ? `${empleado.manager.nombre} ${empleado.manager.apellidos}`
      : null;
  }

  // --- SISTEMA: Fechas dinámicas ---
  if (variable === 'fecha_actual') {
    return format(new Date(), 'dd/MM/yyyy');
  }

  if (variable === 'año_actual') {
    return new Date().getFullYear().toString();
  }

  if (variable === 'mes_actual') {
    return format(new Date(), 'MMMM', { locale: es });
  }

  // --- VACACIONES ---
  const saldo = empleado.saldosAusencias[0];

  if (variable === 'vacaciones_dias_totales') {
    return saldo?.diasTotales.toString() || empleado.diasVacaciones.toString();
  }

  if (variable === 'vacaciones_dias_usados') {
    return saldo?.diasUsados.toString() || '0';
  }

  if (variable === 'vacaciones_dias_disponibles') {
    if (saldo) {
      const disponibles =
        saldo.diasTotales - parseFloat(saldo.diasUsados.toString());
      return disponibles.toString();
    }
    return empleado.diasVacaciones.toString();
  }

  // Variable no reconocida
  console.warn(`[resolver-variables] Variable no reconocida: ${variable}`);
  return null;
}
```

---

## 4. Implementación de APIs

### 4.1 `app/api/plantillas/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/plantillas - Listar plantillas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'oficial' | 'personalizada' | 'todas'
    const categoria = searchParams.get('categoria');
    const activa = searchParams.get('activa');

    // Construir filtros
    const where: any = {
      activa: activa === 'false' ? false : true,
    };

    // Plantillas oficiales (empresaId = null) O personalizadas de la empresa
    where.OR = [
      { empresaId: null, esOficial: true }, // Oficiales
      { empresaId: session.user.empresaId }, // Personalizadas de la empresa
    ];

    if (tipo === 'oficial') {
      where.esOficial = true;
    } else if (tipo === 'personalizada') {
      where.esOficial = false;
      where.empresaId = session.user.empresaId;
    }

    if (categoria) {
      where.categoria = categoria;
    }

    const plantillas = await prisma.plantillaDocumento.findMany({
      where,
      orderBy: [{ esOficial: 'desc' }, { createdAt: 'desc' }],
      include: {
        empresa: {
          select: {
            nombre: true,
          },
        },
        _count: {
          select: {
            documentosGenerados: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      plantillas,
    });
  } catch (error) {
    console.error('[GET /api/plantillas] Error:', error);
    return NextResponse.json(
      { error: 'Error obteniendo plantillas' },
      { status: 500 }
    );
  }
}

// POST /api/plantillas - Subir nueva plantilla personalizada
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user || session.user.rol !== 'hr_admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const nombre = formData.get('nombre') as string;
    const descripcion = formData.get('descripcion') as string | null;
    const categoria = formData.get('categoria') as string;
    const carpetaDestinoDefault = formData.get('carpetaDestinoDefault') as string | null;

    // Validación
    const schema = z.object({
      nombre: z.string().min(3).max(255),
      categoria: z.enum(['contrato', 'fiscal', 'ausencia', 'personal']),
    });

    const validation = schema.safeParse({ nombre, categoria });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    // Validar formato DOCX
    if (!file.name.endsWith('.docx')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos DOCX' },
        { status: 400 }
      );
    }

    // Leer archivo y extraer variables
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { extraerVariables } = await import('@/lib/plantillas/extraer-variables');
    const variablesDetectadas = await extraerVariables(buffer);

    // Subir a S3
    const { uploadToS3 } = await import('@/lib/s3');
    const s3Key = `plantillas/${session.user.empresaId}/${Date.now()}_${file.name}`;
    await uploadToS3(buffer, s3Key, file.type);

    // Crear registro en BD
    const plantilla = await prisma.plantillaDocumento.create({
      data: {
        empresaId: session.user.empresaId,
        nombre,
        descripcion,
        categoria,
        tipo: 'personalizada',
        formato: 'docx',
        s3Key,
        s3Bucket: process.env.STORAGE_BUCKET || 'local',
        variablesUsadas: variablesDetectadas,
        carpetaDestinoDefault,
        activa: true,
        esOficial: false,
      },
    });

    return NextResponse.json({
      success: true,
      plantilla,
      variablesDetectadas,
    });
  } catch (error) {
    console.error('[POST /api/plantillas] Error:', error);
    return NextResponse.json(
      { error: 'Error creando plantilla' },
      { status: 500 }
    );
  }
}
```

### 4.2 `app/api/plantillas/[id]/generar/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { resolverVariables } from '@/lib/plantillas/resolver-variables';
import { generarDocumento } from '@/lib/plantillas/generar-documento';
import { uploadToS3 } from '@/lib/s3';

// POST /api/plantillas/[id]/generar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: plantillaId } = await params;
    const body = await request.json();

    // Validar body
    const schema = z.object({
      empleadoIds: z.array(z.string()).min(1),
      configuracion: z.object({
        nombreDocumento: z.string().optional(),
        carpetaDestino: z.string().optional(),
        notificar: z.boolean(),
        requiereFirma: z.boolean().optional(),
      }),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error },
        { status: 400 }
      );
    }

    const { empleadoIds, configuracion } = validation.data;

    // Buscar plantilla
    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id: plantillaId },
    });

    if (!plantilla) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que plantilla es de la empresa o es oficial
    if (plantilla.empresaId && plantilla.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Generar documentos para cada empleado
    const resultados = [];

    for (const empleadoId of empleadoIds) {
      try {
        // 1. Buscar empleado
        const empleado = await prisma.empleado.findUnique({
          where: { id: empleadoId, empresaId: session.user.empresaId },
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        });

        if (!empleado) {
          resultados.push({
            empleadoId,
            empleadoNombre: 'Desconocido',
            success: false,
            error: 'Empleado no encontrado',
          });
          continue;
        }

        // 2. Resolver variables
        const variablesUsadas = plantilla.variablesUsadas as string[];
        const { resueltas, faltantes } = await resolverVariables(
          variablesUsadas,
          empleadoId
        );

        // Si faltan variables críticas, marcar como error
        if (faltantes.length > 0) {
          resultados.push({
            empleadoId,
            empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
            success: false,
            error: `Faltan variables: ${faltantes.join(', ')}`,
          });
          continue;
        }

        // 3. Generar documento
        const bufferDocumento = await generarDocumento(
          plantilla.s3Key,
          resueltas
        );

        // 4. Determinar nombre del documento
        let nombreFinal = configuracion.nombreDocumento || plantilla.nombre;
        // Reemplazar variables en el nombre
        for (const [key, value] of Object.entries(resueltas)) {
          nombreFinal = nombreFinal.replace(`{{${key}}}`, value);
        }
        nombreFinal = `${nombreFinal}.docx`;

        // 5. Subir documento generado a S3
        const s3KeyDocumento = `documentos/${session.user.empresaId}/${empleadoId}/${Date.now()}_${nombreFinal}`;
        await uploadToS3(bufferDocumento, s3KeyDocumento, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        // 6. Buscar o crear carpeta destino (por defecto "Otros")
        const carpetaNombre = configuracion.carpetaDestino || plantilla.carpetaDestinoDefault || 'Otros';
        let carpeta = await prisma.carpeta.findFirst({
          where: {
            empresaId: session.user.empresaId,
            empleadoId: empleadoId,
            nombre: carpetaNombre,
          },
        });

        if (!carpeta) {
          carpeta = await prisma.carpeta.create({
            data: {
              empresaId: session.user.empresaId,
              empleadoId: empleadoId,
              nombre: carpetaNombre,
              esSistema: false,
            },
          });
        }

        // 7. Crear registro de Documento
        const documento = await prisma.documento.create({
          data: {
            empresaId: session.user.empresaId,
            empleadoId: empleadoId,
            carpetaId: carpeta.id,
            nombre: nombreFinal,
            // El tipo de documento se infiere automáticamente desde la carpeta
            tipoDocumento: inferirTipoDocumento(carpetaNombre, plantilla.categoria),
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            tamano: bufferDocumento.length,
            s3Key: s3KeyDocumento,
            s3Bucket: process.env.STORAGE_BUCKET || 'local',
          },
        });

        // 8. Crear registro de DocumentoGenerado (tracking)
        await prisma.documentoGenerado.create({
          data: {
            empresaId: session.user.empresaId,
            empleadoId: empleadoId,
            plantillaId: plantilla.id,
            documentoId: documento.id,
            generadoPor: session.user.id,
            variablesUtilizadas: resueltas,
            notificado: false,
            requiereFirma: configuracion.requiereFirma || false,
          },
        });

        // 9. (Opcional) Enviar notificación al empleado
        if (configuracion.notificar) {
          await prisma.notificacion.create({
            data: {
              empresaId: session.user.empresaId,
              usuarioId: empleadoId, // Asumiendo que empleadoId = usuarioId
              tipo: 'info',
              titulo: 'Nuevo documento disponible',
              mensaje: `Tienes un nuevo documento: ${nombreFinal}`,
              metadata: {
                documentoId: documento.id,
                carpetaId: carpeta.id,
              },
            },
          });
        }

        resultados.push({
          empleadoId,
          empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
          documentoId: documento.id,
          success: true,
        });
      } catch (error) {
        console.error(`[generar-documento] Error para empleado ${empleadoId}:`, error);
        resultados.push({
          empleadoId,
          empleadoNombre: 'Error',
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    // Resumen
    const generadosExitosos = resultados.filter((r) => r.success).length;
    const fallidos = resultados.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      resumen: {
        totalEmpleados: empleadoIds.length,
        generadosExitosos,
        fallidos,
        documentos: resultados,
      },
    });
  } catch (error) {
    console.error('[POST /api/plantillas/[id]/generar] Error:', error);
    return NextResponse.json(
      { error: 'Error generando documentos' },
      { status: 500 }
    );
  }
}
```

---

## 5. Componentes UI

### 5.1 `components/hr/plantillas-lista.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Trash2, Edit, Download, Plus } from 'lucide-react';
import { NuevaPlantillaModal } from './nueva-plantilla-modal';
import { GenerarDocumentosModal } from './generar-documentos-modal';

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  tipo: 'oficial' | 'personalizada';
  formato: string;
  esOficial: boolean;
  activa: boolean;
  variablesUsadas: string[];
  _count: {
    documentosGenerados: number;
  };
}

export function PlantillasLista() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'oficial' | 'personalizada'>('todas');
  const [modalNueva, setModalNueva] = useState(false);
  const [modalGenerar, setModalGenerar] = useState<Plantilla | null>(null);

  useEffect(() => {
    cargarPlantillas();
  }, [filtro]);

  const cargarPlantillas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plantillas?tipo=${filtro}`);
      const data = await res.json();

      if (data.success) {
        setPlantillas(data.plantillas);
      }
    } catch (error) {
      console.error('Error cargando plantillas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar por categoría
  const plantillasPorCategoria = plantillas.reduce((acc, plantilla) => {
    if (!acc[plantilla.categoria]) {
      acc[plantilla.categoria] = [];
    }
    acc[plantilla.categoria].push(plantilla);
    return acc;
  }, {} as Record<string, Plantilla[]>);

  const categoriasLabels: Record<string, string> = {
    contrato: '📄 Contratos',
    fiscal: '💰 Fiscal',
    ausencia: '📋 Ausencias',
    personal: '👤 Personal',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Plantillas de Documentos</h2>
          <p className="text-muted-foreground">
            Gestiona plantillas oficiales y personalizadas para generar documentos automáticamente
          </p>
        </div>
        <Button onClick={() => setModalNueva(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={filtro === 'todas' ? 'default' : 'outline'}
          onClick={() => setFiltro('todas')}
        >
          Todas
        </Button>
        <Button
          variant={filtro === 'oficial' ? 'default' : 'outline'}
          onClick={() => setFiltro('oficial')}
        >
          Oficiales
        </Button>
        <Button
          variant={filtro === 'personalizada' ? 'default' : 'outline'}
          onClick={() => setFiltro('personalizada')}
        >
          Personalizadas
        </Button>
      </div>

      {/* Lista de plantillas agrupadas */}
      {loading ? (
        <div>Cargando...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(plantillasPorCategoria).map(([categoria, items]) => (
            <div key={categoria}>
              <h3 className="text-lg font-semibold mb-3">
                {categoriasLabels[categoria] || categoria}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((plantilla) => (
                  <Card key={plantilla.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <FileText className="h-8 w-8 text-primary" />
                        {plantilla.esOficial && (
                          <Badge variant="secondary">Oficial</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{plantilla.nombre}</CardTitle>
                      {plantilla.descripcion && (
                        <CardDescription className="line-clamp-2">
                          {plantilla.descripcion}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Stats */}
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Usado {plantilla._count.documentosGenerados} veces</span>
                          <span>{plantilla.variablesUsadas.length} variables</span>
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => setModalGenerar(plantilla)}
                          >
                            Generar
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!plantilla.esOficial && (
                            <>
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {modalNueva && (
        <NuevaPlantillaModal
          open={modalNueva}
          onClose={() => setModalNueva(false)}
          onSuccess={() => {
            setModalNueva(false);
            cargarPlantillas();
          }}
        />
      )}

      {modalGenerar && (
        <GenerarDocumentosModal
          plantilla={modalGenerar}
          open={!!modalGenerar}
          onClose={() => setModalGenerar(null)}
          onSuccess={() => {
            setModalGenerar(null);
            cargarPlantillas();
          }}
        />
      )}
    </div>
  );
}
```

---

## 6. Seeders de Plantillas Oficiales

### 6.1 `prisma/seeds/plantillas-oficiales.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { uploadToS3 } from '../../lib/s3';

const prisma = new PrismaClient();

export async function seedPlantillasOficiales() {
  console.log('🌱 Seeding plantillas oficiales...');

  const plantillas = [
    {
      nombre: 'Contrato Indefinido',
      descripcion:
        'Plantilla oficial para contratos de trabajo indefinido según legislación española',
      categoria: 'contrato',
      formato: 'docx',
      archivo: 'contrato-indefinido.docx',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_nif',
        'empleado_direccion_completa',
        'contrato_fecha_inicio',
        'contrato_salario_bruto_anual',
        'contrato_puesto',
        'jornada_horas_semanales',
        'jornada_nombre',
        'vacaciones_dias_totales',
        'empresa_nombre',
        'empresa_cif',
        'empresa_direccion',
        'empresa_ciudad',
        'fecha_actual',
      ],
      requiereContrato: true,
      carpetaDestinoDefault: 'Contratos',
    },
    {
      nombre: 'Modelo 145 (IRPF)',
      descripcion:
        'Comunicación de datos del trabajador al pagador de rentas del trabajo para cálculo de retención IRPF',
      categoria: 'fiscal',
      formato: 'docx',
      archivo: 'modelo-145.docx',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_nif',
        'empleado_fecha_nacimiento',
        'empleado_direccion_completa',
        'empleado_estado_civil',
        'empleado_numero_hijos',
        'empresa_nombre',
        'empresa_cif',
        'fecha_actual',
      ],
      carpetaDestinoDefault: 'Otros', // Se mapea automáticamente a tipoDocumento: 'otro'
    },
    {
      nombre: 'Justificante de Vacaciones',
      descripcion:
        'Justificante oficial de vacaciones aprobadas para el empleado',
      categoria: 'ausencia',
      formato: 'docx',
      archivo: 'justificante-vacaciones.docx',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_nif',
        'empresa_nombre',
        'fecha_actual',
        // Variables de ausencia (se agregan dinámicamente)
      ],
      carpetaDestinoDefault: 'Justificantes',
    },
    {
      nombre: 'Carta de Bienvenida',
      descripcion:
        'Carta de bienvenida personalizada para nuevos empleados',
      categoria: 'personal',
      formato: 'docx',
      archivo: 'carta-bienvenida.docx',
      variablesUsadas: [
        'empleado_nombre',
        'contrato_puesto',
        'contrato_fecha_inicio',
        'manager_nombre_completo',
        'empresa_nombre',
        'fecha_actual',
      ],
      carpetaDestinoDefault: 'Otros', // Se mapea automáticamente a tipoDocumento: 'otro'
    },
  ];

  for (const plantilla of plantillas) {
    try {
      // Verificar si ya existe
      const existente = await prisma.plantillaDocumento.findFirst({
        where: {
          nombre: plantilla.nombre,
          esOficial: true,
        },
      });

      if (existente) {
        console.log(`  ⏭️  Plantilla "${plantilla.nombre}" ya existe, saltando...`);
        continue;
      }

      // Leer archivo de plantilla
      const archivoPath = join(
        process.cwd(),
        'uploads',
        'plantillas',
        'oficiales',
        plantilla.archivo
      );
      const buffer = readFileSync(archivoPath);

      // Subir a S3
      const s3Key = `plantillas/oficiales/${plantilla.archivo}`;
      await uploadToS3(buffer, s3Key, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      // Crear registro
      await prisma.plantillaDocumento.create({
        data: {
          nombre: plantilla.nombre,
          descripcion: plantilla.descripcion,
          categoria: plantilla.categoria,
          tipo: 'oficial',
          formato: plantilla.formato,
          s3Key,
          s3Bucket: process.env.STORAGE_BUCKET || 'local',
          variablesUsadas: plantilla.variablesUsadas,
          activa: true,
          esOficial: true,
          requiereContrato: plantilla.requiereContrato || false,
          carpetaDestinoDefault: plantilla.carpetaDestinoDefault,
        },
      });

      console.log(`  ✅ Plantilla "${plantilla.nombre}" creada`);
    } catch (error) {
      console.error(
        `  ❌ Error creando plantilla "${plantilla.nombre}":`,
        error
      );
    }
  }

  console.log('✅ Plantillas oficiales seeded');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedPlantillasOficiales()
    .then(() => {
      console.log('✅ Seed completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en seed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
```

**Ejecutar seeder**:
```bash
npx tsx prisma/seeds/plantillas-oficiales.ts
```

---

## 7. Ejemplos de Uso

### 7.1 Generar Contrato para Nuevo Empleado

```typescript
// En app/api/empleados/route.ts o similar

import { generarDocumentoDesdeContrato } from '@/lib/plantillas/helpers';

// Después de crear empleado y contrato
const empleado = await prisma.empleado.create({...});
const contrato = await prisma.contrato.create({...});

// Generar documento de contrato automáticamente
await generarDocumentoDesdeContrato(empleado.id, contrato.id);
```

**Helper**: `lib/plantillas/helpers.ts`
```typescript
export async function generarDocumentoDesdeContrato(
  empleadoId: string,
  contratoId: string
) {
  // 1. Buscar plantilla oficial "Contrato Indefinido"
  const plantilla = await prisma.plantillaDocumento.findFirst({
    where: {
      nombre: 'Contrato Indefinido',
      esOficial: true,
    },
  });

  if (!plantilla) {
    throw new Error('Plantilla de contrato no encontrada');
  }

  // 2. Resolver variables
  const { resueltas, faltantes } = await resolverVariables(
    plantilla.variablesUsadas as string[],
    empleadoId
  );

  if (faltantes.length > 0) {
    console.warn(`[generar-contrato] Variables faltantes: ${faltantes.join(', ')}`);
  }

  // 3. Generar documento
  const buffer = await generarDocumento(plantilla.s3Key, resueltas);

  // 4. Subir a S3
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: { empresaId: true, apellidos: true },
  });

  const nombreDocumento = `Contrato_${empleado.apellidos}_${format(new Date(), 'yyyy-MM-dd')}.docx`;
  const s3Key = `documentos/${empleado.empresaId}/${empleadoId}/contratos/${nombreDocumento}`;
  
  await uploadToS3(buffer, s3Key, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  // 5. Crear carpeta "Contratos" si no existe
  let carpeta = await prisma.carpeta.findFirst({
    where: {
      empresaId: empleado.empresaId,
      empleadoId,
      nombre: 'Contratos',
    },
  });

  if (!carpeta) {
    carpeta = await prisma.carpeta.create({
      data: {
        empresaId: empleado.empresaId,
        empleadoId,
        nombre: 'Contratos',
        esSistema: true,
      },
    });
  }

  // 6. Crear Documento
  const documento = await prisma.documento.create({
    data: {
      empresaId: empleado.empresaId,
      empleadoId,
      carpetaId: carpeta.id,
      nombre: nombreDocumento,
      tipoDocumento: 'contrato',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      tamano: buffer.length,
      s3Key,
      s3Bucket: process.env.STORAGE_BUCKET || 'clousadmin-dev',
    },
  });

  // 7. Crear DocumentoGenerado (tracking)
  await prisma.documentoGenerado.create({
    data: {
      empresaId: empleado.empresaId,
      empleadoId,
      plantillaId: plantilla.id,
      documentoId: documento.id,
      variablesUtilizadas: resueltas,
      generadoPor: null, // Sistema automático
    },
  });

  // 8. Vincular contrato con documento
  await prisma.contrato.update({
    where: { id: contratoId },
    data: { documentoId: documento.id },
  });

  console.log(`[generar-contrato] Contrato generado: ${nombreDocumento}`);
  return documento;
}
```

---

## 8. QA Manual y Limitaciones MVP

### 8.1 Plan de pruebas manuales

1. **Generación básica sin firma**
   - Subir una plantilla DOCX con variables.
   - Generar documento para un empleado sin `requiereFirma`.
   - Confirmar en `/hr/documentos` que el archivo resultante es PDF (iframe del navegador) y que en la base de datos `documentos.datosExtraidos` contiene `origenDocx` con la `s3Key` original.
2. **Generación con firma automática**
   - Activar `requiereFirma` en la plantilla o en la configuración de generación.
   - Tras generar, verificar que existe `SolicitudFirma` apuntando al documento PDF y que `GET /api/firma/solicitudes/[id]/pdf-firmado` devuelve un PDF con marcas tras completar todas las firmas.
3. **Solicitud manual (HR)**
   - Crear un documento PDF manual en una carpeta HR.
   - Ejecutar `POST /api/firma/solicitudes` para ese documento y validar que se crea la solicitud.
   - Repetir el POST con un documento DOCX y comprobar que responde con el error “Solo se pueden solicitar firmas sobre documentos PDF”.
4. **Firma guardada del empleado**
   - Guardar firma mediante `POST /api/empleados/firma`.
   - Firmar un documento y revisar que el certificado contiene `firmaGuardadaUsada = true`.

### 8.2 Limitaciones MVP

- La firma digital únicamente soporta PDF. Si el documento original es DOCX, debe pasar por `convertDocxFromS3ToPdf` antes de solicitar la firma.
- Los documentos DOCX subidos manualmente todavía se pueden descargar, pero no se pueden firmar hasta que exista un flujo de conversión en la UI.
- El visor fiel depende del motor PDF del navegador; la previsualización de plantillas (DOCX) sigue siendo simplificada.
- La conversión requiere LibreOffice (`soffice`) instalado en el entorno de generación. Si no está presente se lanzará un error guiando la configuración de `LIBREOFFICE_PATH`.

---

**FIN DE LA GUÍA DE IMPLEMENTACIÓN**

**Versión**: 1.0.0  
**Última actualización**: 12 de Noviembre 2025  
**Proyecto**: Clousadmin






