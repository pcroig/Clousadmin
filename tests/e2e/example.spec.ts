import { test, expect } from '@playwright/test';

/**
 * Test E2E de ejemplo
 * 
 * Para ejecutar:
 * 1. Instalar: npm install -D @playwright/test
 * 2. Instalar navegadores: npx playwright install
 * 3. Ejecutar: npx playwright test
 */

test.describe('Homepage', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que la página carga
    await expect(page).toHaveTitle(/ClousAdmin/i);
  });

  test('should have login button', async ({ page }) => {
    await page.goto('/');
    
    // Buscar botón de login
    const loginButton = page.getByRole('link', { name: /iniciar sesión|login/i });
    await expect(loginButton).toBeVisible();
  });
});

test.describe.skip('Login Flow', () => {
  test('empleado can login', async ({ page }) => {
    await page.goto('/login');
    
    // Llenar formulario
    await page.getByLabel(/email/i).fill('empleado@test.com');
    await page.getByLabel(/password|contraseña/i).fill('password123');
    await page.getByRole('button', { name: /entrar|login/i }).click();
    
    // Verificar redirección a dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

/**
 * NOTA: Los tests con .skip requieren:
 * - Servidor corriendo en localhost:3000
 * - Base de datos con datos de prueba
 * - Eliminar .skip para ejecutarlos
 */
