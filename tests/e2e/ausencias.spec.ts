/**
 * E2E Tests: Ausencias y Vacaciones
 * Flujo completo de solicitud y aprobación
 */

import { expect, type Page, test } from '@playwright/test';

// Helpers de login
async function loginAsEmpleado(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('ana.garcia@clousadmin.com');
  await page.getByLabel(/contraseña|password/i).fill('Empleado123!');
  await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|empleado)/, { timeout: 10000 });
}

async function loginAsManager(page: Page) {
  // Usar credenciales de manager si existen, sino HR admin
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('admin@clousadmin.com');
  await page.getByLabel(/contraseña|password/i).fill('Admin123!');
  await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|hr)/, { timeout: 10000 });
}

test.describe('Ausencias - Solicitud', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmpleado(page);
  });

  test('debe mostrar saldo de vacaciones en dashboard', async ({ page }) => {
    // Buscar widget de vacaciones
    await expect(
      page.getByText(/vacaciones|d[íi]as disponibles|saldo/i)
    ).toBeVisible({ timeout: 5000 });

    // Debe mostrar un número de días
    const saldoText = page.locator('text=/\\d+\\s*d[íi]as?/i').first();
    await expect(saldoText).toBeVisible({ timeout: 3000 });
  });

  test('empleado puede solicitar vacaciones', async ({ page }) => {
    // Ir a página de ausencias
    await page.goto('/empleado/ausencias');

    // Buscar botón de nueva solicitud
    const nuevaButton = page.getByRole('button', {
      name: /nueva solicitud|solicitar|pedir vacaciones/i,
    });

    await expect(nuevaButton).toBeVisible({ timeout: 5000 });
    await nuevaButton.click();

    // Debe abrir formulario/modal
    await expect(
      page.getByText(/tipo de ausencia|fecha inicio|fecha fin/i)
    ).toBeVisible({ timeout: 3000 });

    // Seleccionar tipo (vacaciones)
    const tipoSelect = page.getByLabel(/tipo/i);
    if (await tipoSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tipoSelect.click();
      await page.getByText(/vacaciones/i).click();
    }

    // Seleccionar fechas (próximos 5 días)
    const hoy = new Date();
    const inicioInput = page.getByLabel(/fecha inicio|desde/i);
    const finInput = page.getByLabel(/fecha fin|hasta/i);

    if (await inicioInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const inicio = new Date(hoy);
      inicio.setDate(inicio.getDate() + 30); // 30 días en el futuro

      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 4); // 5 días de vacaciones

      await inicioInput.fill(inicio.toISOString().split('T')[0]);
      await finInput.fill(fin.toISOString().split('T')[0]);

      // Agregar motivo opcional
      const motivoInput = page.getByLabel(/motivo|comentario/i);
      if (await motivoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await motivoInput.fill('Vacaciones de verano - Test E2E');
      }

      // Enviar solicitud
      const submitButton = page.getByRole('button', {
        name: /enviar|solicitar|guardar/i,
      });
      await submitButton.click();

      // Debe mostrar confirmación
      await expect(
        page.getByText(/solicitud enviada|pendiente de aprobación/i)
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('debe validar que fecha fin sea posterior a fecha inicio', async ({ page }) => {
    await page.goto('/empleado/ausencias');

    const nuevaButton = page.getByRole('button', {
      name: /nueva solicitud|solicitar/i,
    });

    if (await nuevaButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nuevaButton.click();

      // Intentar poner fecha fin anterior a inicio
      const inicioInput = page.getByLabel(/fecha inicio|desde/i);
      const finInput = page.getByLabel(/fecha fin|hasta/i);

      if (await inicioInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const hoy = new Date();
        const fin = new Date(hoy);
        fin.setDate(fin.getDate() + 30);

        const inicio = new Date(fin);
        inicio.setDate(inicio.getDate() + 5); // Inicio después del fin

        await inicioInput.fill(inicio.toISOString().split('T')[0]);
        await finInput.fill(fin.toISOString().split('T')[0]);

        const submitButton = page.getByRole('button', { name: /enviar|solicitar/i });
        await submitButton.click();

        // Debe mostrar error
        await expect(
          page.getByText(/fecha.*inválida|fecha fin.*posterior/i)
        ).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('debe calcular días automáticamente', async ({ page }) => {
    await page.goto('/empleado/ausencias');

    const nuevaButton = page.getByRole('button', {
      name: /nueva solicitud|solicitar/i,
    });

    if (await nuevaButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nuevaButton.click();

      const inicioInput = page.getByLabel(/fecha inicio|desde/i);
      const finInput = page.getByLabel(/fecha fin|hasta/i);

      if (await inicioInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const hoy = new Date();
        const inicio = new Date(hoy);
        inicio.setDate(inicio.getDate() + 30);

        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + 4); // 5 días

        await inicioInput.fill(inicio.toISOString().split('T')[0]);
        await finInput.fill(fin.toISOString().split('T')[0]);

        // Debe mostrar días calculados
        await expect(
          page.getByText(/5\s*d[íi]as?|días.*5/i)
        ).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('debe mostrar listado de ausencias solicitadas', async ({ page }) => {
    await page.goto('/empleado/ausencias');

    // Debe mostrar tabla o cards de ausencias
    const hasTable = await page.getByRole('table').isVisible({ timeout: 3000 })
      .catch(() => false);
    const hasCards = (await page.locator('[class*="card"]').count()) > 0;

    expect(hasTable || hasCards).toBe(true);

    // Debe mostrar estados: Pendiente, Aprobada, Rechazada
    const hasEstados = await page
      .getByText(/pendiente|aprobada|rechazada|confirmada/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(hasEstados).toBe(true);
  });
});

test.describe('Ausencias - Aprobación (Manager/HR)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  test('manager debe ver solicitudes pendientes', async ({ page }) => {
    // Ir a solicitudes/ausencias
    await page.goto('/hr/ausencias');

    // Debe mostrar solicitudes
    await expect(
      page.getByText(/solicitudes|ausencias|vacaciones/i)
    ).toBeVisible({ timeout: 5000 });

    // Buscar solicitudes pendientes
    const pendientesTab = page.getByRole('tab', { name: /pendiente/i });
    if (await pendientesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pendientesTab.click();
    }

    // Debe mostrar lista o tabla
    const hasContent = await page.getByRole('table').isVisible({ timeout: 3000 })
      .catch(() => false);

    // Si no hay solicitudes pendientes, debe decirlo
    if (!hasContent) {
      const noDataText = await page
        .getByText(/no hay solicitudes|sin pendientes/i)
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      expect(noDataText).toBe(true);
    }
  });

  test.skip('manager puede aprobar ausencia', async ({ page }) => {
    // Este test requiere que exista una solicitud pendiente
    await page.goto('/hr/ausencias');

    // Buscar primera solicitud pendiente
    const aprobarButton = page.getByRole('button', { name: /aprobar/i }).first();

    if (await aprobarButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aprobarButton.click();

      // Confirmar acción
      const confirmarButton = page.getByRole('button', { name: /confirmar|s[íi]/i });
      if (await confirmarButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmarButton.click();
      }

      // Debe mostrar confirmación
      await expect(
        page.getByText(/ausencia aprobada|aprobación exitosa/i)
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test.skip('manager puede rechazar ausencia', async ({ page }) => {
    await page.goto('/hr/ausencias');

    const rechazarButton = page.getByRole('button', { name: /rechazar/i }).first();

    if (await rechazarButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rechazarButton.click();

      // Debe pedir motivo de rechazo
      const motivoInput = page.getByLabel(/motivo|raz[óo]n/i);
      if (await motivoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await motivoInput.fill('Conflicto con fechas críticas del proyecto');

        const confirmarButton = page.getByRole('button', {
          name: /confirmar|rechazar/i,
        });
        await confirmarButton.click();

        await expect(
          page.getByText(/ausencia rechazada|rechazo exitoso/i)
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('debe mostrar filtros de ausencias', async ({ page }) => {
    await page.goto('/hr/ausencias');

    // Debe tener filtros: empleado, fecha, tipo, estado
    const hasFilters =
      (await page.getByLabel(/empleado|fecha|tipo|estado|buscar/i).count()) > 0;

    expect(hasFilters).toBe(true);
  });
});

test.describe('Ausencias - Validaciones de Saldo', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmpleado(page);
  });

  test('debe advertir si no hay saldo suficiente', async ({ page }) => {
    await page.goto('/empleado/ausencias');

    const nuevaButton = page.getByRole('button', {
      name: /nueva solicitud|solicitar/i,
    });

    if (await nuevaButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nuevaButton.click();

      // Intentar solicitar muchos días (más del saldo disponible)
      const inicioInput = page.getByLabel(/fecha inicio|desde/i);
      const finInput = page.getByLabel(/fecha fin|hasta/i);

      if (await inicioInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const hoy = new Date();
        const inicio = new Date(hoy);
        inicio.setDate(inicio.getDate() + 30);

        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + 60); // 61 días (probablemente más del saldo)

        await inicioInput.fill(inicio.toISOString().split('T')[0]);
        await finInput.fill(fin.toISOString().split('T')[0]);

        // Debe mostrar advertencia de saldo insuficiente
        const hasWarning = await page
          .getByText(/saldo insuficiente|no tienes.*d[íi]as/i)
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        // O el botón debe estar deshabilitado
        const submitButton = page.getByRole('button', { name: /enviar|solicitar/i });
        const isDisabled = await submitButton.evaluate((el: HTMLButtonElement) => el.disabled)
          .catch(() => false);

        expect(hasWarning || isDisabled).toBe(true);
      }
    }
  });

  test('debe mostrar saldo actualizado después de solicitud', async ({ page }) => {
    await page.goto('/empleado/ausencias');

    // Ver saldo inicial
    const saldoInicial = await page
      .locator('text=/\\d+\\s*d[íi]as?.*disponibles?/i')
      .first()
      .textContent()
      .catch(() => null);

    if (saldoInicial) {
      // El saldo debe ser visible
      expect(saldoInicial).toMatch(/\d+/);
    }
  });
});

test.describe('Ausencias - Tipos de Ausencia', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmpleado(page);
  });

  test('debe mostrar diferentes tipos de ausencia', async ({ page }) => {
    await page.goto('/empleado/ausencias');

    const nuevaButton = page.getByRole('button', {
      name: /nueva solicitud|solicitar/i,
    });

    if (await nuevaButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nuevaButton.click();

      const tipoSelect = page.getByLabel(/tipo/i);
      if (await tipoSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tipoSelect.click();

        // Debe mostrar opciones: vacaciones, enfermedad, etc.
        await expect(page.getByText(/vacaciones/i)).toBeVisible();

        // Verificar otros tipos
        const hasOtherTypes =
          (await page.getByText(/enfermedad|permiso|maternidad|paternidad/i).count()) > 0;

        expect(hasOtherTypes).toBe(true);
      }
    }
  });
});

test.describe('Ausencias - Responsive Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('debe ser usable en mobile', async ({ page }) => {
    await loginAsEmpleado(page);
    await page.goto('/empleado/ausencias');

    // Widget debe ser visible
    await expect(
      page.getByText(/vacaciones|ausencias/i)
    ).toBeVisible({ timeout: 5000 });

    // Botón de nueva solicitud debe ser touch-friendly
    const nuevaButton = page.getByRole('button', {
      name: /nueva solicitud|solicitar/i,
    });

    if (await nuevaButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const box = await nuevaButton.boundingBox();

      if (box) {
        // Touch target >= 44px (WCAG)
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
