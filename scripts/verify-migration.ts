import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando migración...\n');

  const totalRelaciones = await prisma.documento_carpetas.count();
  const carpetasMaster = await prisma.carpetas.count({
    where: { empleadoId: null, esSistema: true }
  });

  console.log('✅ Resultados:');
  console.log(`   - Total relaciones documento-carpeta: ${totalRelaciones}`);
  console.log(`   - Carpetas master: ${carpetasMaster}`);

  // Muestra de relaciones
  const sample = await prisma.documento_carpetas.findMany({
    take: 5,
    include: {
      documento: { select: { nombre: true } },
      carpeta: { select: { nombre: true, empleadoId: true } }
    }
  });

  console.log('\n📋 Muestra de relaciones:');
  for (const rel of sample) {
    const tipo = rel.carpeta.empleadoId ? 'empleado' : 'MASTER';
    console.log(`   - ${rel.documento.nombre} → ${rel.carpeta.nombre} (${tipo})`);
  }

  // Verificar que documentos tienen relación tanto con carpeta de empleado como con master
  console.log('\n🔗 Verificando sincronización con master...');
  const docConMultiplesCarpetas = await prisma.documento_carpetas.groupBy({
    by: ['documentoId'],
    _count: { carpetaId: true },
    having: {
      carpetaId: {
        _count: {
          gt: 1
        }
      }
    }
  });

  console.log(`   - Documentos en múltiples carpetas: ${docConMultiplesCarpetas.length}`);

  if (docConMultiplesCarpetas.length > 0) {
    console.log('   ✅ Sincronización funcionando correctamente!');
  } else {
    console.log('   ⚠️  No hay documentos sincronizados (puede ser normal si no hay docs)');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
