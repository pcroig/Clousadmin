# 🚀 Pasos para Activar el Cron Job - GUÍA RÁPIDA

## ✅ Lo que ya está implementado

- ✅ Endpoint `/api/cron/revisar-solicitudes` listo y funcional
- ✅ Validación de variables de entorno en `lib/env.ts`
- ✅ Workflow de GitHub Actions configurado
- ✅ Documentación completa en `docs/CONFIGURACION_CRON_GITHUB.md`

---

## 📋 Pasos que DEBES hacer (5 minutos)

### 1. Generar CRON_SECRET

```bash
openssl rand -base64 32
```

Copia el resultado, lo necesitas en los siguientes pasos.

---

### 2. Configurar Secrets en GitHub

1. Ve a: https://github.com/TU_USUARIO/TU_REPO/settings/secrets/actions
2. Click en **"New repository secret"**
3. Crea estos 2 secrets:

**Secret 1:**
- Name: `CRON_SECRET`
- Value: [pega el secret del paso 1]

**Secret 2:**
- Name: `APP_URL`
- Value: `https://tu-app.com` (SIN barra final)

---

### 3. Configurar en tu hosting (Vercel/AWS/etc.)

En el dashboard de tu hosting, agrega estas variables de entorno:

```bash
CRON_SECRET=tu-secret-del-paso-1
SOLICITUDES_PERIODO_REVISION_HORAS=48
```

**Importante**: Usa el MISMO secret que pusiste en GitHub.

---

### 4. Push de los archivos nuevos

```bash
git add .github/workflows/cron-revisar-solicitudes.yml
git add lib/env.ts
git add docs/CONFIGURACION_CRON_GITHUB.md
git add .env.example
git commit -m "feat(cron): configurar cron job para revisar solicitudes con IA"
git push
```

---

### 5. Probar manualmente (Opcional pero recomendado)

1. Ve a: https://github.com/TU_USUARIO/TU_REPO/actions
2. Click en **"Cron - Revisar Solicitudes con IA"**
3. Click en **"Run workflow"** → **"Run workflow"**
4. Espera 30 segundos y verás el resultado

Si ves `✅ Status Code: 200` → ¡Funciona!

---

## ⏰ Cuándo se ejecutará automáticamente

- **Horario**: Diario a las 2:00 AM UTC (3:00 AM España en invierno)
- **Primera ejecución**: Esta noche a las 2 AM
- **Logs**: Los verás en GitHub Actions al día siguiente

---

## 🔧 Si algo falla

**Error 401 Unauthorized:**
- Verifica que `CRON_SECRET` sea igual en GitHub y en tu hosting

**Error 404 Not Found:**
- Verifica que `APP_URL` sea correcto y tu app esté desplegada

**Más ayuda:**
- Lee la documentación completa: `docs/CONFIGURACION_CRON_GITHUB.md`

---

## 📊 Qué hace el cron

1. Se ejecuta diariamente a las 2 AM
2. Busca solicitudes con más de 48h sin revisar
3. Las clasifica con IA (auto-aprobable vs revisión manual)
4. Auto-aprueba las seguras o marca las que necesitan revisión
5. Crea notificaciones automáticas
6. Registra todo en logs

---

## ✅ Checklist

- [ ] Generar `CRON_SECRET`
- [ ] Configurar `CRON_SECRET` en GitHub Secrets
- [ ] Configurar `APP_URL` en GitHub Secrets
- [ ] Configurar `CRON_SECRET` en el hosting
- [ ] Push de los archivos al repo
- [ ] Probar ejecución manual en GitHub Actions
- [ ] Esperar 24h y verificar que se ejecutó automáticamente

---

**Tiempo estimado**: 5 minutos  
**Dificultad**: Baja  
**Estado**: ✅ Todo listo para activarse

