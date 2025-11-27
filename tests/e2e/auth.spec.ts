/**
 * E2E Tests: Autenticación
 * Flujo completo de login, autenticación y logout
 */

import { expect, test } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ir a la página de login antes de cada test
    await page.goto('/login');
  });

  test('debe mostrar el formulario de login', async ({ page }) => {
    // Verificar que estamos en la página correcta
    await expect(page).toHaveURL(/\/login/);

    // Verificar elementos del formulario
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña|password/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /iniciar sesión|entrar|login/i })
    ).toBeVisible();
  });

  test('debe rechazar credenciales inválidas', async ({ page }) => {
    // Intentar login con credenciales incorrectas
    await page.getByLabel(/email/i).fill('usuario@noexiste.com');
    await page.getByLabel(/contraseña|password/i).fill('passwordincorrecta');
    await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();

    // Debe mostrar mensaje de error
    await expect(page.getByText(/credenciales incorrectas|error/i)).toBeVisible({
      timeout: 5000,
    });

    // NO debe redireccionar
    await expect(page).toHaveURL(/\/login/);
  });

  test('empleado debe poder hacer login', async ({ page }) => {
    // Login con credenciales de empleado del seed
    await page.getByLabel(/email/i).fill('ana.garcia@clousadmin.com');
    await page.getByLabel(/contraseña|password/i).fill('Empleado123!');
    await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();

    // Debe redireccionar al dashboard
    await expect(page).toHaveURL(/\/(dashboard|empleado)/, { timeout: 10000 });

    // Debe mostrar el nombre del usuario
    await expect(page.getByText(/Ana García/i)).toBeVisible({ timeout: 5000 });
  });

  test('HR admin debe poder hacer login', async ({ page }) => {
    // Login con credenciales de HR admin del seed
    await page.getByLabel(/email/i).fill('admin@clousadmin.com');
    await page.getByLabel(/contraseña|password/i).fill('Admin123!');
    await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();

    // Debe redireccionar al dashboard HR
    await expect(page).toHaveURL(/\/(dashboard|hr)/, { timeout: 10000 });

    // Debe mostrar opciones de HR
    await expect(
      page.getByText(/organizaci[oó]n|empleados|recursos humanos/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('debe rechazar email sin formato válido', async ({ page }) => {
    // Intentar con email inválido
    await page.getByLabel(/email/i).fill('no-es-un-email');
    await page.getByLabel(/contraseña|password/i).fill('password123');

    // El campo debe marcar error de validación HTML5
    const emailInput = page.getByLabel(/email/i);
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

    expect(isInvalid).toBe(true);
  });

  test('debe rechazar campos vacíos', async ({ page }) => {
    // Intentar submit sin llenar
    const submitButton = page.getByRole('button', { name: /iniciar sesión|entrar|login/i });
    await submitButton.click();

    // Debe permanecer en login
    await expect(page).toHaveURL(/\/login/);

    // Los campos deben estar marcados como requeridos
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/contraseña|password/i);

    const emailInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    const passwordInvalid = await passwordInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );

    expect(emailInvalid || passwordInvalid).toBe(true);
  });
});

test.describe('Session Management', () => {
  test('usuario autenticado debe poder hacer logout', async ({ page }) => {
    // Login primero
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('ana.garcia@clousadmin.com');
    await page.getByLabel(/contraseña|password/i).fill('Empleado123!');
    await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();

    // Esperar a que cargue el dashboard
    await expect(page).toHaveURL(/\/(dashboard|empleado)/, { timeout: 10000 });

    // Buscar y hacer click en logout
    // Puede estar en un menú desplegable
    const userMenu = page.getByRole('button', { name: /perfil|usuario|cuenta/i });
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }

    await page.getByRole('button', { name: /cerrar sesi[oó]n|logout|salir/i }).click();

    // Debe redireccionar a login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('rutas protegidas deben redireccionar a login', async ({ page }) => {
    // Intentar acceder a ruta protegida sin login
    await page.goto('/dashboard');

    // Debe redireccionar a login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('sesión debe persistir al recargar página', async ({ page, context: _context }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('ana.garcia@clousadmin.com');
    await page.getByLabel(/contraseña|password/i).fill('Empleado123!');
    await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();

    await expect(page).toHaveURL(/\/(dashboard|empleado)/, { timeout: 10000 });

    // Recargar página
    await page.reload();

    // Debe seguir autenticado
    await expect(page).toHaveURL(/\/(dashboard|empleado)/);
    await expect(page.getByText(/Ana García/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Password Recovery', () => {
  test('debe mostrar enlace de recuperación de contraseña', async ({ page }) => {
    await page.goto('/login');

    const recoveryLink = page.getByRole('link', {
      name: /olvidaste|recuperar|restablecer contraseña/i,
    });

    await expect(recoveryLink).toBeVisible();
  });

  test.skip('debe enviar email de recuperación', async ({ page }) => {
    // Este test requiere mock de email o configuración real
    await page.goto('/login');
    await page.getByRole('link', { name: /olvidaste.*contraseña/i }).click();

    await expect(page).toHaveURL(/\/recovery|\/forgot-password/);

    await page.getByLabel(/email/i).fill('ana.garcia@clousadmin.com');
    await page.getByRole('button', { name: /enviar|recuperar/i }).click();

    await expect(
      page.getByText(/email enviado|revisa tu correo/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
