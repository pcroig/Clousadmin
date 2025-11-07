# Setup de Autenticación - Guía Rápida

## 1. Database Setup

Ya está completado si ejecutaste el setup inicial. Si no:

```bash
# Ejecutar migraciones
npx prisma migrate dev

# Seed con datos de prueba
npm run seed
```

## 2. Verificar Credenciales

Después del seed, deberías poder acceder con:

| Rol       | Email                            | Contraseña    |
|-----------|----------------------------------|---------------|
| HR Admin  | admin@clousadmin.com             | Admin123!     |
| Manager   | carlos.martinez@clousadmin.com   | Empleado123!  |
| Empleado  | ana.garcia@clousadmin.com        | Empleado123!  |

## 3. Probar Login

```bash
npm run dev
```

Visita `http://localhost:3000/login` e ingresa credenciales.

## 4. Probar Invitaciones

### Desde API (Postman / curl)

```bash
# 1. Login como HR Admin para obtener sesión
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clousadmin.com","password":"Admin123!"}'

# 2. Crear empleado (desde UI o API)

# 3. Enviar invitación
curl -X POST http://localhost:3000/api/empleados/invitar \
  -H "Content-Type: application/json" \
  -H "Cookie: clousadmin-session=TU_TOKEN" \
  -d '{"empleadoId":"UUID","email":"nuevo@empresa.com"}'

# 4. Copiar URL de respuesta y abrir en navegador
# 5. Completar onboarding con contraseña
```

### Desde UI (TODO: implementar botón)

1. Login como HR Admin
2. Ir a `Organización > Personas`
3. Crear nuevo empleado
4. Click "Enviar invitación" (próximamente)

## 5. Troubleshooting

### Error "No tienes un empleado asignado"

```bash
npx tsx scripts/fix-usuarios-sin-empleado.ts
```

### Reset completo de database

```bash
npx prisma migrate reset
npm run seed
```

### Ver datos en Prisma Studio

```bash
npx prisma studio
```

Abre en `http://localhost:5555`

## 6. Próximos Pasos

- [ ] Configurar email service (AWS SES o Resend)
- [ ] Implementar botón "Enviar invitación" en UI
- [ ] Configurar Google OAuth
- [ ] Implementar recuperación de contraseña

---

Para documentación completa, ver `docs/funcionalidades/autenticacion.md`




















