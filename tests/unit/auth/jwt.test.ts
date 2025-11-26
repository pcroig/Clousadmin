/**
 * Tests unitarios para JWT y autenticación
 * PRIORIDAD: CRÍTICA (seguridad)
 */

import * as jose from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';

import { UsuarioRol } from '@/lib/constants/enums';

describe('JWT Token Management', () => {
  const secret = new TextEncoder().encode('test-secret-key-for-testing');

  describe('Token creation', () => {
    it('debe crear un token JWT válido con payload correcto', async () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        rol: UsuarioRol.empleado,
        empresaId: 'empresa-123',
      };

      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .setIssuedAt()
        .sign(secret);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT tiene 3 partes
    });

    it('debe incluir claims de expiración e issued at', async () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);

      const { payload: decoded } = await jose.jwtVerify(token, secret);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat!);
    });
  });

  describe('Token verification', () => {
    it('debe verificar un token válido correctamente', async () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        rol: UsuarioRol.hr_admin,
      };

      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);

      const { payload: verified } = await jose.jwtVerify(token, secret);

      expect(verified.id).toBe('user-123');
      expect(verified.email).toBe('test@example.com');
      expect(verified.rol).toBe(UsuarioRol.hr_admin);
    });

    it('debe rechazar token con firma incorrecta', async () => {
      const payload = { id: 'user-123' };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);

      // Intentar verificar con otra clave
      const wrongSecret = new TextEncoder().encode('wrong-secret');

      await expect(jose.jwtVerify(token, wrongSecret)).rejects.toThrow();
    });

    it('debe rechazar token expirado', async () => {
      const payload = { id: 'user-123' };

      // Crear token que expira en 1 segundo
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1s')
        .setIssuedAt()
        .sign(secret);

      // Esperar 2 segundos para que expire
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await expect(jose.jwtVerify(token, secret)).rejects.toThrow();
    }, 3000);

    it('debe rechazar token malformado', async () => {
      const tokenMalformado = 'esto.no.es.un.jwt.valido';

      await expect(jose.jwtVerify(tokenMalformado, secret)).rejects.toThrow();
    });

    it('debe rechazar token vacío', async () => {
      await expect(jose.jwtVerify('', secret)).rejects.toThrow();
    });
  });

  describe('Token payload validation', () => {
    it('debe preservar todos los campos del payload', async () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        nombre: 'Juan',
        apellidos: 'Pérez',
        rol: UsuarioRol.manager,
        empresaId: 'empresa-456',
        empleadoId: 'empleado-789',
      };

      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);

      const { payload: verified } = await jose.jwtVerify(token, secret);

      expect(verified.id).toBe(payload.id);
      expect(verified.email).toBe(payload.email);
      expect(verified.nombre).toBe(payload.nombre);
      expect(verified.apellidos).toBe(payload.apellidos);
      expect(verified.rol).toBe(payload.rol);
      expect(verified.empresaId).toBe(payload.empresaId);
      expect(verified.empleadoId).toBe(payload.empleadoId);
    });

    it('debe manejar payload mínimo correctamente', async () => {
      const payload = {
        id: 'user-123',
        empresaId: 'empresa-123',
      };

      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);

      const { payload: verified } = await jose.jwtVerify(token, secret);

      expect(verified.id).toBe(payload.id);
      expect(verified.empresaId).toBe(payload.empresaId);
    });
  });

  describe('Token expiration times', () => {
    it('debe crear token con expiración de 24 horas', async () => {
      const payload = { id: 'user-123' };
      const ahora = Date.now();

      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .setIssuedAt()
        .sign(secret);

      const { payload: verified } = await jose.jwtVerify(token, secret);

      const exp = verified.exp! * 1000; // Convertir a milisegundos
      const iat = verified.iat! * 1000;

      const duracion = exp - iat;
      const duracionEsperada = 24 * 60 * 60 * 1000; // 24 horas en ms

      // Permitir margen de 1 segundo
      expect(duracion).toBeGreaterThanOrEqual(duracionEsperada - 1000);
      expect(duracion).toBeLessThanOrEqual(duracionEsperada + 1000);
    });

    it('debe crear token con expiración de 7 días', async () => {
      const payload = { id: 'user-123' };

      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .setIssuedAt()
        .sign(secret);

      const { payload: verified } = await jose.jwtVerify(token, secret);

      const exp = verified.exp! * 1000;
      const iat = verified.iat! * 1000;

      const duracion = exp - iat;
      const duracionEsperada = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

      expect(duracion).toBeGreaterThanOrEqual(duracionEsperada - 1000);
      expect(duracion).toBeLessThanOrEqual(duracionEsperada + 1000);
    });
  });

  describe('Security tests', () => {
    it('NO debe permitir modificar payload sin invalidar firma', async () => {
      const payload = { id: 'user-123', rol: UsuarioRol.empleado };

      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);

      // Intentar manipular el token (cambiar rol a admin)
      const [header, payloadPart, signature] = token.split('.');

      // Decodificar payload, modificarlo y re-codificarlo
      const decodedPayload = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString()
      );
      decodedPayload.rol = UsuarioRol.platform_admin; // Escalación de privilegios

      const modifiedPayloadPart = Buffer.from(
        JSON.stringify(decodedPayload)
      ).toString('base64url');

      const tokenModificado = `${header}.${modifiedPayloadPart}.${signature}`;

      // Debe fallar la verificación
      await expect(jose.jwtVerify(tokenModificado, secret)).rejects.toThrow();
    });

    it('NO debe aceptar algorithm "none"', async () => {
      // Intentar crear token sin firma (algorithm "none")
      const payload = { id: 'user-123', rol: UsuarioRol.platform_admin };
      const header = Buffer.from(
        JSON.stringify({ alg: 'none', typ: 'JWT' })
      ).toString('base64url');
      const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString(
        'base64url'
      );

      const tokenSinFirma = `${header}.${payloadEncoded}.`;

      // Debe rechazar token sin firma
      await expect(jose.jwtVerify(tokenSinFirma, secret)).rejects.toThrow();
    });
  });

  describe('Roles validation', () => {
    it('debe preservar rol de empleado', async () => {
      const payload = { id: 'user-123', rol: UsuarioRol.empleado };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);

      const { payload: verified } = await jose.jwtVerify(token, secret);
      expect(verified.rol).toBe(UsuarioRol.empleado);
    });

    it('debe preservar rol de manager', async () => {
      const payload = { id: 'user-123', rol: UsuarioRol.manager };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);

      const { payload: verified } = await jose.jwtVerify(token, secret);
      expect(verified.rol).toBe(UsuarioRol.manager);
    });

    it('debe preservar rol de HR admin', async () => {
      const payload = { id: 'user-123', rol: UsuarioRol.hr_admin };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);

      const { payload: verified } = await jose.jwtVerify(token, secret);
      expect(verified.rol).toBe(UsuarioRol.hr_admin);
    });

    it('debe preservar rol de platform admin', async () => {
      const payload = { id: 'user-123', rol: UsuarioRol.platform_admin };
      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret);

      const { payload: verified } = await jose.jwtVerify(token, secret);
      expect(verified.rol).toBe(UsuarioRol.platform_admin);
    });
  });
});
