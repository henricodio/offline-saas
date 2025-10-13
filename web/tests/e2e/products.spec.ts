import { test, expect } from '@playwright/test';

const rand = () => Math.random().toString(36).slice(2, 8);

test.describe('Productos - Crear y listar', () => {
  test('crear producto y verificar en listado', async ({ page }) => {
    const suffix = rand();
    const name = `e2e-producto-${suffix}`;
    const sku = `SKU-${suffix.toUpperCase()}`;

    // Ir a listado de productos
    await page.goto('/products');

    // Ir a Agregar producto
    await page.getByRole('link', { name: /agregar producto/i }).click();
    await expect(page).toHaveURL(/\/products\/new$/);

    // Completar formulario
    await page.getByPlaceholder('Ej. Botella de agua').fill(name);
    await page.getByPlaceholder('Ej. SKU-001').fill(sku);
    await page.getByPlaceholder('Ej. Bebidas').fill('Bebidas');
    await page.getByPlaceholder('0.00').fill('19.99');
    await page.locator('input[name="stock"]').fill('7');

    // Guardar
    await page.getByRole('button', { name: /guardar/i }).click();

    // Debe volver al listado
    await expect(page).toHaveURL(/\/products(\?.*)?$/);

    // Buscar por nombre
    await page.locator('input[name="q"]').fill(name);
    await page.getByRole('button', { name: /buscar/i }).click();

    // Verificar que aparece
    await expect(page.getByRole('cell').filter({ hasText: name })).toBeVisible();
  });
});
