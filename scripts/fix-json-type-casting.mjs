#!/usr/bin/env node
/**
 * Script para agregar type casting a todos los await response.json()
 * Arregla el error: 'data' is of type 'unknown'
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

function getAllFiles(dir, files = []) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!item.startsWith('.') && item !== 'node_modules') {
        getAllFiles(fullPath, files);
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

const files = getAllFiles('app');

let filesModified = 0;
let linesModified = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  let modified = false;
  
  // Pattern: const data = await response.json();
  // Buscar líneas que NO tienen 'as' después de .json()
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    // Si la línea tiene await .json() pero NO tiene 'as'
    const hasAwaitJson = /const\s+\w+\s+=\s+await\s+\w+\.json\(\);/.test(line);
    const hasTypeCast = line.includes(' as ');
    
    if (hasAwaitJson && !hasTypeCast) {
      modified = true;
      linesModified++;
      // Reemplazar .json(); por .json() as Record<string, any>;
      return line.replace(/\.json\(\);/, '.json() as Record<string, any>;');
    }
    
    return line;
  });
  
  if (modified) {
    writeFileSync(file, newLines.join('\n'), 'utf-8');
    filesModified++;
    console.log(`✓ ${file}`);
  }
}

console.log(`\n✅ Archivos modificados: ${filesModified}`);
console.log(`✅ Líneas modificadas: ${linesModified}`);

