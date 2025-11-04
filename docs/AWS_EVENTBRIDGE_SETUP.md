# Configuración de AWS EventBridge para Clasificador de Fichajes

## Resumen
El clasificador de fichajes se ejecuta automáticamente cada noche a las 00:30 (hora de España) para procesar todos los fichajes incompletos del día anterior.

## Configuración en AWS

### 1. Crear Secret en AWS Secrets Manager

```bash
# Generar un secret aleatorio
CRON_SECRET=$(openssl rand -base64 32)

# Guardarlo en Secrets Manager
aws secretsmanager create-secret \
  --name clousadmin/cron-secret \
  --secret-string "$CRON_SECRET"
```

### 2. Agregar CRON_SECRET a las variables de entorno

En el archivo `.env` (local) y en la configuración de tu entorno de producción (ECS, Lambda, etc.):

```bash
CRON_SECRET=tu_secret_generado_aqui
```

### 3. Crear EventBridge Rule

#### Opción A: Usando AWS Console

1. Ir a **Amazon EventBridge** → **Rules** → **Create rule**
2. **Name**: `clousadmin-clasificar-fichajes-nocturno`
3. **Event bus**: `default`
4. **Rule type**: Schedule
5. **Schedule pattern**: Cron expression
   ```
   cron(30 23 * * ? *)
   ```
   _Nota: 23:30 UTC = 00:30 CET (España)_
   
6. **Target**: API destination
   - **API destination**: Create new
   - **Name**: `clousadmin-api`
   - **API destination endpoint**: `https://tu-dominio.com/api/cron/clasificar-fichajes`
   - **HTTP method**: POST
   - **Authorization**: None (usaremos header personalizado)
   
7. **Additional settings**:
   - **Headers**: Add header
     - Key: `x-cron-secret`
     - Value: `{{resolve:secretsmanager:clousadmin/cron-secret:SecretString}}`
   
8. **Create rule**

#### Opción B: Usando AWS CLI

```bash
# 1. Crear API Destination
aws events create-api-destination \
  --name clousadmin-api \
  --connection-arn <connection-arn> \
  --invocation-endpoint https://tu-dominio.com/api/cron/clasificar-fichajes \
  --http-method POST

# 2. Crear regla con schedule
aws events put-rule \
  --name clousadmin-clasificar-fichajes-nocturno \
  --schedule-expression "cron(30 23 * * ? *)" \
  --state ENABLED

# 3. Agregar target (API destination)
aws events put-targets \
  --rule clousadmin-clasificar-fichajes-nocturno \
  --targets "Id"="1","Arn"="<api-destination-arn>","RoleArn"="<role-arn>","HttpParameters"="HeaderParameters={x-cron-secret=\$CRON_SECRET}"
```

### 4. Configurar IAM Role para EventBridge

EventBridge necesita permisos para invocar la API:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "events:InvokeApiDestination"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:region:account-id:secret:clousadmin/cron-secret-*"
    }
  ]
}
```

## Alternativa: AWS Lambda con CloudWatch Events

Si prefieres usar Lambda en lugar de llamar directamente a la API:

### 1. Crear función Lambda

```typescript
// lambda/clasificar-fichajes/index.ts
import axios from 'axios';

export const handler = async () => {
  const apiUrl = process.env.API_URL; // https://tu-dominio.com
  const cronSecret = process.env.CRON_SECRET;

  try {
    const response = await axios.post(
      `${apiUrl}/api/cron/clasificar-fichajes`,
      {},
      {
        headers: {
          'x-cron-secret': cronSecret,
        },
      }
    );

    console.log('Clasificación completada:', response.data);
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('Error ejecutando clasificador:', error);
    throw error;
  }
};
```

### 2. Configurar CloudWatch Event

```bash
# Crear regla
aws events put-rule \
  --name clousadmin-clasificar-fichajes \
  --schedule-expression "cron(30 23 * * ? *)"

# Agregar Lambda como target
aws events put-targets \
  --rule clousadmin-clasificar-fichajes \
  --targets "Id"="1","Arn"="arn:aws:lambda:region:account-id:function:clasificar-fichajes"

# Dar permisos a EventBridge para invocar Lambda
aws lambda add-permission \
  --function-name clasificar-fichajes \
  --statement-id AllowEventBridgeInvoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:region:account-id:rule/clousadmin-clasificar-fichajes
```

## Prueba Manual

Puedes probar el endpoint manualmente desde la consola de HR o usando curl:

```bash
curl -X POST https://tu-dominio.com/api/cron/clasificar-fichajes \
  -H "x-cron-secret: tu_secret_aqui"
```

O desde la interfaz HR (solo HR admins):

```bash
curl -X POST https://tu-dominio.com/api/fichajes/clasificar \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=..." \
  -d '{"fecha": "2025-10-27"}'
```

## Monitoreo

- **CloudWatch Logs**: Revisa los logs de la aplicación para ver el resultado de cada ejecución
- **EventBridge Metrics**: Revisa métricas de invocaciones fallidas
- **Dashboard HR**: Los resultados aparecen en el widget de "Fichajes Auto-completados"

## Troubleshooting

### El cron no se ejecuta
- Verifica que la regla esté en estado `ENABLED`
- Revisa CloudWatch Logs para ver errores
- Verifica que el endpoint sea accesible desde AWS (no localhost)

### Error 401 (No autorizado)
- Verifica que `CRON_SECRET` esté configurado correctamente en ambos lados
- Revisa que el header `x-cron-secret` se esté enviando

### No se procesan fichajes
- Verifica que haya fichajes incompletos en la BD
- Revisa los logs de la aplicación para ver si hay errores en el clasificador
- Ejecuta manualmente desde HR para debuggear



