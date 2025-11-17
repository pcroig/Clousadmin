# ⏰ Configuración del Cron Job con GitHub Actions

## 📋 Descripción

El sistema utiliza un cron job automatizado para revisar solicitudes pendientes con IA tras 48 horas (configurable). Este documento explica cómo configurarlo usando GitHub Actions.

---

## 🚀 Configuración Rápida

### 1. Generar CRON_SECRET

```bash
# En tu terminal local
openssl rand -base64 32
```

Guarda el resultado, lo necesitarás en el siguiente paso.

### 2. Configurar Secrets en GitHub

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**
5. Agrega los siguientes secrets:

#### Secret 1: `CRON_SECRET`
- **Name**: `CRON_SECRET`
- **Value**: El secret generado en el paso 1
- Click **Add secret**

#### Secret 2: `APP_URL`
- **Name**: `APP_URL`
- **Value**: URL de tu aplicación (ej: `https://clousadmin.com`)
- **Importante**: SIN barra final (/)
- Click **Add secret**

### 3. Agregar variables de entorno a tu hosting

En tu servidor Hetzner (o plataforma de hosting), agrega a `.env`:

```bash
CRON_SECRET=tu-secret-generado-aqui
SOLICITUDES_PERIODO_REVISION_HORAS=48  # Opcional, default 48
```

---

## 📁 Archivos del Sistema

### Workflow: `.github/workflows/cron-revisar-solicitudes.yml`

```yaml
name: Cron - Revisar Solicitudes con IA

on:
  schedule:
    - cron: '0 2 * * *'  # Diario a las 2 AM UTC
  workflow_dispatch:  # Ejecución manual

jobs:
  revisar-solicitudes:
    name: Revisar solicitudes pendientes
    runs-on: ubuntu-latest
    
    steps:
      - name: Ejecutar revisión de solicitudes
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/revisar-solicitudes \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Endpoint: `/app/api/cron/revisar-solicitudes/route.ts`

El endpoint ya está implementado y:
- ✅ Verifica el `CRON_SECRET`
- ✅ Busca solicitudes pendientes con más de 48h
- ✅ Clasifica con IA (auto-aprobable vs revisión manual)
- ✅ Auto-aprueba o marca para revisión
- ✅ Crea notificaciones automáticas
- ✅ Registra logs detallados

---

## 🧪 Testing

### Probar localmente

```bash
# Asegúrate de tener CRON_SECRET configurado en .env.local
curl -X POST http://localhost:3000/api/cron/revisar-solicitudes \
  -H "Authorization: Bearer tu-CRON_SECRET-local"
```

### Probar manualmente en GitHub

1. Ve a tu repositorio en GitHub
2. Click en **Actions**
3. Selecciona **Cron - Revisar Solicitudes con IA**
4. Click en **Run workflow**
5. Click en **Run workflow** (botón verde)
6. Espera unos segundos y verás el resultado

### Verificar logs

```bash
# En los logs del workflow verás:
✅ Status Code: 200
📝 Response:
{
  "success": true,
  "timestamp": "2025-11-08T02:00:00.000Z",
  "solicitudesRevisadas": 5,
  "autoAprobadas": 3,
  "requierenRevision": 2,
  "errores": []
}
```

---

## ⚙️ Configuración Avanzada

### Cambiar horario de ejecución

Edita `.github/workflows/cron-revisar-solicitudes.yml`:

```yaml
schedule:
  - cron: '0 2 * * *'  # Formato: minuto hora día mes díaSemana
