#!/bin/bash

# ========================================
# Diagnóstico 504 Gateway Timeout
# ========================================
# Script para diagnosticar problemas de timeout en producción

set -e

echo "🔍 DIAGNÓSTICO 504 GATEWAY TIMEOUT"
echo "=================================="
echo ""

# 1. Verificar estado de PM2
echo "1️⃣ Verificando estado de PM2..."
echo "-----------------------------------"
pm2 status || echo "❌ PM2 no está instalado o no hay procesos"
echo ""

# 2. Verificar logs recientes de la aplicación
echo "2️⃣ Últimos errores en logs de la aplicación..."
echo "-----------------------------------"
pm2 logs clousadmin --err --lines 20 --nostream 2>/dev/null || echo "⚠️ No se pudieron obtener logs"
echo ""

# 3. Verificar que Next.js esté escuchando
echo "3️⃣ Verificando que Next.js esté escuchando en puerto 3000..."
echo "-----------------------------------"
if netstat -tlnp 2>/dev/null | grep -q ":3000" || ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "✅ Next.js está escuchando en puerto 3000"
    netstat -tlnp 2>/dev/null | grep ":3000" || ss -tlnp 2>/dev/null | grep ":3000"
else
    echo "❌ Next.js NO está escuchando en puerto 3000"
fi
echo ""

# 4. Verificar configuración de nginx
echo "4️⃣ Verificando configuración de nginx..."
echo "-----------------------------------"
if [ -f /etc/nginx/sites-available/default ]; then
    echo "📄 Archivo de configuración: /etc/nginx/sites-available/default"
    echo "Timeout settings:"
    grep -E "proxy_(connect|send|read)_timeout|send_timeout" /etc/nginx/sites-available/default || echo "⚠️ No se encontraron configuraciones de timeout"
else
    echo "⚠️ No se encontró archivo de configuración de nginx"
fi
echo ""

# 5. Verificar estado de nginx
echo "5️⃣ Verificando estado de nginx..."
echo "-----------------------------------"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx está activo"
    systemctl status nginx --no-pager -l | head -10
else
    echo "❌ Nginx NO está activo"
fi
echo ""

# 6. Verificar logs de nginx (errores recientes)
echo "6️⃣ Últimos errores en logs de nginx..."
echo "-----------------------------------"
if [ -f /var/log/nginx/error.log ]; then
    tail -20 /var/log/nginx/error.log | grep -i "timeout\|504\|upstream" || echo "No se encontraron errores de timeout recientes"
else
    echo "⚠️ No se encontró archivo de log de errores de nginx"
fi
echo ""

# 7. Verificar conexión a base de datos
echo "7️⃣ Verificando conexión a base de datos..."
echo "-----------------------------------"
if [ -n "$DATABASE_URL" ]; then
    if command -v psql &> /dev/null; then
        if timeout 5 psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            echo "✅ Conexión a base de datos exitosa"
        else
            echo "❌ No se pudo conectar a la base de datos (timeout o error)"
        fi
    else
        echo "⚠️ psql no está instalado, no se puede verificar conexión"
    fi
else
    echo "⚠️ DATABASE_URL no está definida"
fi
echo ""

# 8. Verificar recursos del sistema
echo "8️⃣ Verificando recursos del sistema..."
echo "-----------------------------------"
echo "Uso de memoria:"
free -h
echo ""
echo "Uso de CPU (top 5 procesos):"
ps aux --sort=-%cpu | head -6
echo ""

# 9. Verificar procesos de Node.js
echo "9️⃣ Verificando procesos de Node.js..."
echo "-----------------------------------"
ps aux | grep -E "node|next" | grep -v grep || echo "No se encontraron procesos de Node.js"
echo ""

# 10. Probar conexión local a Next.js
echo "🔟 Probando conexión local a Next.js..."
echo "-----------------------------------"
if curl -s --max-time 5 http://localhost:3000 > /dev/null; then
    echo "✅ Next.js responde localmente"
else
    echo "❌ Next.js NO responde localmente (timeout o error)"
fi
echo ""

# 11. Verificar variables de entorno críticas
echo "1️⃣1️⃣ Verificando variables de entorno críticas..."
echo "-----------------------------------"
if [ -n "$DATABASE_URL" ]; then
    echo "✅ DATABASE_URL está definida"
else
    echo "❌ DATABASE_URL NO está definida"
fi

if [ -n "$NEXTAUTH_SECRET" ]; then
    echo "✅ NEXTAUTH_SECRET está definida"
else
    echo "❌ NEXTAUTH_SECRET NO está definida"
fi

if [ -n "$ENCRYPTION_KEY" ]; then
    echo "✅ ENCRYPTION_KEY está definida"
else
    echo "❌ ENCRYPTION_KEY NO está definida"
fi
echo ""

echo "=================================="
echo "✅ DIAGNÓSTICO COMPLETADO"
echo "=================================="
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Revisar los errores encontrados arriba"
echo "2. Si nginx timeout es 60s, aumentarlo a 300s"
echo "3. Si Next.js no responde, revisar logs de PM2"
echo "4. Si hay problemas de BD, verificar conexión y queries"
echo ""
echo "📖 Ver documentación completa: docs/troubleshooting/504-gateway-timeout.md"
