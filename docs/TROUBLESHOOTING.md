# 🔧 Troubleshooting - Problemas Comunes

Guía para solucionar problemas comunes en Clousadmin.

---

## ❌ Problema: Prisma Studio muestra error "Unable to communicate with Prisma Client"

### Síntomas
- En `localhost:5555` aparece el error: `"Unable to communicate with Prisma Client. Is Studio still running?"`
- Los queries en Prisma Studio fallan

### Solución

**1. Detener Prisma Studio**
```bash
# Si está ejecutándose, presiona Ctrl+C para detenerlo
```

**2. Regenerar Prisma Client**
```bash
npm run db:generate
```

**3. Reiniciar Prisma Studio**
```bash
npm run db:studio
```

**Si el problema persiste:**

**4. Verificar conexión a la base de datos**
```bash
# Ejecutar script de diagnóstico
tsx scripts/diagnostico-prisma.ts
```

**5. Verificar variables de entorno**
- Asegúrate de que existe `.env.local` con `DATABASE_URL` correcto
- Formato: `postgresql://usuario:password@localhost:5432/clousadmin`

**6. Limpiar y regenerar todo**
```bash
# Limpiar artefactos de Prisma y regenerar
rm -rf node_modules/.prisma
npm run db:generate
npm run db:studio
```

---

## ❌ Problema: La plataforma muestra "sin datos" en localhost:3000

### Síntomas
- La aplicación carga pero no muestra datos
- Las tablas están vacías o no se cargan
- No hay errores visibles en la UI

### Solución

**1. Verificar errores en la consola del navegador**
- Abre DevTools (F12) → Console
- Busca errores en rojo relacionados con:
  - `fetch` failures
  - `401 Unauthorized`
  - `500 Internal Server Error`

**2. Verificar errores en el servidor**
- Mira la terminal donde está corriendo `npm run dev`
- Busca errores relacionados con Prisma o base de datos

**3. Ejecutar diagnóstico**
```bash
tsx scripts/diagnostico-prisma.ts
```

**4. Verificar que hay datos en la base de datos**
```bash
# Conectar a PostgreSQL
psql postgresql://usuario:password@localhost:5432/clousadmin

# Verificar empresas
SELECT COUNT(*) FROM empresas;

# Verificar empleados
SELECT COUNT(*) FROM empleados;

# Si no hay datos, ejecutar seed
npm run seed
```

**5. Verificar autenticación**
- Asegúrate de estar logueado
- Verifica que la sesión tiene `empresaId` y `empleadoId` correctos
- Revisa las cookies del navegador (DevTools → Application → Cookies)

**6. Verificar permisos de usuario**
- Si eres HR admin, deberías ver todos los datos
- Si eres empleado, solo verás tus propios datos

---

## ❌ Problema: Error al conectarse a la base de datos

### Síntomas
- Errores como: `Can't reach database server`
- `Connection refused`
- `Authentication failed`

### Solución

**1. Verificar que PostgreSQL está ejecutándose**
```bash
# macOS
brew services list | grep postgresql

# Si no está corriendo:
brew services start postgresql

# Linux
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**2. Verificar DATABASE_URL en .env.local**
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/clousadmin"
```

**3. Probar conexión manual**
```bash
psql postgresql://usuario:password@localhost:5432/clousadmin

# Si falla, verifica:
# - Usuario existe
# - Contraseña es correcta
# - Base de datos existe
```

**4. Crear base de datos si no existe**
```bash
psql postgres
CREATE DATABASE clousadmin;
\q
```

**5. Aplicar migraciones**
```bash
npm run db:deploy
# O si estás en desarrollo:
npm run db:migrate
```

---

## ❌ Problema: Prisma Client no está generado

### Síntomas
- Errores de TypeScript: `Cannot find module '@prisma/client'`
- Errores en runtime: `PrismaClient is not defined`

### Solución

**1. Generar Prisma Client**
```bash
npm run db:generate
```

**2. Verificar que node_modules existe**
```bash
# Si no existe, reinstalar dependencias
npm install
npm run db:generate
```

**3. Reiniciar servidor de desarrollo**
```bash
# Detener con Ctrl+C
npm run dev
```

---

## ❌ Problema: Errores después de cambios en schema.prisma

### Síntomas
- Errores de tipos TypeScript
- Queries fallan
- Modelos no actualizados

### Solución

**1. Crear y aplicar migración**
```bash
npm run db:migrate -- --name descripcion_cambio
```

**2. Regenerar Prisma Client**
```bash
npm run db:generate
```

**3. Reiniciar servidor**
```bash
# Detener y reiniciar
npm run dev
```

---

## 🔍 Herramientas de Diagnóstico

### Script de Diagnóstico Automático
```bash
tsx scripts/diagnostico-prisma.ts
```

Este script verifica:
- ✅ Variables de entorno
- ✅ Conexión a base de datos
- ✅ Esquema de base de datos
- ✅ Prisma Client
- ✅ Conteo de registros

### Comandos Útiles

**Ver estado de migraciones**
```bash
npx prisma migrate status
```

**Ver esquema de base de datos**
```bash
npx prisma db pull
```

**Resetear base de datos (CUIDADO: borra todos los datos)**
```bash
npx prisma migrate reset
```

**Formatear schema.prisma**
```bash
npx prisma format
```

---

## 📞 Siguiente Paso

Si ninguno de estos pasos resuelve el problema:

1. Ejecuta el diagnóstico completo:
   ```bash
   tsx scripts/diagnostico-prisma.ts
   ```

2. Revisa los logs del servidor:
   - Busca errores en la terminal de `npm run dev`
   - Revisa errores en la consola del navegador

3. Verifica que todos los pasos de SETUP.md se completaron correctamente

4. Si el problema persiste, incluye en tu reporte:
   - Salida completa del script de diagnóstico
   - Errores de consola (navegador y servidor)
   - Versión de Node.js: `node --version`
   - Versión de PostgreSQL: `psql --version`

