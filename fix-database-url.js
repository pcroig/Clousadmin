#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Script para verificar y corregir DATABASE_URL
 */

const fs = require('fs');
const path = require('path');

const envFiles = ['.env', '.env.local'];

envFiles.forEach(envFile => {
  const filePath = path.join(process.cwd(), envFile);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${envFile} no existe, saltando...`);
    return;
  }

  console.log(`\n📄 Revisando ${envFile}...`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Buscar DATABASE_URL
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    if (line.trim().startsWith('DATABASE_URL=') || line.trim().startsWith('DATABASE_URL =')) {
      // Extraer el valor
      const match = line.match(/DATABASE_URL\s*=\s*["']?([^"']+)["']?/);
      if (match) {
        let url = match[1];
        const originalUrl = url;
        
        // Normalizar: eliminar barras dobles extra y asegurar formato correcto
        if (url.startsWith('postgresql://')) {
          // Eliminar barras dobles adicionales después de postgresql://
          url = url.replace(/postgresql:\/\/+/g, 'postgresql://');
          modified = true;
        } else if (url.startsWith('postgresql:')) {
          url = url.replace(/postgresql:\/*/g, 'postgresql://');
          modified = true;
        } else if (!url.startsWith('postgresql://')) {
          console.log(`⚠️  Formato inesperado en ${envFile}: ${url.substring(0, 30)}...`);
          console.log(`   Formato esperado: postgresql://usuario:password@host:puerto/base_datos`);
          return line;
        }
        
        if (modified) {
          console.log(`✅ Corregido:`);
          console.log(`   Antes: ${originalUrl.substring(0, 50)}...`);
          console.log(`   Ahora: ${url.substring(0, 50)}...`);
          
          // Reemplazar en la línea
          return line.replace(originalUrl, url);
        }
      }
    }
    return line;
  });
  
  if (modified) {
    // Crear backup
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 Backup creado: ${backupPath}`);
    
    // Escribir archivo corregido
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    console.log(`✅ ${envFile} actualizado`);
  } else {
    console.log(`✅ ${envFile} ya tiene el formato correcto`);
  }
});

console.log('\n✨ Verificación completada!');
console.log('\n📝 Formato correcto de DATABASE_URL:');
console.log('   DATABASE_URL="postgresql://usuario:password@localhost:5432/clousadmin"');
console.log('\n💡 Si aún tienes problemas:');
console.log('   1. Verifica que el usuario y contraseña sean correctos');
console.log('   2. Verifica que la base de datos "clousadmin" exista');
console.log('   3. Verifica que el usuario tenga permisos sobre la base de datos');

