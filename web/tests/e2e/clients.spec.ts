import { test, expect } from '@playwright/test';

const rand = () => Math.random().toString(36).slice(2, 8);

test.describe('Clientes - Crear y Editar', () => {
  test('crear cliente y luego editarlo', async ({ page }) => {
    const suffix = rand();
    const nombre = `e2e-cliente-${suffix}`;
    const contacto = `e2e-${suffix}@test.local`;

    // Listado de clientes
    await page.goto('/clients');

    // Ir a Agregar cliente
    await page.getByRole('link', { name: /agregar cliente/i }).click();
    await expect(page).toHaveURL(/\/clients\/new$/);

    // Completar formulario de alta (usar placeholders y name attrs)
    await page.getByPlaceholder('Ej. Juan Pérez').fill(nombre);
    await page.getByPlaceholder('Ej. juan@correo.com').fill(contacto);
    await page.getByPlaceholder('Ej. +5491122334455').fill('+5491122334455');
    await page.getByPlaceholder('Calle 123, Barrio').fill('Calle Falsa 123');
    await page.locator('input[name="city"]').fill('Buenos Aires');
    await page.locator('input[name="route"]').fill('Zona Norte');

    // Guardar
    await page.getByRole('button', { name: /guardar/i }).click();

    // Debería redirigir al detalle del cliente
    await expect(page).toHaveURL(/\/clients\/.+$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(nombre);

    // Ir a editar
    await page.getByRole('link', { name: /editar/i }).click();
    await expect(page).toHaveURL(/\/clients\/.+\/edit$/);

    // Editar contacto (por name)
    const nuevoContacto = `mod-${contacto}`;
    await page.locator('input[name="contacto"]').fill(nuevoContacto);
    await page.getByRole('button', { name: /guardar cambios/i }).click();

    // Volvió a detalle con el cambio
    await expect(page).toHaveURL(/\/clients\/.+$/);
    await expect(page.getByText(nuevoContacto)).toBeVisible();

    // Verificar aparece en el listado con su nombre
    await page.goto('/clients');
    await page.locator('input[name="q"]').fill(nombre);
    await page.getByRole('button', { name: /aplicar/i }).click();
    await expect(page.getByRole('cell').filter({ hasText: nombre })).toBeVisible();
  });
});
