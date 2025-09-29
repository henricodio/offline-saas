/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silencia el warning de múltiples lockfiles indicando la raíz del workspace
  turbopack: {
    root: __dirname,
  },
  // Permite orígenes alternativos en dev para evitar el warning de cross origin
  allowedDevOrigins: [
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'http://127.0.0.1:56676',
    'http://127.0.0.1:54450',
  ],
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    return [
      // En desarrollo, permite CORS para recursos de Next para que el preview del IDE (proxy) funcione
      ...(isDev
        ? [
            {
              source: '/_next/:path*',
              headers: [
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Credentials', value: 'true' },
              ],
            },
          ]
        : []),
      {
        source: '/(.*)',
        headers: [
          // Solo bloquear iframes en producción; en dev permitir para el preview embebido
          ...(!isDev
            ? [{ key: 'X-Frame-Options', value: 'DENY' }]
            : []),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // En dev, abrir CORS y permitir embebido via frame-ancestors
          ...(isDev
            ? [
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Headers', value: '*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
                { key: 'Content-Security-Policy', value: "frame-ancestors 'self' http://127.0.0.1:* http://localhost:*" },
              ]
            : []),
        ],
      },
    ];
  },
};

module.exports = nextConfig;
