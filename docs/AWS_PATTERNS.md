# ☁️ AWS INTEGRATION PATTERNS - CLOUSADMIN

Patrones específicos para integración con servicios AWS.

---

## 📁 S3 File Upload

```typescript
// lib/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: file,
    ContentType: contentType
  }));

  return key;
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key
  });

  // URL firmada válida por 5 minutos
  return getSignedUrl(s3Client, command, { expiresIn: 300 });
}
```

---

## 🔐 Cognito Authentication

```typescript
// lib/auth.ts
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION!
});

export async function signIn(email: string, password: string) {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_CLIENT_ID!,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  });

  const response = await cognitoClient.send(command);
  return response.AuthenticationResult;
}
```

---

## 🤖 AI Integration (OpenAI)

### OpenAI Client Setup
```typescript
// lib/openai.ts
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// lib/ia/extraer-contrato.ts
import { openai } from '@/lib/openai';

export async function extraerDatosContrato(pdfBuffer: Buffer): Promise<ContratoData> {
  // Convert PDF to base64 for GPT-4 Vision
  const base64Pdf = pdfBuffer.toString('base64');

  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'system',
        content: 'Eres un asistente que extrae datos de contratos laborales españoles.'
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:application/pdf;base64,${base64Pdf}` }
          },
          {
            type: 'text',
            text: 'Extrae: nombre, apellidos, NIF, puesto, salario bruto anual, fecha de inicio, tipo de contrato.'
          }
        ]
      }
    ],
    response_format: { type: 'json_object' }
  });

  const extracted = JSON.parse(response.choices[0].message.content!);
  return contratoSchema.parse(extracted);
}
```

---

## 📧 SES Email Integration

```typescript
// lib/ses.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.SES_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const command = new SendEmailCommand({
    Source: process.env.SES_FROM_EMAIL!,
    Destination: {
      ToAddresses: [to]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8'
        }
      }
    }
  });

  await sesClient.send(command);
}
```

---

## 🔧 Environment Variables

```env
# AWS Configuration
AWS_REGION="eu-west-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# S3
S3_BUCKET="clousadmin-documents"

# Cognito
COGNITO_USER_POOL_ID="eu-west-1_xxxxxxxxx"
COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
COGNITO_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# SES
SES_FROM_EMAIL="noreply@clousadmin.com"
SES_REGION="eu-west-1"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## 🚀 Deployment Considerations

### Production Setup
1. **IAM Roles**: Use IAM roles instead of access keys when possible
2. **Environment Variables**: Set all AWS variables in production environment
3. **S3 Bucket**: Configure CORS and bucket policies
4. **Cognito**: Set up proper user pool policies
5. **SES**: Verify domain and email addresses

### Security Best Practices
- Never commit AWS credentials to version control
- Use least privilege principle for IAM policies
- Enable CloudTrail for audit logging
- Use AWS Secrets Manager for sensitive data
- Implement proper CORS policies for S3

---

**Versión**: 1.0  
**Última actualización**: 25 de octubre 2025
