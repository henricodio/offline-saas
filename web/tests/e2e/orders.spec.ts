import { test, expect } from '@playwright/test';

const rand = () => Math.random().toString(36).slice(2, 8);

test.describe('Pedidos - Crear y listar', () => {
  test('crear cliente e2e y crear pedido asociado, luego verificar en listado filtrando por cliente', async ({ page }) => {
    const suffix = rand();
    const cliente = `e2e-order-${suffix}`;

    // Crear cliente via UI
    await page.goto('/clients');
    await page.getByRole('link', { name: /agregar cliente/i }).click();
    await expect(page).toHaveURL(/\/clients\/new$/);

    await page.getByPlaceholder('Ej. Juan Pérez').fill(cliente);
    await page.getByPlaceholder('Ej. juan@correo.com').fill(`e2e-${suffix}@test.local`);
    await page.getByPlaceholder('Ej. +5491122334455').fill('+5491122334455');
    await page.getByPlaceholder('Calle 123, Barrio').fill('Calle Falsa 123');
    await page.locator('input[name="city"]').fill('Buenos Aires');
    await page.locator('input[name="route"]').fill('Zona Centro');
    await page.getByRole('button', { name: /guardar/i }).click();

    // En detalle de cliente
    await expect(page).toHaveURL(/\/clients\/.+$/);

    // Crear pedido
    await page.goto('/orders');
    await page.getByRole('link', { name: /agregar pedido/i }).click();
    await expect(page).toHaveURL(/\/orders\/new$/);

    await page.getByPlaceholder('Nombre exacto o UUID').fill(cliente);
    // fecha por defecto es hoy, completamos total y estado
    await page.getByPlaceholder('0.00').fill('49.99');
    await page.locator('select[name="estado"]').selectOption('completado');
    await page.getByRole('button', { name: /guardar/i }).click();

    // Volvió al listado de pedidos
    await expect(page).toHaveURL(/\/orders(\?.*)?$/);

    // Filtrar por cliente
    await page.locator('input[name="client"]').fill(cliente);
    await page.getByRole('button', { name: /aplicar/i }).click();

    // Verificar hay al menos una fila
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();

    // Verificar que aparece un total 49.99 (formateo a 2 decimales)
    await expect(page.getByRole('cell').filter({ hasText: '49.99' })).toBeVisible();
  });
});
