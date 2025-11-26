#!/usr/bin/env tsx
/**
 * Script para agregar type casting a todos los await response.json()
 * Arregla el error: 'data' is of type 'unknown'
 */

import { readFileSync, writeFileSync } from 'fs';

import { globSync } from 'glob';

const files = globSync('app/**/*.{ts,tsx}', { 
  ignore: ['**/node_modules/**', '**/.next/**'] 
});

let filesModified = 0;
let linesModified = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  let modified = false;
  
  // Pattern 1: const data = await response.json();
  // Agregar: as Record<string, any>
  const pattern1 = /const\s+(\w+)\s+=\s+await\s+(\w+)\.json\(\);/g;
  const newContent = content.replace(pattern1, (match, varName, responseName) => {
    // No reemplazar si ya tiene 'as'
    if (content.includes(`${match.slice(0, -1)} as `)) {
      return match;
    }
    modified = true;
    linesModified++;
    return `const ${varName} = await ${responseName}.json() as Record<string, any>;`;
  });
  
  if (modified) {
    writeFileSync(file, newContent, 'utf-8');
    filesModified++;
    console.log(`✓ ${file}`);
  }
  
  content = newContent;
}

console.log(`\n✅ Archivos modificados: ${filesModified}`);
console.log(`✅ Líneas modificadas: ${linesModified}`);