```

Ejemplos:
- `0 2 * * *` - Diario a las 2 AM UTC
- `0 */6 * * *` - Cada 6 horas
- `0 8 * * 1-5` - De lunes a viernes a las 8 AM
- `30 14 * * *` - Diario a las 2:30 PM

**Nota**: GitHub Actions usa UTC. Calcula la diferencia con tu zona horaria:
- España (CET/CEST): UTC +1/+2
- Para ejecutar a las 3 AM España (invierno): `0 2 * * *` (2 AM UTC)

### Cambiar periodo de revisión

En tu hosting, modifica:

```bash
SOLICITUDES_PERIODO_REVISION_HORAS=24  # 24 horas en lugar de 48
```

O en el código (`app/api/cron/revisar-solicitudes/route.ts`):

```typescript
const PERIODO_REVISION_HORAS = parseInt(
  process.env.SOLICITUDES_PERIODO_REVISION_HORAS || '48'
);
```

### Notificaciones en caso de error

Si el cron falla, GitHub te enviará un email automáticamente (si tienes las notificaciones activadas).

También puedes configurar notificaciones adicionales:
- Slack: https://github.com/marketplace/actions/slack-notify
- Discord: https://github.com/marketplace/actions/discord-webhook
- Email: https://github.com/marketplace/actions/send-email

---

## 🔒 Seguridad

### ¿Por qué usar CRON_SECRET?

Sin protección, cualquiera podría llamar a `/api/cron/revisar-solicitudes` y ejecutar el proceso:
- ❌ Sobrecarga del servidor
- ❌ Consumo de APIs de IA innecesario
- ❌ Posibles race conditions

Con `CRON_SECRET`:
- ✅ Solo GitHub (o quien tenga el secret) puede ejecutarlo
- ✅ El endpoint verifica: `Authorization: Bearer ${CRON_SECRET}`
- ✅ Si no coincide, retorna 401 Unauthorized

### Rotar el CRON_SECRET

Si crees que el secret se comprometió:

1. Genera uno nuevo:
```bash
openssl rand -base64 32
```

2. Actualiza en GitHub:
   - Settings → Secrets → CRON_SECRET → Update

3. Actualiza en tu servidor Hetzner (archivo `.env`)

4. El cambio es inmediato, no requiere redeploy del código

---

## 🐛 Troubleshooting

### El cron no se ejecuta

**Síntoma**: No hay logs en GitHub Actions

**Solución**:
1. Verifica que el archivo `.github/workflows/cron-revisar-solicitudes.yml` está en el repo
2. Verifica que hiciste push del archivo
3. Ve a Actions y verifica que el workflow esté habilitado
4. Los crons pueden tener hasta 15 min de retraso en GitHub (es normal)

### Error 401 Unauthorized

**Síntoma**: `Status Code: 401`

**Solución**:
1. Verifica que `CRON_SECRET` esté configurado en GitHub Secrets
2. Verifica que `CRON_SECRET` esté configurado en tu hosting
3. Ambos deben ser exactamente iguales (sin espacios extra)

### Error 404 Not Found

**Síntoma**: `Status Code: 404`

**Solución**:
1. Verifica que `APP_URL` en GitHub Secrets sea correcta
2. Verifica que tu app esté desplegada y accesible
3. Verifica que el endpoint `/api/cron/revisar-solicitudes` exista

### El clasificador IA falla

**Síntoma**: `errores` en la respuesta

**Solución**:
1. Verifica que al menos una API key de IA esté configurada:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_AI_API_KEY`
2. Verifica que la API key sea válida
3. Revisa los logs del servidor para más detalles

### Solicitudes no se auto-aprueban

**Síntoma**: Todas van a revisión manual

**Solución**:
1. Verifica que las solicitudes tengan más de 48h (o el periodo configurado)
2. Verifica que `revisadaPorIA: false` en la base de datos
3. Revisa el razonamiento del clasificador en los logs
4. Puede ser que el clasificador determine correctamente que requieren revisión manual

---

## 📊 Monitoreo

### Métricas importantes

- Total de solicitudes revisadas por día
- % auto-aprobadas vs revisión manual
- Tiempo promedio de ejecución del cron
- Tasa de errores

### Logs en producción

Los logs del cron se guardan en:
- **GitHub Actions**: Actions → Workflow → Ver run
- **Tu servidor Hetzner**: Logs de PM2 (`pm2 logs clousadmin`) o logs del sistema (`journalctl`)

Busca líneas como:
```
[CRON Revisar Solicitudes] Iniciando proceso...
[CRON Revisar Solicitudes] 5 solicitudes a revisar
[CRON Revisar Solicitudes] Clasificación: AUTO (confianza: 90%)
[CRON Revisar Solicitudes] Proceso completado
```

---

## 🔄 Migración a Hetzner

Cuando migres a Hetzner, tienes dos opciones:

### Opción 1: Mantener GitHub Actions (Recomendado)

No cambies nada. GitHub Actions seguirá llamando a tu nueva URL en Hetzner.

Solo actualiza el secret `APP_URL` en GitHub:
```
https://tu-nueva-url-hetzner.com
```

### Opción 2: Usar crontab en el servidor

1. SSH a tu servidor Hetzner
2. Edita crontab:
```bash
crontab -e
```

3. Agrega:
```bash
0 2 * * * curl -X POST https://localhost:3000/api/cron/revisar-solicitudes -H "Authorization: Bearer $CRON_SECRET" >> /var/log/cron-solicitudes.log 2>&1
```

4. Guarda y cierra

**Ventaja**: No depende de servicios externos  
**Desventaja**: Logs menos accesibles

---

## ✅ Checklist de Configuración

- [ ] Generar `CRON_SECRET` con `openssl rand -base64 32`
- [ ] Configurar secret `CRON_SECRET` en GitHub
- [ ] Configurar secret `APP_URL` en GitHub
- [ ] Configurar `CRON_SECRET` en el hosting
- [ ] Verificar que el archivo `.github/workflows/cron-revisar-solicitudes.yml` está en el repo
- [ ] Hacer push del workflow al repo
- [ ] Probar ejecución manual en GitHub Actions
- [ ] Esperar 24h y verificar que se ejecutó automáticamente
- [ ] Revisar logs para verificar que funciona correctamente

---

## 📚 Referencias

- [GitHub Actions Cron Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Crontab Guru](https://crontab.guru/) - Generador de expresiones cron
- [Documentación del clasificador IA](./ia/ARQUITECTURA_IA.md)
- [Guía completa de notificaciones](./GUIA_COMPLETA_NOTIFICACIONES.md)

---

**Última actualización**: 8 de Noviembre, 2025  
**Estado**: ✅ Listo para producción

