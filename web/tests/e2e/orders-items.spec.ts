import { test, expect } from '@playwright/test';

const rand = () => Math.random().toString(36).slice(2, 8);

// Flujo: crear cliente -> crear pedido -> abrir detalle -> agregar/eliminar ítem -> verificar total

test.describe('Pedidos - Ítems en detalle', () => {
  test('agregar y eliminar ítem recalcula el total', async ({ page }) => {
    const suffix = rand();
    const cliente = `e2e-order-${suffix}`;

    // Crear cliente
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
    await expect(page).toHaveURL(/\/clients\/.+$/);

    // Crear pedido
    await page.goto('/orders');
    await page.getByRole('link', { name: /agregar pedido/i }).click();
    await expect(page).toHaveURL(/\/orders\/new$/);
    await page.getByPlaceholder('Nombre exacto o UUID').fill(cliente);
    await page.getByPlaceholder('0.00').fill('10.00');
    await page.getByRole('button', { name: /guardar/i }).click();
    await expect(page).toHaveURL(/\/orders(\?.*)?$/);

    // Abrir detalle del pedido (filtrar por cliente y ver primero)
    await page.locator('input[name="client"]').fill(cliente);
    await page.getByRole('button', { name: /aplicar/i }).click();
    const firstView = page.getByRole('link', { name: /ver pedido/i }).first();
    await firstView.click();
    await expect(page).toHaveURL(/\/orders\/\d+$/);

    // Agregar ítem
    await page.getByPlaceholder('Ej. Producto').fill('Demo Item');
    await page.getByPlaceholder('0.00').fill('5.50');
    await page.getByPlaceholder('1').fill('2');
    await page.getByRole('button', { name: /agregar ítem/i }).click();

    // Verificar línea y total
    await expect(page.getByRole('cell').filter({ hasText: 'Demo Item' })).toBeVisible();
    await expect(page.getByRole('cell').filter({ hasText: '11.00' })).toBeVisible();

    // Eliminar ítem
    await page.getByRole('button', { name: /eliminar/i }).first().click();

    // Total vuelve a 0.00 (o 10.00 si el total inicial del pedido se mostraba; aquí lo fijamos al sumar líneas)
    await expect(page.getByText(/Total\s*\$?\s*0\.00/)).toBeVisible();
  });
});
