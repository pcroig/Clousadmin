import { PrismaClient } from '@prisma/client';
import { CARPETAS_SISTEMA } from '../lib/documentos';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando carpetas master...\n');

  // Obtener todas las empresas
  const empresas = await prisma.empresas.findMany({
    select: { id: true, nombre: true }
  });

  console.log(`Empresas encontradas: ${empresas.length}\n`);

  for (const empresa of empresas) {
    console.log(`📊 Empresa: ${empresa.nombre}`);

    for (const nombreCarpeta of CARPETAS_SISTEMA) {
      // Buscar carpeta master
      let carpetaMaster = await prisma.carpetas.findFirst({
        where: {
          empresaId: empresa.id,
          empleadoId: null,
          nombre: nombreCarpeta,
          esSistema: true,
        }
      });

      if (!carpetaMaster) {
        console.log(`   ➕ Creando carpeta master: ${nombreCarpeta}`);
        carpetaMaster = await prisma.carpetas.create({
          data: {
            empresaId: empresa.id,
            empleadoId: null,
            nombre: nombreCarpeta,
            esSistema: true,
            compartida: true,
            asignadoA: 'hr',
          }
        });
      } else {
        console.log(`   ✓ Carpeta master existe: ${nombreCarpeta}`);
      }
    }
    console.log('');
  }

  console.log('✅ Todas las carpetas master verificadas!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
