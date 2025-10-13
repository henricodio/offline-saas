import { test, expect } from '@playwright/test';

test.describe('Mapa - Planificador de rutas (con mocks)', () => {
  test('planificar ruta muestra resumen y limpiar lo oculta', async ({ page }) => {
    // Mock Nominatim: dos llamadas (origen y destino)
    let nominatimCalls = 0;
    await page.route('**/nominatim.openstreetmap.org/**', async (route) => {
      nominatimCalls++;
      const body = [
        nominatimCalls === 1
          ? { lat: '40.4168', lon: '-3.7038', display_name: 'Madrid - Origen' }
          : { lat: '40.4154', lon: '-3.7074', display_name: 'Madrid - Destino' },
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    // Mock OSRM route
    await page.route('**/router.project-osrm.org/route/v1/driving/**', async (route) => {
      const body = {
        routes: [
          {
            distance: 5200, // 5.20 km
            duration: 720, // 12 min
            geometry: {
              type: 'LineString',
              coordinates: [
                [-3.7038, 40.4168],
                [-3.7074, 40.4154],
              ],
            },
          },
        ],
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.goto('/mapa');

    // Completar origen/destino
    await page.getByLabel(/^Origen$/i).fill('Gran Vía, Madrid');
    await page.getByLabel(/^Destino$/i).fill('Plaza Mayor, Madrid');

    // Planificar
    await page.getByRole('button', { name: /planificar/i }).click();

    // Verificar resumen visible
    await expect(page.getByText(/Distancia:/i)).toBeVisible();
    await expect(page.getByText(/Tiempo:/i)).toBeVisible();

    // Limpiar
    await page.getByRole('button', { name: /limpiar/i }).click();

    // Resumen oculto
    await expect(page.getByText(/Distancia:/i)).toHaveCount(0);
  });
});
