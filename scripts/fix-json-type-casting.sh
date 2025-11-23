#!/bin/bash
# Script para agregar type casting a todos los await response.json()

echo "🔍 Buscando archivos con await .json() sin type casting..."

# Contador
count=0

# Buscar todos los archivos .ts y .tsx en app/
find app -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  # Verificar si el archivo tiene el patrón sin 'as'
  if grep -q "const .* = await .*\.json();" "$file" && ! grep -q "await .*\.json() as" "$file"; then
    echo "✓ Procesando: $file"
    
    # Usar sed para agregar el type casting
    # Patrón: const VARIABLE = await RESPONSE.json();
    # Reemplazo: const VARIABLE = await RESPONSE.json() as Record<string, any>;
    sed -i.bak -E 's/(const [a-zA-Z_][a-zA-Z0-9_]* = await [a-zA-Z_][a-zA-Z0-9_]*\.json\(\));/\1 as Record<string, any>;/g' "$file"
    
    # Eliminar backup
    rm -f "${file}.bak"
    
    ((count++))
  fi
done

echo ""
echo "✅ Archivos procesados: $count"

